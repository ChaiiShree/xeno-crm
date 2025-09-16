const { pool } = require('../config/database');

class Customer {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.totalSpend = parseFloat(data.total_spend) || 0;
    this.visitCount = parseInt(data.visit_count) || 0;
    this.lastVisit = data.last_visit;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(customerData) {
    try {
      const { name, email, phone, totalSpend = 0, visitCount = 0 } = customerData;
      
      const result = await pool.query(
        `INSERT INTO customers (name, email, phone, total_spend, visit_count, last_visit)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, email, phone, totalSpend, visitCount, new Date()]
      );

      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find customer: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Customer(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find customer by email: ${error.message}`);
    }
  }

  static async findAll(options = {}) {
    try {
      const { 
        limit = 10, 
        offset = 0, 
        search = '', 
        sortBy = 'created_at', 
        sortOrder = 'DESC',
        filters = {}
      } = options;

      let query = 'SELECT * FROM customers';
      let countQuery = 'SELECT COUNT(*) FROM customers';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      // Search functionality
      if (search) {
        conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filters
      if (filters.minSpend !== undefined) {
        conditions.push(`total_spend >= $${paramIndex}`);
        params.push(filters.minSpend);
        paramIndex++;
      }

      if (filters.maxSpend !== undefined) {
        conditions.push(`total_spend <= $${paramIndex}`);
        params.push(filters.maxSpend);
        paramIndex++;
      }

      if (filters.minVisits !== undefined) {
        conditions.push(`visit_count >= $${paramIndex}`);
        params.push(filters.minVisits);
        paramIndex++;
      }

      if (filters.lastVisitAfter !== undefined) {
        conditions.push(`last_visit >= $${paramIndex}`);
        params.push(filters.lastVisitAfter);
        paramIndex++;
      }

      if (filters.lastVisitBefore !== undefined) {
        conditions.push(`last_visit <= $${paramIndex}`);
        params.push(filters.lastVisitBefore);
        paramIndex++;
      }

      // Apply conditions
      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Sorting
      const validSortFields = ['name', 'email', 'total_spend', 'visit_count', 'last_visit', 'created_at'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY ${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [customers, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        customers: customers.rows.map(row => new Customer(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find customers: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ['name', 'phone', 'total_spend', 'visit_count'];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const query = `
        UPDATE customers 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      // Update current instance
      Object.assign(this, new Customer(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async delete() {
    try {
      const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_customers,
          SUM(total_spend) as total_revenue,
          AVG(total_spend) as avg_spend_per_customer,
          AVG(visit_count) as avg_visits_per_customer,
          COUNT(CASE WHEN last_visit >= NOW() - INTERVAL '30 days' THEN 1 END) as active_customers_30d,
          COUNT(CASE WHEN last_visit >= NOW() - INTERVAL '7 days' THEN 1 END) as active_customers_7d,
          COUNT(CASE WHEN total_spend > 0 THEN 1 END) as paying_customers
        FROM customers
      `);

      const stats = result.rows[0];
      
      // Convert strings to numbers
      return {
        totalCustomers: parseInt(stats.total_customers),
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        avgSpendPerCustomer: parseFloat(stats.avg_spend_per_customer) || 0,
        avgVisitsPerCustomer: parseFloat(stats.avg_visits_per_customer) || 0,
        activeCustomers30d: parseInt(stats.active_customers_30d),
        activeCustomers7d: parseInt(stats.active_customers_7d),
        payingCustomers: parseInt(stats.paying_customers)
      };
    } catch (error) {
      throw new Error(`Failed to get customer stats: ${error.message}`);
    }
  }

  async getOrders() {
    try {
      const result = await pool.query(
        'SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_date DESC',
        [this.id]
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get customer orders: ${error.message}`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      totalSpend: this.totalSpend,
      visitCount: this.visitCount,
      lastVisit: this.lastVisit,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Customer;
