const { pool } = require('../config/database');
const redisService = require('../services/redisService');

class RuleEngine {
    constructor() {
        this.validFields = ['total_spend', 'visit_count', 'last_visit'];
        this.validOperators = ['>', '<', '>=', '<=', '=', '!=', 'LIKE', 'NOT LIKE'];
    }

    async evaluateRules(rules, limit = null, returnCustomers = false) {
        try {
            console.log('🔍 Evaluating rules:', JSON.stringify(rules, null, 2));
            
            if (!this.validateRulesStructure(rules)) {
                throw new Error('Invalid rules structure');
            }

            if (!returnCustomers && !limit) {
                const cacheKey = `rules_count:${JSON.stringify(rules)}`;
                const cached = await redisService.get(cacheKey);
                if (cached !== null) {
                    console.log('📋 Using cached rule evaluation result:', cached);
                    return parseInt(cached);
                }
            }

            const { query, params } = this.buildSQLQuery(rules, limit, returnCustomers);
            console.log('📝 Generated SQL:', query);
            console.log('📝 Parameters:', params);

            const result = await pool.query(query, params);

            if (returnCustomers) {
                const customers = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    totalSpend: parseFloat(row.total_spend) || 0,
                    visitCount: parseInt(row.visit_count) || 0,
                    lastVisit: row.last_visit
                }));
                console.log(`✅ Rules evaluated: ${customers.length} customers matched`);
                return customers;
            } else {
                const count = parseInt(result.rows.count);
                if (!limit) {
                    const cacheKey = `rules_count:${JSON.stringify(rules)}`;
                    await redisService.set(cacheKey, count, 300);
                }
                console.log(`✅ Rules evaluated: ${count} customers matched`);
                return count;
            }
        } catch (error) {
            console.error('❌ Rule evaluation error:', error);
            throw new Error(`Rule evaluation failed: ${error.message}`);
        }
    }

    validateRulesStructure(rules) {
        if (!rules || typeof rules !== 'object') {
            console.error('❌ Rules must be an object');
            return false;
        }

        if (!rules.operator || !['AND', 'OR'].includes(rules.operator.toUpperCase())) {
            console.error('❌ Rules must have a valid operator (AND/OR)');
            return false;
        }

        if (!rules.conditions || !Array.isArray(rules.conditions)) {
            console.error('❌ Rules must have a conditions array');
            return false;
        }

        if (rules.conditions.length === 0) {
            // Allow empty conditions array for initial state
            return true;
        }

        for (let i = 0; i < rules.conditions.length; i++) {
            const condition = rules.conditions[i];
            
            if (!condition.field || !this.validFields.includes(condition.field)) {
                console.error(`❌ Condition ${i + 1}: Invalid field '${condition.field}'`);
                return false;
            }

            if (!condition.operator || !this.validOperators.includes(condition.operator)) {
                console.error(`❌ Condition ${i + 1}: Invalid operator '${condition.operator}'`);
                return false;
            }

            if (condition.value === undefined || condition.value === null || condition.value === '') {
                console.error(`❌ Condition ${i + 1}: Value is required`);
                return false;
            }

            if (condition.field === 'total_spend' || condition.field === 'visit_count') {
                if (isNaN(parseFloat(condition.value))) {
                    console.error(`❌ Condition ${i + 1}: ${condition.field} requires a numeric value`);
                    return false;
                }
            }

            if (condition.field === 'last_visit') {
                if (condition.operator.includes('LIKE')) {
                    console.error(`❌ Condition ${i + 1}: LIKE operator not valid for date fields`);
                    return false;
                }

                const isRelativeDate = /^\d+\s+(day|month|year)s?\s+ago$/i.test(condition.value);
                if (typeof condition.value === 'string' && !isRelativeDate && isNaN(Date.parse(condition.value))) {
                    console.error(`❌ Condition ${i + 1}: Invalid date format`);
                    return false;
                }
            }
        }

        return true;
    }

    buildSQLQuery(rules, limit = null, returnCustomers = false) {
        const selectClause = returnCustomers 
            ? 'SELECT id, name, email, phone, total_spend, visit_count, last_visit'
            : 'SELECT COUNT(*) as count';
        
        let query = `${selectClause} FROM customers`;
        const params = [];
        let paramIndex = 1;

        if (rules.conditions.length === 0) {
            return { query: returnCustomers ? `${query} WHERE 1 = 0` : 'SELECT 0 as count', params: [] };
        }

        const conditions = [];
        for (const condition of rules.conditions) {
            let sqlCondition;
            let value = condition.value;
            let field = `customers.${condition.field}`;

            if (condition.field === 'last_visit') {
                const relativeDateMatch = String(value).match(/(\d+)\s+(day|month|year)s?\s+ago/i);
                if (relativeDateMatch) {
                    const num = parseInt(relativeDateMatch[1]);
                    const unit = relativeDateMatch[2].toLowerCase();
                    sqlCondition = `${field} ${condition.operator} (CURRENT_DATE - INTERVAL '${num} ${unit}')`;
                } else {
                    sqlCondition = `${field} ${condition.operator} $${paramIndex}`;
                    params.push(value);
                    paramIndex++;
                }
            } else {
                sqlCondition = `${field} ${condition.operator} $${paramIndex}`;
                params.push(value);
                paramIndex++;
            }

            conditions.push(sqlCondition);
        }

        if (conditions.length > 0) {
            const operator = rules.operator.toUpperCase() === 'AND' ? ' AND ' : ' OR ';
            query += ` WHERE ${conditions.join(operator)}`;
        }

        if (returnCustomers) {
            query += ' ORDER BY total_spend DESC, visit_count DESC';
        }

        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
        }

        return { query, params };
    }

    async previewRules(rules, sampleSize = 10) {
        try {
            const customers = await this.evaluateRules(rules, sampleSize, true);
            const totalCount = await this.evaluateRules(rules, null, false);
            
            return {
                totalMatched: totalCount,
                sampleCustomers: customers,
                rulesUsed: rules
            };
        } catch (error) {
            console.error('❌ Rule preview error:', error);
            throw error;
        }
    }

    async validateCustomerAgainstRules(customerId, rules) {
        try {
            const customer = await pool.query(
                'SELECT * FROM customers WHERE id = $1',
                [customerId]
            );

            if (customer.rows.length === 0) {
                return { matches: false, reason: 'Customer not found' };
            }

            const customerData = customer.rows;
            const results = [];

            for (const condition of rules.conditions) {
                const fieldValue = customerData[condition.field];
                let matches = false;

                switch (condition.operator) {
                    case '>':
                        matches = parseFloat(fieldValue) > parseFloat(condition.value);
                        break;
                    case '<':
                        matches = parseFloat(fieldValue) < parseFloat(condition.value);
                        break;
                    case '>=':
                        matches = parseFloat(fieldValue) >= parseFloat(condition.value);
                        break;
                    case '<=':
                        matches = parseFloat(fieldValue) <= parseFloat(condition.value);
                        break;
                    case '=':
                        matches = fieldValue == condition.value;
                        break;
                    case '!=':
                        matches = fieldValue != condition.value;
                        break;
                    case 'LIKE':
                        matches = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
                        break;
                    case 'NOT LIKE':
                        matches = !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
                        break;
                }

                results.push({
                    field: condition.field,
                    operator: condition.operator,
                    value: condition.value,
                    customerValue: fieldValue,
                    matches
                });
            }

            const finalMatch = rules.operator.toUpperCase() === 'AND'
                ? results.every(r => r.matches)
                : results.some(r => r.matches);

            return {
                matches: finalMatch,
                conditionResults: results,
                operator: rules.operator
            };
        } catch (error) {
            console.error('❌ Customer validation error:', error);
            throw error;
        }
    }

    async getSegmentOverlap(rules1, rules2) {
        try {
            const customers1 = await this.evaluateRules(rules1, null, true);
            const customers2 = await this.evaluateRules(rules2, null, true);

            const customerIds1 = new Set(customers1.map(c => c.id));
            const customerIds2 = new Set(customers2.map(c => c.id));

            const overlap = [...customerIds1].filter(id => customerIds2.has(id));
            const union = new Set([...customerIds1, ...customerIds2]);

            return {
                segment1Count: customers1.length,
                segment2Count: customers2.length,
                overlapCount: overlap.length,
                unionCount: union.size,
                overlapPercentage: customers1.length > 0 && customers2.length > 0
                    ? ((overlap.length / Math.min(customers1.length, customers2.length)) * 100).toFixed(2)
                    : 0
            };
        } catch (error) {
            console.error('❌ Segment overlap error:', error);
            throw error;
        }
    }

    generateSampleRules() {
        return {
            highValue: {
                operator: 'AND',
                conditions: [
                    { field: 'total_spend', operator: '>', value: 10000 },
                    { field: 'visit_count', operator: '>=', value: 5 }
                ]
            },
            inactive: {
                operator: 'AND',
                conditions: [
                    { field: 'last_visit', operator: '<', value: '2024-06-01' },
                    { field: 'total_spend', operator: '>', value: 1000 }
                ]
            },
            newCustomers: {
                operator: 'AND',
                conditions: [
                    { field: 'visit_count', operator: '<=', value: 3 },
                    { field: 'last_visit', operator: '>', value: '2024-08-01' }
                ]
            },
            frequentBuyers: {
                operator: 'OR',
                conditions: [
                    { field: 'visit_count', operator: '>', value: 10 },
                    { field: 'total_spend', operator: '>', value: 5000 }
                ]
            }
        };
    }
}

// Create a single instance and export it directly
const ruleEngine = new RuleEngine();

// FIXED: Export only the instance methods, not wrapper functions
module.exports = {
    evaluateRules: (rules, limit, returnCustomers) => ruleEngine.evaluateRules(rules, limit, returnCustomers),
    validateRulesStructure: (rules) => ruleEngine.validateRulesStructure(rules),
    buildSQLQuery: (rules, limit, returnCustomers) => ruleEngine.buildSQLQuery(rules, limit, returnCustomers),
    previewRules: (rules, sampleSize) => ruleEngine.previewRules(rules, sampleSize),
    validateCustomerAgainstRules: (customerId, rules) => ruleEngine.validateCustomerAgainstRules(customerId, rules),
    getSegmentOverlap: (rules1, rules2) => ruleEngine.getSegmentOverlap(rules1, rules2),
    generateSampleRules: () => ruleEngine.generateSampleRules()
};
