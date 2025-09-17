const { pool } = require('../config/database');
const { evaluateRules } = require('../utils/ruleEngine');
const { generateSegmentFromNLP } = require('../services/aiService');

const createSegment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { name, description, rules, nlpQuery } = req.body;
    const userId = req.user.id;

    // Enhanced validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Segment name is required and must be a non-empty string'
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Segment name must be 100 characters or less'
      });
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Description must be 500 characters or less'
      });
    }

    if (!rules && !nlpQuery) {
      return res.status(400).json({
        success: false,
        error: 'Either rules or natural language query is required'
      });
    }

    let finalRules = rules;

    // Handle AI-generated rules
    if (nlpQuery && !rules) {
      try {
        console.log('🤖 Converting NLP query to rules:', nlpQuery);
        const aiResponse = await generateSegmentFromNLP(nlpQuery);
        
        if (aiResponse && aiResponse.rules) {
          finalRules = aiResponse.rules;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Failed to generate rules from natural language query'
          });
        }
        
        console.log('✅ AI generated rules:', JSON.stringify(finalRules, null, 2));
      } catch (aiError) {
        console.error('❌ AI generation failed:', aiError);
        return res.status(400).json({
          success: false,
          error: 'Failed to process natural language query. Please try manual rules instead.'
        });
      }
    }

    // Enhanced rules validation
    if (!finalRules || typeof finalRules !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Rules must be a valid object'
      });
    }

    if (!finalRules.operator || !['AND', 'OR'].includes(finalRules.operator)) {
      return res.status(400).json({
        success: false,
        error: 'Rules operator must be "AND" or "OR"'
      });
    }

    if (!finalRules.conditions || !Array.isArray(finalRules.conditions)) {
      return res.status(400).json({
        success: false,
        error: 'Rules conditions must be an array'
      });
    }

    if (finalRules.conditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one rule condition is required'
      });
    }

    if (finalRules.conditions.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 rule conditions allowed'
      });
    }

    // Validate each condition
    const validFields = ['totalSpend', 'visitCount', 'lastVisit', 'createdAt', 'name', 'email'];
    for (let i = 0; i < finalRules.conditions.length; i++) {
      const condition = finalRules.conditions[i];
      
      if (!condition.field || !validFields.includes(condition.field)) {
        return res.status(400).json({
          success: false,
          error: `Condition ${i + 1}: Invalid field "${condition.field}"`
        });
      }
      
      if (!condition.operator) {
        return res.status(400).json({
          success: false,
          error: `Condition ${i + 1}: Operator is required`
        });
      }
      
      if (condition.value === undefined || condition.value === null || condition.value === '') {
        return res.status(400).json({
          success: false,
          error: `Condition ${i + 1}: Value is required`
        });
      }
    }

    // Calculate audience size with error handling
    let audienceSize = 0;
    try {
      console.log('📊 Calculating audience size for rules:', JSON.stringify(finalRules, null, 2));
      audienceSize = await evaluateRules(finalRules);
      
      if (typeof audienceSize !== 'number' || isNaN(audienceSize) || audienceSize < 0) {
        console.warn('⚠️ Invalid audience size, defaulting to 0');
        audienceSize = 0;
      }
      
      console.log('✅ Calculated audience size:', audienceSize);
    } catch (evaluationError) {
      console.error('❌ Error calculating audience size:', evaluationError);
      // Don't fail the segment creation, just set audience size to 0
      audienceSize = 0;
    }

    // FIX: Use consistent camelCase column names that match your database schema
    const result = await client.query(
      `INSERT INTO segments (name, description, rulesJson, createdBy, audienceSize) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        name.trim(),
        description?.trim() || '',
        JSON.stringify(finalRules),
        userId,
        audienceSize
      ]
    );

    await client.query('COMMIT');
    
    const newSegment = result.rows[0];
    
    // FIX: Return response structure that matches frontend expectations
    res.status(201).json({
      success: true,
      data: {
        id: newSegment.id,
        name: newSegment.name,
        description: newSegment.description,
        rules: finalRules,
        audienceSize: newSegment.audiencesize,
        createdAt: newSegment.createdat,
        updatedAt: newSegment.updatedat
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating segment:', error);
    
    // Send user-friendly error message
    const errorMessage = error.message || 'An unexpected error occurred while creating the segment';
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  } finally {
    client.release();
  }
};

const getSegments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT s.*, u.name as createdByName, u.email as createdByEmail
      FROM segments s
      LEFT JOIN users u ON s.createdBy = u.id
      WHERE s.createdBy = $1
    `;
    
    const params = [userId];
    
    if (search) {
      query += ` AND (s.name ILIKE $${params.length + 1} OR s.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY s.createdAt DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    const segments = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rules: typeof row.rulesjson === 'string' ? JSON.parse(row.rulesjson) : row.rulesjson,
      audienceSize: row.audiencesize,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      creator: {
        name: row.createdbyname,
        email: row.createdbyemail
      }
    }));
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM segments s 
      WHERE s.createdBy = $1 ${search ? `AND (s.name ILIKE $2 OR s.description ILIKE $2)` : ''}
    `;
    const countParams = search ? [userId, `%${search}%`] : [userId];
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        segments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
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

    const result = await pool.query(
      `SELECT s.*, u.name as createdByName, u.email as createdByEmail
       FROM segments s
       LEFT JOIN users u ON s.createdBy = u.id
       WHERE s.id = $1 AND s.createdBy = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const segment = result.rows[0];
    const segmentData = {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      rules: typeof segment.rulesjson === 'string' ? JSON.parse(segment.rulesjson) : segment.rulesjson,
      audienceSize: segment.audiencesize,
      createdAt: segment.createdat,
      updatedAt: segment.updatedat,
      creator: {
        name: segment.createdbyname,
        email: segment.createdbyemail
      }
    };

    res.json({
      success: true,
      data: segmentData
    });
  } catch (error) {
    console.error('Error fetching segment by ID:', error);
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
        const aiResponse = await generateSegmentFromNLP(nlpQuery);
        finalRules = aiResponse.rules;
      } catch (aiError) {
        console.error('AI conversion failed:', aiError);
        return res.status(400).json({
          success: false,
          error: 'Failed to convert natural language query to rules'
        });
      }
    }

    // Validate rules structure
    if (!finalRules || !finalRules.conditions || !Array.isArray(finalRules.conditions)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rules structure'
      });
    }

    const audienceSize = await evaluateRules(finalRules);
    
    // Get sample customers
    const sampleCustomers = await evaluateRules(finalRules, 10, true);

    res.json({
      success: true,
      data: {
        audienceSize,
        sampleCustomers,
        rules: finalRules
      }
    });
  } catch (error) {
    console.error('Error previewing audience:', error);
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

    // Check if segment exists and belongs to user
    const existingSegment = await client.query(
      'SELECT id FROM segments WHERE id = $1 AND createdBy = $2',
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
      updateValues.push(name.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description.trim());
      paramIndex++;
    }

    if (rules !== undefined) {
      updateFields.push(`rulesJson = $${paramIndex}`);
      updateValues.push(JSON.stringify(rules));
      paramIndex++;
      
      updateFields.push(`audienceSize = $${paramIndex}`);
      updateValues.push(audienceSize);
      paramIndex++;
    }

    updateFields.push(`updatedAt = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE segments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND createdBy = $${paramIndex + 1}
      RETURNING *
    `;
    
    updateValues.push(id, userId);

    const result = await client.query(updateQuery, updateValues);
    await client.query('COMMIT');

    const updatedSegment = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: updatedSegment.id,
        name: updatedSegment.name,
        description: updatedSegment.description,
        rules: typeof updatedSegment.rulesjson === 'string' ? JSON.parse(updatedSegment.rulesjson) : updatedSegment.rulesjson,
        audienceSize: updatedSegment.audiencesize,
        createdAt: updatedSegment.createdat,
        updatedAt: updatedSegment.updatedat
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating segment:', error);
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

    const result = await pool.query(
      'DELETE FROM segments WHERE id = $1 AND createdBy = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
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
    console.error('Error deleting segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete segment'
    });
  }
};

const getSegmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT
        COUNT(*) as total_segments,
        AVG(audienceSize) as avg_audience_size,
        SUM(audienceSize) as total_audience_reach,
        COUNT(CASE WHEN createdAt >= NOW() - INTERVAL '7 days' THEN 1 END) as segments_last_7d
      FROM segments
      WHERE createdBy = $1
    `;

    const topSegmentsQuery = `
      SELECT name, audienceSize, createdAt
      FROM segments
      WHERE createdBy = $1
      ORDER BY audienceSize DESC
      LIMIT 5
    `;

    const [statsResult, topSegmentsResult] = await Promise.all([
      pool.query(statsQuery, [userId]),
      pool.query(topSegmentsQuery, [userId])
    ]);

    res.json({
      success: true,
      data: {
        stats: statsResult.rows[0],
        topSegments: topSegmentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching segment stats:', error);
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
