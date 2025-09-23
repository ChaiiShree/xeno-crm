const { pool } = require('../config/database');
const { publishMessage } = require('../config/redis');
const aiService = require('../services/aiService');
const { sendCampaign } = require('../services/vendorAPI');

// Create Campaign
const createCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { segmentId, name, message, useAI, campaignObjective } = req.body;
    const userId = req.user.id;

    if (!segmentId || !name || (!message && !useAI)) {
      return res.status(400).json({
        success: false,
        error: 'Segment ID, name, and either message or AI generation are required'
      });
    }

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

    if (useAI && campaignObjective) {
      try {
        console.log('🤖 Generating AI campaign message for objective:', campaignObjective);
        const aiResult = await aiService.generateCampaignMessage(campaignObjective, segment.rows[0]);
        finalMessage = aiResult.message || message;
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
      error: 'Failed to create campaign',
      details: error.message
    });
  } finally {
    client.release();
  }
};


// Launch Campaign
const launchCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const userId = req.user.id;

    const campaignData = await client.query(
      `SELECT c.*, s.rulesjson, s.audience_size
       FROM campaigns c JOIN segments s ON c.segment_id = s.id
       WHERE c.id = $1 AND c.created_by = $2 AND c.status = 'draft'`, [id, userId]
    );
    if (campaignData.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or already launched'
      });
    }
    const campaign = campaignData.rows[0];
    const evaluateRules = require('../utils/ruleEngine');
    const targetCustomers = await evaluateRules(
      typeof campaign.rulesjson === 'string' ? JSON.parse(campaign.rulesjson) : campaign.rulesjson,
      null,
      true
    );
    if (targetCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No customers match the segment criteria'
      });
    }

    await client.query(
      `UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['active', id]
    );
    for (const customer of targetCustomers) {
      await client.query(
        `INSERT INTO communication_log (campaign_id, customer_id, status)
         VALUES ($1, $2, 'pending')`,
        [id, customer.id]
      );
    }
    await client.query('COMMIT');
    await publishMessage('campaign_delivery', {
      campaignId: id,
      message: campaign.message,
      customers: targetCustomers,
      timestamp: new Date().toISOString()
    });
    console.log(`Campaign launched: ${campaign.name} to ${targetCustomers.length} customers`);
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
      error: 'Failed to launch campaign',
      details: error.message
    });
  } finally {
    client.release();
  }
};


// Get Campaigns List
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
      SELECT 
        c.*, 
        s.name as segment_name, 
        s.audience_size,
        COALESCE(c.sent_count, 0) as "sentCount", 
        COALESCE(c.failed_count, 0) as "failedCount",
        u.name as created_by_name
      FROM campaigns c
      JOIN segments s ON c.segment_id = s.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.created_by = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM campaigns c WHERE c.created_by = $1';
    const queryParams = [userId];
    const countParams = [userId];
    let paramIndex = 2;

    if (search) {
      const searchTerm = `%${search}%`;
      query += ` AND (c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`;
      countQuery += ` AND EXISTS (
        SELECT 1 FROM segments s WHERE s.id = c.segment_id 
        AND (c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})
      )`;
      queryParams.push(searchTerm);
      countParams.push(searchTerm);
      paramIndex++;
    }

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      countQuery += ` AND c.status = $${paramIndex}`;
      queryParams.push(status);
      countParams.push(status);
      paramIndex++;
    }

    const validSortFields = ['name', 'status', 'sent_count', 'failed_count', 'created_at', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];

    const sortField = validSortFields.includes(sortBy) ? `c.${sortBy}` : 'c.created_at';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);

    const [campaignsResult, totalResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(totalResult.rows[0].count);

    res.json({
      success: true,
      campaigns: campaignsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: (offset + limit) < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      details: error.message
    });
  }
};


// Get Campaign By ID
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await pool.query(
      `SELECT c.*, s.name as segment_name, s.audience_size, s.rulesjson, u.name as created_by_name, u.email as created_by_email
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1 AND c.created_by = $2`,
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const deliveryStats = await pool.query(
      `SELECT status, COUNT(*) as count FROM communication_log WHERE campaign_id = $1 GROUP BY status`,
      [id]
    );

    const recentLogs = await pool.query(
      `SELECT cl.*, cust.name as customer_name, cust.email as customer_email
       FROM communication_log cl
       JOIN customers cust ON cl.customer_id = cust.id
       WHERE cl.campaign_id = $1
       ORDER BY cl.created_at DESC
       LIMIT 20`,
      [id]
    );

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
      error: 'Failed to fetch campaign',
      details: error.message
    });
  }
};


// Generate AI Messages
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

    const messages = await aiService.generateCampaignMessage(campaignObjective, segment.rows[0]);

    res.json({
      success: true,
      messages,
      objective: campaignObjective
    });
  } catch (error) {
    console.error('❌ Generate AI messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI messages',
      details: error.message
    });
  }
};


// Get Campaign Insights
const getCampaignInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await pool.query(
      `SELECT c.*, s.name as segment_name, s.audience_size
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       WHERE c.id = $1 AND c.created_by = $2`,
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const deliveryStats = await pool.query(
      `SELECT status, COUNT(*) as count, AVG(CASE WHEN sent_at IS NOT NULL THEN EXTRACT(EPOCH FROM sent_at - created_at) END) as avg_delivery_time_seconds
       FROM communication_log WHERE campaign_id = $1 GROUP BY status`,
      [id]
    );

    const insights = await aiService.generateCampaignInsights(campaign.rows[0], deliveryStats.rows);

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
      error: 'Failed to generate campaign insights',
      details: error.message
    });
  }
};


// Update Delivery Status
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

      const updateResult = await client.query(
        `UPDATE communication_log SET status = $1, sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END, failed_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = $3 AND customer_id = $4`,
        [status, failedReason, campaignId, customerId]
      );

      if (updateResult.rowCount === 0) throw new Error('Communication log entry not found');

      if (status === 'sent') {
        await client.query(
          `UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = $1`,
          [campaignId]
        );
      } else if (status === 'failed') {
        await client.query(
          `UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1`,
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
      error: 'Failed to update delivery status',
      details: error.message
    });
  }
};


// Get Campaign Stats
const getCampaignStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const statsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_campaigns,
        COALESCE(SUM(sent_count), 0) as total_messages_sent,
        COALESCE(SUM(failed_count), 0) as total_messages_failed,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as campaigns_last_7d
      FROM campaigns WHERE created_by = $1`,
      [userId]
    );
    const recentCampaignsQuery = await pool.query(
      `SELECT c.name, c.status, c.sent_count, c.failed_count, c.created_at, s.name as segment_name
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       WHERE c.created_by = $1
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({
      success: true,
      stats: statsQuery.rows[0],
      recentCampaigns: recentCampaignsQuery.rows
    });
  } catch (error) {
    console.error('❌ Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign statistics',
      details: error.message
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
