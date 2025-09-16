const { pool } = require('../config/database');

const createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { customerId, amount, orderDate, status = 'completed' } = req.body;

    // Validate required fields
    if (!customerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID and amount are required'
      });
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Check if customer exists
    const customerExists = await client.query(
      'SELECT id FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Create order
    const newOrder = await client.query(
      `INSERT INTO orders (customer_id, amount, order_date, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customerId, parseFloat(amount), orderDate || new Date(), status]
    );

    // Update customer stats
    await client.query(
      `UPDATE customers 
       SET total_spend = total_spend + $1,
           visit_count = visit_count + 1,
           last_visit = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [parseFloat(amount), new Date(), customerId]
    );

    await client.query('COMMIT');

    console.log('✅ Order created:', newOrder.rows[0].id);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: newOrder.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  } finally {
    client.release();
  }
};

const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      customerId,
      status,
      startDate,
      endDate,
      sortBy = 'order_date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT o.*, c.name as customer_name, c.email as customer_email
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

    // Add sorting
    const validSortFields = ['amount', 'order_date', 'status', 'customer_name'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order_date';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortField === 'customer_name' ? 'c.name' : 'o.' + sortField} ${sortDirection}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [orders, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, paramIndex - 2))
    ]);

    res.json({
      success: true,
      orders: orders.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order: order.rows[0]
    });

  } catch (error) {
    console.error('❌ Get order by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

const bulkCreateOrders = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required and cannot be empty'
      });
    }

    if (orders.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 orders allowed per bulk upload'
      });
    }

    const validOrders = [];
    const errors = [];

    // Validate each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      if (!order.customerId || !order.amount) {
        errors.push(`Row ${i + 1}: Customer ID and amount are required`);
        continue;
      }

      if (parseFloat(order.amount) <= 0) {
        errors.push(`Row ${i + 1}: Amount must be greater than 0`);
        continue;
      }

      // Check if customer exists
      const customerExists = await client.query(
        'SELECT id FROM customers WHERE id = $1',
        [order.customerId]
      );

      if (customerExists.rows.length === 0) {
        errors.push(`Row ${i + 1}: Customer not found`);
        continue;
      }

      validOrders.push(order);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors found',
        details: errors.slice(0, 10) // Limit error details
      });
    }

    // Create orders in batches
    const createdOrders = [];
    for (const order of validOrders) {
      const newOrder = await client.query(
        `INSERT INTO orders (customer_id, amount, order_date, status)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          order.customerId,
          parseFloat(order.amount),
          order.orderDate || new Date(),
          order.status || 'completed'
        ]
      );

      // Update customer stats
      await client.query(
        `UPDATE customers 
         SET total_spend = total_spend + $1,
             visit_count = visit_count + 1,
             last_visit = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [parseFloat(order.amount), new Date(), order.customerId]
      );

      createdOrders.push(newOrder.rows[0]);
    }

    await client.query('COMMIT');

    console.log(`📦 Bulk orders created: ${createdOrders.length} orders`);
    res.status(201).json({
      success: true,
      message: 'Bulk orders created successfully',
      count: createdOrders.length,
      orders: createdOrders
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Bulk create orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk order creation'
    });
  } finally {
    client.release();
  }
};

const getOrderStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_order_value,
        COUNT(CASE WHEN order_date >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30d,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `);

    const monthlyStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', order_date) as month,
        COUNT(*) as orders_count,
        SUM(amount) as revenue
      FROM orders
      WHERE order_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', order_date)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      monthlyStats: monthlyStats.rows
    });

  } catch (error) {
    console.error('❌ Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  bulkCreateOrders,
  getOrderStats
};
