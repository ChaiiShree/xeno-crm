const { pool } = require('../config/database');
const { evaluateRules } = require('../utils/ruleEngine');
const { generateSegmentFromNLP } = require('../services/aiService');

const createSegment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { name, description, rules, nlpQuery } = req.body;
    const userId = req.user.id;

    if (!name || (!rules && !nlpQuery)) {
      return res.status(400).json({
        success: false,
        error: 'Name and either rules or natural language query are required'
      });
    }

    let finalRules = rules;

    // In segmentController.js - around line where AI generates rules
if (nlpQuery && !rules) {
    try {
        console.log('🤖 Converting NLP query to rules:', nlpQuery);
        finalRules = await generateSegmentFromNLP(nlpQuery);
        console.log('✅ AI generated rules:', JSON.stringify(finalRules, null, 2));
        
        // ADD THIS VALIDATION CHECK
        if (!finalRules.operator) {
            finalRules.operator = 'AND'; // Default operator
        }
        if (!finalRules.conditions || !Array.isArray(finalRules.conditions)) {
            finalRules.conditions = [];
        }
        
    } catch (aiError) {
        console.error('❌ AI conversion failed:', aiError);
        return res.status(400).json({
            success: false,
            error: 'Failed to convert natural language query to rules'
        });
    }
}


    if (!finalRules || !finalRules.conditions || !Array.isArray(finalRules.conditions)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rules structure'
      });
    }

    const audienceSize = await evaluateRules(finalRules);

    const newSegment = await client.query(
      `INSERT INTO segments (name, description, rules_json, created_by, audience_size)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, JSON.stringify(finalRules), userId, audienceSize]
    );

    await client.query('COMMIT');

    console.log('✅ Segment created:', name, 'Audience size:', audienceSize);
    res.status(201).json({
      success: true,
      message: 'Segment created successfully',
      segment: {
        ...newSegment.rows[0],
        rules_json: finalRules,
        nlp_query: nlpQuery || null
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create segment error:', error);
    // FIX: Send a more detailed error message back to the frontend for debugging.
    res.status(500).json({
      success: false,
      error: 'Failed to create segment due to an internal error.',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// ... (The rest of your file remains exactly the same)
// ... (getSegments, getSegmentById, previewAudience, etc.)

const getSegments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    let query = `
      SELECT s.*, u.name as created_by_name, u.email as created_by_email
      FROM segments s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.created_by = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM segments WHERE created_by = $1';
    const params = [userId];

    if (search) {
      query += ' AND (s.name ILIKE $2 OR s.description ILIKE $2)';
      countQuery += ' AND (name ILIKE $2 OR description ILIKE $2)';
      params.push(`%${search}%`);
    }

    const validSortFields = ['name', 'audience_size', 'created_at', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY s.${sortField} ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const [segments, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, search ? [userId, `%${search}%`] : [userId])
    ]);

    const segmentsWithParsedRules = segments.rows.map(segment => ({
      ...segment,
      rules_json: typeof segment.rules_json === 'string' 
        ? JSON.parse(segment.rules_json) 
        : segment.rules_json
    }));

    res.json({
      success: true,
      segments: segmentsWithParsedRules,
      pagination: {
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch segments'
    });
  }
};

const getSegmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const segment = await pool.query(
      `SELECT s.*, u.name as created_by_name, u.email as created_by_email
       FROM segments s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1 AND s.created_by = $2`,
      [id, userId]
    );

    if (segment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const segmentData = {
      ...segment.rows[0],
      rules_json: typeof segment.rows[0].rules_json === 'string' 
        ? JSON.parse(segment.rows[0].rules_json) 
        : segment.rows[0].rules_json
    };

    res.json({
      success: true,
      segment: segmentData
    });

  } catch (error) {
    console.error('❌ Get segment by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch segment'
    });
  }
};

const previewAudience = async (req, res) => {
  try {
    const { rules, nlpQuery } = req.body;

    if (!rules && !nlpQuery) {
      return res.status(400).json({
        success: false,
        error: 'Either rules or natural language query is required'
      });
    }

    let finalRules = rules;

    if (nlpQuery && !rules) {
      try {
        finalRules = await generateSegmentFromNLP(nlpQuery);
      } catch (aiError) {
        console.error('❌ AI conversion failed:', aiError);
        return res.status(400).json({
          success: false,
          error: 'Failed to convert natural language query to rules'
        });
      }
    }

    const audienceSize = await evaluateRules(finalRules);
    const sampleCustomers = await evaluateRules(finalRules, 10, true);

    res.json({
      success: true,
      audienceSize,
      sampleCustomers,
      rules: finalRules
    });

  } catch (error) {
    console.error('❌ Preview audience error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview audience'
    });
  }
};

const updateSegment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, description, rules } = req.body;
    const userId = req.user.id;

    const existingSegment = await client.query(
      'SELECT id FROM segments WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (existingSegment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    let audienceSize = null;
    if (rules) {
      if (!rules.conditions || !Array.isArray(rules.conditions)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rules structure'
        });
      }
      audienceSize = await evaluateRules(rules);
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (rules !== undefined) {
      updateFields.push(`rules_json = $${paramIndex}`);
      updateValues.push(JSON.stringify(rules));
      paramIndex++;

      updateFields.push(`audience_size = $${paramIndex}`);
      updateValues.push(audienceSize);
      paramIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE segments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
      RETURNING *
    `;
    updateValues.push(userId);

    const updatedSegment = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Segment updated successfully',
      segment: {
        ...updatedSegment.rows[0],
        rules_json: typeof updatedSegment.rows[0].rules_json === 'string' 
          ? JSON.parse(updatedSegment.rows[0].rules_json) 
          : updatedSegment.rows[0].rules_json
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update segment'
    });
  } finally {
    client.release();
  }
};

const deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedSegment = await pool.query(
      'DELETE FROM segments WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );

    if (deletedSegment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    res.json({
      success: true,
      message: 'Segment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete segment'
    });
  }
};

const getSegmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_segments,
        AVG(audience_size) as avg_audience_size,
        SUM(audience_size) as total_audience_reach,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as segments_last_7d
      FROM segments
      WHERE created_by = $1
    `, [userId]);

    const topSegments = await pool.query(`
      SELECT name, audience_size, created_at
      FROM segments
      WHERE created_by = $1
      ORDER BY audience_size DESC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      stats: stats.rows[0],
      topSegments: topSegments.rows
    });

  } catch (error) {
    console.error('❌ Get segment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch segment statistics'
    });
  }
};

module.exports = {
  createSegment,
  getSegments,
  getSegmentById,
  previewAudience,
  updateSegment,
  deleteSegment,
  getSegmentStats
};