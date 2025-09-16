const { pool } = require('../config/database');
const { evaluateRules } = require('../utils/ruleEngine');

class Segment {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.rulesJson = typeof data.rules_json === 'string' 
      ? JSON.parse(data.rules_json) 
      : data.rules_json;
    this.createdBy = data.created_by;
    this.audienceSize = parseInt(data.audience_size) || 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Include creator data if provided
    if (data.created_by_name) {
      this.creator = {
        name: data.created_by_name,
        email: data.created_by_email
      };
    }
  }

  static async create(segmentData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { name, description, rules, createdBy } = segmentData;

      // Validate rules structure
      if (!rules || !rules.conditions || !Array.isArray(rules.conditions)) {
        throw new Error('Invalid rules structure');
      }

      // Calculate audience size
      const audienceSize = await evaluateRules(rules);

      const result = await client.query(
        `INSERT INTO segments (name, description, rules_json, created_by, audience_size)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description, JSON.stringify(rules), createdBy, audienceSize]
      );

      await client.query('COMMIT');
      return new Segment(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create segment: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async findById(id, userId = null) {
    try {
      let query = `
        SELECT s.*, u.name as created_by_name, u.email as created_by_email
        FROM segments s
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.id = $1
      `;
      const params = [id];

      if (userId) {
        query += ' AND s.created_by = $2';
        params.push(userId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return new Segment(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find segment: ${error.message}`);
    }
  }

  static async findAll(options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        search = '',
        userId = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT s.*, u.name as created_by_name, u.email as created_by_email
        FROM segments s
        LEFT JOIN users u ON s.created_by = u.id
      `;
      let countQuery = 'SELECT COUNT(*) FROM segments s';
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (userId) {
        conditions.push(`s.created_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (search) {
        conditions.push(`(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Sorting
      const validSortFields = ['name', 'audience_size', 'created_at', 'updated_at'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY s.${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [segments, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        segments: segments.rows.map(row => new Segment(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find segments: ${error.message}`);
    }
  }

  async update(updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ['name', 'description', 'rules_json'];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'rules_json') {
            // Recalculate audience size if rules changed
            const audienceSize = await evaluateRules(value);
            fields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
            paramIndex++;
            
            fields.push(`audience_size = $${paramIndex}`);
            values.push(audienceSize);
            paramIndex++;
          } else {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const query = `
        UPDATE segments 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Segment not found');
      }

      await client.query('COMMIT');

      // Update current instance
      Object.assign(this, new Segment(result.rows[0]));
      return this;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update segment: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async delete() {
    try {
      const result = await pool.query('DELETE FROM segments WHERE id = $1 RETURNING *', [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Segment not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete segment: ${error.message}`);
    }
  }

  async getCustomers(limit = null, includeDetails = false) {
    try {
      return await evaluateRules(this.rulesJson, limit, includeDetails);
    } catch (error) {
      throw new Error(`Failed to get segment customers: ${error.message}`);
    }
  }

  async refreshAudienceSize() {
    try {
      const newAudienceSize = await evaluateRules(this.rulesJson);
      
      await pool.query(
        'UPDATE segments SET audience_size = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newAudienceSize, this.id]
      );

      this.audienceSize = newAudienceSize;
      return newAudienceSize;
    } catch (error) {
      throw new Error(`Failed to refresh audience size: ${error.message}`);
    }
  }

  static async getStats(userId = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_segments,
          AVG(audience_size) as avg_audience_size,
          SUM(audience_size) as total_audience_reach,
          MAX(audience_size) as largest_segment,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as segments_last_7d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as segments_last_30d
        FROM segments
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE created_by = $1';
        params.push(userId);
      }

      const result = await pool.query(query, params);
      const stats = result.rows[0];

      return {
        totalSegments: parseInt(stats.total_segments),
        avgAudienceSize: parseFloat(stats.avg_audience_size) || 0,
        totalAudienceReach: parseInt(stats.total_audience_reach) || 0,
        largestSegment: parseInt(stats.largest_segment) || 0,
        segmentsLast7d: parseInt(stats.segments_last_7d),
        segmentsLast30d: parseInt(stats.segments_last_30d)
      };
    } catch (error) {
      throw new Error(`Failed to get segment stats: ${error.message}`);
    }
  }

  static async getTopSegments(userId = null, limit = 5) {
    try {
      let query = `
        SELECT name, audience_size, created_at, description
        FROM segments
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE created_by = $1';
        params.push(userId);
      }

      query += ` ORDER BY audience_size DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        name: row.name,
        audienceSize: parseInt(row.audience_size),
        createdAt: row.created_at,
        description: row.description
      }));
    } catch (error) {
      throw new Error(`Failed to get top segments: ${error.message}`);
    }
  }

  validateRules() {
    try {
      if (!this.rulesJson || typeof this.rulesJson !== 'object') {
        return { valid: false, error: 'Rules must be an object' };
      }

      if (!this.rulesJson.conditions || !Array.isArray(this.rulesJson.conditions)) {
        return { valid: false, error: 'Rules must have a conditions array' };
      }

      if (this.rulesJson.conditions.length === 0) {
        return { valid: false, error: 'Rules must have at least one condition' };
      }

      // Validate each condition
      for (let i = 0; i < this.rulesJson.conditions.length; i++) {
        const condition = this.rulesJson.conditions[i];
        
        if (!condition.field || !condition.operator || condition.value === undefined) {
          return { 
            valid: false, 
            error: `Condition ${i + 1}: field, operator, and value are required` 
          };
        }

        const validFields = ['total_spend', 'visit_count', 'last_visit'];
        if (!validFields.includes(condition.field)) {
          return { 
            valid: false, 
            error: `Condition ${i + 1}: invalid field '${condition.field}'` 
          };
        }

        const validOperators = ['>', '<', '>=', '<=', '=', '!=', 'LIKE', 'NOT LIKE'];
        if (!validOperators.includes(condition.operator)) {
          return { 
            valid: false, 
            error: `Condition ${i + 1}: invalid operator '${condition.operator}'` 
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Rule validation error: ${error.message}` };
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      rules: this.rulesJson,
      createdBy: this.createdBy,
      audienceSize: this.audienceSize,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creator: this.creator
    };
  }
}

module.exports = Segment;
