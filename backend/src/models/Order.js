const { pool } = require('../config/database');

class Order {
  constructor(data) {
    this.id = data.id;
    this.customerId = data.customer_id;
    this.amount = parseFloat(data.amount);
    this.orderDate = data.order_date;
    this.status = data.status;
    this.createdAt = data.created_at;
    
    // Include customer data if provided
    if (data.customer_name) {
      this.customer = {
        name: data.customer_name,
        email: data.customer_email,
        phone: data.customer_phone
      };
    }
  }

  static async create(orderData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { customerId, amount, orderDate = new Date(), status = 'completed' } = orderData;

      // Check if customer exists
      const customerExists = await client.query(
        'SELECT id FROM customers WHERE id = $1',
        [customerId]
      );

      if (customerExists.rows.length === 0) {
        throw new Error('Customer not found');
      }

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, amount, order_date, status)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [customerId, amount, orderDate, status]
      );

      // Update customer stats
      await client.query(
        `UPDATE customers 
         SET total_spend = total_spend + $1,
             visit_count = visit_count + 1,
             last_visit = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [amount, new Date(), customerId]
      );

      await client.query('COMMIT');
      return new Order(orderResult.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create order: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Order(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find order: ${error.message}`);
    }
  }

  static async findAll(options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        customerId,
        status,
        startDate,
        endDate,
        sortBy = 'order_date',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
      `;
      let countQuery = 'SELECT COUNT(*) FROM orders o';
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (customerId) {
        conditions.push(`o.customer_id = $${paramIndex}`);
        params.push(customerId);
        paramIndex++;
      }

      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`o.order_date >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`o.order_date <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Sorting
      const validSortFields = ['amount', 'order_date', 'status'];
      const field = validSortFields.includes(sortBy) ? sortBy : 'order_date';
      const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      query += ` ORDER BY o.${field} ${order}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const [orders, total] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      return {
        orders: orders.rows.map(row => new Order(row)),
        total: parseInt(total.rows[0].count),
        hasMore: offset + limit < parseInt(total.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to find orders: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(amount) as total_revenue,
          AVG(amount) as avg_order_value,
          COUNT(CASE WHEN order_date >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30d,
          COUNT(CASE WHEN order_date >= NOW() - INTERVAL '7 days' THEN 1 END) as orders_last_7d,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
        FROM orders
      `);

      const stats = result.rows[0];
      
      return {
        totalOrders: parseInt(stats.total_orders),
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        avgOrderValue: parseFloat(stats.avg_order_value) || 0,
        ordersLast30d: parseInt(stats.orders_last_30d),
        ordersLast7d: parseInt(stats.orders_last_7d),
        completedOrders: parseInt(stats.completed_orders),
        pendingOrders: parseInt(stats.pending_orders),
        cancelledOrders: parseInt(stats.cancelled_orders)
      };
    } catch (error) {
      throw new Error(`Failed to get order stats: ${error.message}`);
    }
  }

  static async getMonthlyStats(months = 12) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('month', order_date) as month,
          COUNT(*) as orders_count,
          SUM(amount) as revenue,
          AVG(amount) as avg_order_value
        FROM orders
        WHERE order_date >= NOW() - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', order_date)
        ORDER BY month DESC
      `);

      return result.rows.map(row => ({
        month: row.month,
        ordersCount: parseInt(row.orders_count),
        revenue: parseFloat(row.revenue),
        avgOrderValue: parseFloat(row.avg_order_value)
      }));
    } catch (error) {
      throw new Error(`Failed to get monthly order stats: ${error.message}`);
    }
  }

  async updateStatus(newStatus) {
    try {
      const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
      
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [newStatus, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      this.status = newStatus;
      return this;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      amount: this.amount,
      orderDate: this.orderDate,
      status: this.status,
      createdAt: this.createdAt,
      customer: this.customer
    };
  }
}

module.exports = Order;
