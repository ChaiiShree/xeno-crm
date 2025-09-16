const { pool } = require('../config/database');

class CommunicationLog {
  constructor(data) {
    this.id = data.id;
    this.campaignId = data.campaign_id;
    this.customerId = data.customer_id;
    this.status = data.status;
    this.sentAt = data.sent_at;
    this.failedReason = data.failed_reason;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Include related data if provided
    if (data.customer_name) {
      this.customer = {
        name: data.customer_name,
        email: data.customer_email,
        phone: data.customer_phone
      };
    }

    if (data.campaign_name) {
      this.campaign = {
        name: data.campaign_name,
        message: data.campaign_message
      };
    }
  }

  static async create(logData) {
    try {
      const { campaignId, customerId, status = 'pending' } = logData;

      const result = await pool.query(
        `INSERT INTO communication_log (campaign_id, customer_id, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [campaignId, customerId, status]
      );

      return new CommunicationLog(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create communication log: ${error.message}`);
    }
  }

  static async createBulk(logDataArray) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const logs = [];
      for (const logData of logDataArray) {
        const { campaignId, customerId, status = 'pending' } = logData;
        
        const result = await client.query(
          `INSERT INTO communication_log (campaign_id, customer_id, status)
           VALUES ($1, $2, $3) RETURNING *`,
          [campaignId, customerId, status]
        );
        
        logs.push(new CommunicationLog(result.rows[0]));
      }

      await client.query('COMMIT');
      return logs;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create bulk communication logs: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT cl.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               cam.name as campaign_name, cam.message as campaign_message
        FROM communication_log cl
        JOIN customers c ON cl.customer_id = c.id
        JOIN campaigns cam ON cl.campaign_id = cam.id
        WHERE cl.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new CommunicationLog(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find communication log: ${error.message}`);
    }
  }

  static async findByCampaign(campaignId, options = {}) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT cl.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone
        FROM communication_log cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.campaign_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) FROM communication_log WHERE campaign_id = $1';
      
      const params = [campaignId];
      let paramIndex = 2;

      if (status) {
        query += ` AND cl.status = $${paramIndex}`;
        countQuery += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Sorting
      const validSortFields = ['status', 'sent_at', 'created_at', 'updated_at'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY cl.${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [logs, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        logs: logs.rows.map(row => new CommunicationLog(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find communication logs by campaign: ${error.message}`);
    }
  }

  static async findByCustomer(customerId, options = {}) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT cl.*, 
               cam.name as campaign_name, cam.message as campaign_message
        FROM communication_log cl
        JOIN campaigns cam ON cl.campaign_id = cam.id
        WHERE cl.customer_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) FROM communication_log WHERE customer_id = $1';
      
      const params = [customerId];
      let paramIndex = 2;

      if (status) {
        query += ` AND cl.status = $${paramIndex}`;
        countQuery += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Sorting
      const validSortFields = ['status', 'sent_at', 'created_at', 'updated_at'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY cl.${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [logs, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        logs: logs.rows.map(row => new CommunicationLog(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find communication logs by customer: ${error.message}`);
    }
  }

  async updateStatus(newStatus, failedReason = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const validStatuses = ['pending', 'sent', 'failed', 'delivered'];
      
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid communication status');
      }

      // Update communication log
      const result = await client.query(
        `UPDATE communication_log 
         SET status = $1, 
             sent_at = CASE WHEN $1 = 'sent' OR $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE sent_at END,
             failed_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [newStatus, failedReason, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Communication log not found');
      }

      // Update campaign counters
      if (newStatus === 'sent' && this.status === 'pending') {
        await client.query(
          'UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = $1',
          [this.campaignId]
        );
      } else if (newStatus === 'failed' && this.status === 'pending') {
        await client.query(
          'UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1',
          [this.campaignId]
        );
      }

      await client.query('COMMIT');

      // Update current instance
      Object.assign(this, new CommunicationLog(result.rows[0]));
      return this;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update communication status: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async updateBatchStatus(campaignId, customerId, newStatus, failedReason = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE communication_log 
         SET status = $1, 
             sent_at = CASE WHEN $1 = 'sent' OR $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE sent_at END,
             failed_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE campaign_id = $3 AND customer_id = $4 AND status = 'pending'
         RETURNING *`,
        [newStatus, failedReason, campaignId, customerId]
      );

      if (result.rows.length === 0) {
        throw new Error('Communication log not found or already processed');
      }

      // Update campaign counters
      if (newStatus === 'sent') {
        await client.query(
          'UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = $1',
          [campaignId]
        );
      } else if (newStatus === 'failed') {
        await client.query(
          'UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1',
          [campaignId]
        );
      }

      await client.query('COMMIT');
      return new CommunicationLog(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update batch communication status: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async getDeliveryStats(campaignId = null, timeRange = null) {
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(CASE WHEN sent_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sent_at - created_at))
          END) as avg_delivery_time_seconds
        FROM communication_log
      `;
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (campaignId) {
        conditions.push(`campaign_id = $${paramIndex}`);
        params.push(campaignId);
        paramIndex++;
      }

      if (timeRange) {
        conditions.push(`created_at >= NOW() - INTERVAL '${timeRange}'`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' GROUP BY status';

      const result = await pool.query(query, params);
      
      const stats = {};
      result.rows.forEach(row => {
        stats[row.status] = {
          count: parseInt(row.count),
          avgDeliveryTime: parseFloat(row.avg_delivery_time_seconds) || null
        };
      });

      const totalMessages = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);

      return {
        pending: stats.pending?.count || 0,
        sent: stats.sent?.count || 0,
        failed: stats.failed?.count || 0,
        delivered: stats.delivered?.count || 0,
        totalMessages,
        successRate: totalMessages > 0 ? ((stats.sent?.count || 0) / totalMessages * 100).toFixed(2) : 0,
        avgDeliveryTime: stats.sent?.avgDeliveryTime || null
      };
    } catch (error) {
      throw new Error(`Failed to get delivery stats: ${error.message}`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      campaignId: this.campaignId,
      customerId: this.customerId,
      status: this.status,
      sentAt: this.sentAt,
      failedReason: this.failedReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      customer: this.customer,
      campaign: this.campaign
    };
  }
}

module.exports = CommunicationLog;
