const { pool } = require('../config/database');

class Campaign {
  constructor(data) {
    this.id = data.id;
    this.segmentId = data.segment_id;
    this.name = data.name;
    this.message = data.message;
    this.status = data.status;
    this.createdBy = data.created_by;
    this.sentCount = parseInt(data.sent_count) || 0;
    this.failedCount = parseInt(data.failed_count) || 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Include related data if provided
    if (data.segment_name) {
      this.segment = {
        name: data.segment_name,
        audienceSize: parseInt(data.audience_size) || 0,
        rules: typeof data.rules_json === 'string' 
          ? JSON.parse(data.rules_json) 
          : data.rules_json
      };
    }

    if (data.created_by_name) {
      this.creator = {
        name: data.created_by_name,
        email: data.created_by_email
      };
    }
  }

  static async create(campaignData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { segmentId, name, message, createdBy, status = 'draft' } = campaignData;

      // Check if segment exists and belongs to user
      const segment = await client.query(
        'SELECT * FROM segments WHERE id = $1 AND created_by = $2',
        [segmentId, createdBy]
      );

      if (segment.rows.length === 0) {
        throw new Error('Segment not found or access denied');
      }

      const result = await client.query(
        `INSERT INTO campaigns (segment_id, name, message, created_by, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [segmentId, name, message, createdBy, status]
      );

      await client.query('COMMIT');
      return new Campaign(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create campaign: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async findById(id, userId = null) {
    try {
      let query = `
        SELECT c.*, s.name as segment_name, s.audience_size, s.rules_json,
               u.name as created_by_name, u.email as created_by_email
        FROM campaigns c
        JOIN segments s ON c.segment_id = s.id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = $1
      `;
      const params = [id];

      if (userId) {
        query += ' AND c.created_by = $2';
        params.push(userId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return new Campaign(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find campaign: ${error.message}`);
    }
  }

  static async findAll(options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        search = '',
        status,
        userId = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT c.*, s.name as segment_name, s.audience_size,
               u.name as created_by_name
        FROM campaigns c
        JOIN segments s ON c.segment_id = s.id
        LEFT JOIN users u ON c.created_by = u.id
      `;
      let countQuery = 'SELECT COUNT(*) FROM campaigns c';
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (userId) {
        conditions.push(`c.created_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (search) {
        conditions.push(`(c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`c.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Sorting
      const validSortFields = ['name', 'status', 'sent_count', 'failed_count', 'created_at', 'updated_at'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY c.${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [campaigns, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        campaigns: campaigns.rows.map(row => new Campaign(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find campaigns: ${error.message}`);
    }
  }

  async updateStatus(newStatus) {
    try {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
      
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid campaign status');
      }

      const result = await pool.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newStatus, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      this.status = newStatus;
      this.updatedAt = result.rows[0].updated_at;
      return this;
    } catch (error) {
      throw new Error(`Failed to update campaign status: ${error.message}`);
    }
  }

  async updateCounters(sentCount = null, failedCount = null) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (sentCount !== null) {
        fields.push(`sent_count = $${paramIndex}`);
        values.push(sentCount);
        paramIndex++;
      }

      if (failedCount !== null) {
        fields.push(`failed_count = $${paramIndex}`);
        values.push(failedCount);
        paramIndex++;
      }

      if (fields.length === 0) {
        return this;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const query = `
        UPDATE campaigns 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      Object.assign(this, new Campaign(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to update campaign counters: ${error.message}`);
    }
  }

  async getDeliveryStats() {
    try {
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(CASE WHEN sent_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sent_at - created_at))
          END) as avg_delivery_time_seconds
        FROM communication_log
        WHERE campaign_id = $1
        GROUP BY status
      `, [this.id]);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.status] = {
          count: parseInt(row.count),
          avgDeliveryTime: parseFloat(row.avg_delivery_time_seconds) || null
        };
      });

      return {
        pending: stats.pending?.count || 0,
        sent: stats.sent?.count || 0,
        failed: stats.failed?.count || 0,
        delivered: stats.delivered?.count || 0,
        avgDeliveryTime: stats.sent?.avgDeliveryTime || null
      };
    } catch (error) {
      throw new Error(`Failed to get delivery stats: ${error.message}`);
    }
  }

  async getCommunicationLogs(limit = 20) {
    try {
      const result = await pool.query(`
        SELECT cl.*, c.name as customer_name, c.email as customer_email
        FROM communication_log cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.campaign_id = $1
        ORDER BY cl.created_at DESC
        LIMIT $2
      `, [this.id, limit]);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get communication logs: ${error.message}`);
    }
  }

  async delete() {
    try {
      // Can only delete draft campaigns
      if (this.status !== 'draft') {
        throw new Error('Can only delete draft campaigns');
      }

      const result = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING *', [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  static async getStats(userId = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_campaigns,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_campaigns,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_campaigns,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_campaigns,
          SUM(sent_count) as total_messages_sent,
          SUM(failed_count) as total_messages_failed,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as campaigns_last_7d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as campaigns_last_30d
        FROM campaigns
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE created_by = $1';
        params.push(userId);
      }

      const result = await pool.query(query, params);
      const stats = result.rows[0];

      const totalSent = parseInt(stats.total_messages_sent) || 0;
      const totalFailed = parseInt(stats.total_messages_failed) || 0;
      const totalMessages = totalSent + totalFailed;

      return {
        totalCampaigns: parseInt(stats.total_campaigns),
        activeCampaigns: parseInt(stats.active_campaigns),
        completedCampaigns: parseInt(stats.completed_campaigns),
        draftCampaigns: parseInt(stats.draft_campaigns),
        pausedCampaigns: parseInt(stats.paused_campaigns),
        cancelledCampaigns: parseInt(stats.cancelled_campaigns),
        totalMessagesSent: totalSent,
        totalMessagesFailed: totalFailed,
        successRate: totalMessages > 0 ? (totalSent / totalMessages * 100).toFixed(2) : 0,
        campaignsLast7d: parseInt(stats.campaigns_last_7d),
        campaignsLast30d: parseInt(stats.campaigns_last_30d)
      };
    } catch (error) {
      throw new Error(`Failed to get campaign stats: ${error.message}`);
    }
  }

  static async getRecentCampaigns(userId = null, limit = 10) {
    try {
      let query = `
        SELECT c.name, c.status, c.sent_count, c.failed_count, c.created_at,
               s.name as segment_name, s.audience_size
        FROM campaigns c
        JOIN segments s ON c.segment_id = s.id
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE c.created_by = $1';
        params.push(userId);
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        name: row.name,
        status: row.status,
        sentCount: parseInt(row.sent_count),
        failedCount: parseInt(row.failed_count),
        createdAt: row.created_at,
        segment: {
          name: row.segment_name,
          audienceSize: parseInt(row.audience_size)
        }
      }));
    } catch (error) {
      throw new Error(`Failed to get recent campaigns: ${error.message}`);
    }
  }

  getSuccessRate() {
    const total = this.sentCount + this.failedCount;
    return total > 0 ? ((this.sentCount / total) * 100).toFixed(2) : 0;
  }

  toJSON() {
    return {
      id: this.id,
      segmentId: this.segmentId,
      name: this.name,
      message: this.message,
      status: this.status,
      createdBy: this.createdBy,
      sentCount: this.sentCount,
      failedCount: this.failedCount,
      successRate: this.getSuccessRate(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      segment: this.segment,
      creator: this.creator
    };
  }
}

module.exports = Campaign;
