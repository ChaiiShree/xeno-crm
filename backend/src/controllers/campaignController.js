const { pool } = require('../config/database');
const { publishMessage } = require('../config/redis');
const { generateCampaignMessage, generateCampaignInsights } = require('../services/aiService');
const { sendCampaign } = require('../services/vendorAPI');

const createCampaign = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { segmentId, name, message, useAI, campaignObjective } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!segmentId || !name || (!message && !useAI)) {
      return res.status(400).json({
        success: false,
        error: 'Segment ID, name, and either message or AI generation are required'
      });
    }

    // Check if segment exists and belongs to user
    const segment = await client.query(
      'SELECT * FROM segments WHERE id = $1 AND created_by = $2',
      [segmentId, userId]
    );

    if (segment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    let finalMessage = message;

    // Generate AI message if requested
    if (useAI && campaignObjective) {
      try {
        console.log('🤖 Generating AI campaign message for objective:', campaignObjective);
        const aiMessages = await generateCampaignMessage(campaignObjective, segment.rows[0]);
        finalMessage = aiMessages[0] || message; // Use first generated message or fallback
        console.log('✅ AI generated message:', finalMessage);
      } catch (aiError) {
        console.error('❌ AI message generation failed:', aiError);
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Failed to generate AI message and no fallback message provided'
          });
        }
      }
    }

    // Create campaign
    const newCampaign = await client.query(
      `INSERT INTO campaigns (segment_id, name, message, created_by, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
      [segmentId, name, finalMessage, userId]
    );

    await client.query('COMMIT');

    console.log('✅ Campaign created:', name);
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: newCampaign.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  } finally {
    client.release();
  }
};

const launchCampaign = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const userId = req.user.id;

    // Get campaign with segment data
    const campaignData = await client.query(`
      SELECT c.*, s.rules_json, s.audience_size
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      WHERE c.id = $1 AND c.created_by = $2 AND c.status = 'draft'
    `, [id, userId]);

    if (campaignData.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or already launched'
      });
    }

    const campaign = campaignData.rows[0];

    // Get target customers based on segment rules
    const { evaluateRules } = require('../utils/ruleEngine');
    const targetCustomers = await evaluateRules(
      typeof campaign.rules_json === 'string' 
        ? JSON.parse(campaign.rules_json) 
        : campaign.rules_json,
      null,
      true // Return customer details
    );

    if (targetCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No customers match the segment criteria'
      });
    }

    // Update campaign status
    await client.query(
      'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['active', id]
    );

    // Create communication log entries
    for (const customer of targetCustomers) {
      await client.query(
        `INSERT INTO communication_log (campaign_id, customer_id, status)
         VALUES ($1, $2, 'pending')`,
        [id, customer.id]
      );
    }

    await client.query('COMMIT');

    // Publish to Redis for async campaign delivery
    await publishMessage('campaign_delivery', {
      campaignId: id,
      message: campaign.message,
      customers: targetCustomers,
      timestamp: new Date().toISOString()
    });

    console.log(`🚀 Campaign launched: ${campaign.name} to ${targetCustomers.length} customers`);
    res.json({
      success: true,
      message: 'Campaign launched successfully',
      targetCount: targetCustomers.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Launch campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to launch campaign'
    });
  } finally {
    client.release();
  }
};

const getCampaigns = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    let query = `
      SELECT c.*, s.name as segment_name, s.audience_size,
             u.name as created_by_name
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.created_by = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM campaigns c WHERE c.created_by = $1';
    const params = [userId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`;
      countQuery += ` AND EXISTS (
        SELECT 1 FROM segments s WHERE s.id = c.segment_id 
        AND (c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      countQuery += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Add sorting
    const validSortFields = ['name', 'status', 'sent_count', 'failed_count', 'created_at', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY c.${sortField} ${sortDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [campaigns, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, paramIndex - 2))
    ]);

    res.json({
      success: true,
      campaigns: campaigns.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await pool.query(`
      SELECT c.*, s.name as segment_name, s.audience_size, s.rules_json,
             u.name as created_by_name, u.email as created_by_email
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1 AND c.created_by = $2
    `, [id, userId]);

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get delivery statistics
    const deliveryStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM communication_log
      WHERE campaign_id = $1
      GROUP BY status
    `, [id]);

    // Get recent delivery logs
    const recentLogs = await pool.query(`
      SELECT cl.*, c.name as customer_name, c.email as customer_email
      FROM communication_log cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE cl.campaign_id = $1
      ORDER BY cl.created_at DESC
      LIMIT 20
    `, [id]);

    const campaignData = {
      ...campaign.rows[0],
      deliveryStats: deliveryStats.rows,
      recentLogs: recentLogs.rows
    };

    res.json({
      success: true,
      campaign: campaignData
    });

  } catch (error) {
    console.error('❌ Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
};

const generateAIMessages = async (req, res) => {
  try {
    const { campaignObjective, segmentId } = req.body;
    const userId = req.user.id;

    if (!campaignObjective || !segmentId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign objective and segment ID are required'
      });
    }

    // Get segment data
    const segment = await pool.query(
      'SELECT * FROM segments WHERE id = $1 AND created_by = $2',
      [segmentId, userId]
    );

    if (segment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const messages = await generateCampaignMessage(campaignObjective, segment.rows[0]);

    res.json({
      success: true,
      messages,
      objective: campaignObjective
    });

  } catch (error) {
    console.error('❌ Generate AI messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI messages'
    });
  }
};

const getCampaignInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get campaign data
    const campaign = await pool.query(`
      SELECT c.*, s.name as segment_name, s.audience_size
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      WHERE c.id = $1 AND c.created_by = $2
    `, [id, userId]);

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get detailed delivery stats
    const deliveryStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(CASE WHEN sent_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (sent_at - created_at))
        END) as avg_delivery_time_seconds
      FROM communication_log
      WHERE campaign_id = $1
      GROUP BY status
    `, [id]);

    // Generate AI insights
    const insights = await generateCampaignInsights(campaign.rows[0], deliveryStats.rows);

    res.json({
      success: true,
      insights,
      campaign: campaign.rows[0],
      deliveryStats: deliveryStats.rows
    });

  } catch (error) {
    console.error('❌ Get campaign insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate campaign insights'
    });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { campaignId, customerId, status, failedReason } = req.body;

    if (!campaignId || !customerId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID, customer ID, and status are required'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update communication log
      const updateResult = await client.query(
        `UPDATE communication_log 
         SET status = $1, 
             sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
             failed_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE campaign_id = $3 AND customer_id = $4`,
        [status, failedReason, campaignId, customerId]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Communication log entry not found');
      }

      // Update campaign counters
      if (status === 'sent') {
        await client.query(
          'UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = $1',
          [campaignId]
        );
      } else if (status === 'failed') {
        await client.query(
          'UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1',
          [campaignId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Delivery status updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Update delivery status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery status'
    });
  }
};

const getCampaignStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_campaigns,
        SUM(sent_count) as total_messages_sent,
        SUM(failed_count) as total_messages_failed,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as campaigns_last_7d
      FROM campaigns
      WHERE created_by = $1
    `, [userId]);

    const recentCampaigns = await pool.query(`
      SELECT c.name, c.status, c.sent_count, c.failed_count, c.created_at,
             s.name as segment_name
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      WHERE c.created_by = $1
      ORDER BY c.created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      success: true,
      stats: stats.rows[0],
      recentCampaigns: recentCampaigns.rows
    });

  } catch (error) {
    console.error('❌ Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign statistics'
    });
  }
};

module.exports = {
  createCampaign,
  launchCampaign,
  getCampaigns,
  getCampaignById,
  generateAIMessages,
  getCampaignInsights,
  updateDeliveryStatus,
  getCampaignStats
};
