const { pool } = require('../config/database');
const { publishMessage } = require('../config/redis');

const createCustomer = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { name, email, phone, totalSpend = 0, visitCount = 0 } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Name and email are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Check if customer already exists
    const existingCustomer = await client.query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Customer with this email already exists' 
      });
    }

    // Publish to Redis for async processing
    const customerData = {
      name,
      email,
      phone,
      totalSpend: parseFloat(totalSpend) || 0,
      visitCount: parseInt(visitCount) || 0,
      timestamp: new Date().toISOString()
    };

    await publishMessage('customer_ingestion', customerData);

    // Create customer in database
    const newCustomer = await client.query(
      `INSERT INTO customers (name, email, phone, total_spend, visit_count, last_visit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, phone, customerData.totalSpend, customerData.visitCount, new Date()]
    );

    await client.query('COMMIT');

    console.log('✅ Customer created:', email);
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: newCustomer.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create customer error:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ 
        success: false,
        error: 'Customer with this email already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to create customer' 
      });
    }
  } finally {
    client.release();
  }
};

const getCustomers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) FROM customers';
    const params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR email ILIKE $1';
      countQuery += ' WHERE name ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }

    // Add sorting
    const validSortFields = ['name', 'email', 'total_spend', 'visit_count', 'last_visit', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const [customers, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    res.json({
      success: true,
      customers: customers.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get customers error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch customers' 
    });
  }
};

const bulkCreateCustomers = async (req, res) => {
  try {
    const { customers } = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Customers array is required and cannot be empty' 
      });
    }

    if (customers.length > 1000) {
      return res.status(400).json({ 
        success: false,
        error: 'Maximum 1000 customers allowed per bulk upload' 
      });
    }

    // Validate each customer
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validCustomers = [];
    const errors = [];

    customers.forEach((customer, index) => {
      if (!customer.name || !customer.email) {
        errors.push(`Row ${index + 1}: Name and email are required`);
      } else if (!emailRegex.test(customer.email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
      } else {
        validCustomers.push({
          ...customer,
          totalSpend: parseFloat(customer.totalSpend) || 0,
          visitCount: parseInt(customer.visitCount) || 0
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors found',
        details: errors
      });
    }

    // Publish to Redis for async processing
    await publishMessage('bulk_customer_ingestion', {
      customers: validCustomers,
      timestamp: new Date().toISOString()
    });

    console.log(`📦 Bulk customer upload initiated: ${validCustomers.length} customers`);
    res.status(202).json({ 
      success: true,
      message: 'Bulk customer creation initiated',
      count: validCustomers.length,
      status: 'processing'
    });

  } catch (error) {
    console.error('❌ Bulk create customers error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process bulk customer creation' 
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, totalSpend, visitCount } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const updatedCustomer = await pool.query(
      `UPDATE customers 
       SET name = $1, phone = $2, total_spend = $3, visit_count = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, phone, parseFloat(totalSpend) || 0, parseInt(visitCount) || 0, id]
    );

    if (updatedCustomer.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer: updatedCustomer.rows[0]
    });

  } catch (error) {
    console.error('❌ Update customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCustomer = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    );

    if (deletedCustomer.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
};

const getCustomerStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(total_spend) as total_revenue,
        AVG(total_spend) as avg_spend_per_customer,
        AVG(visit_count) as avg_visits_per_customer,
        COUNT(CASE WHEN last_visit >= NOW() - INTERVAL '30 days' THEN 1 END) as active_customers_30d
      FROM customers
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('❌ Get customer stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer statistics'
    });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  bulkCreateCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
};
