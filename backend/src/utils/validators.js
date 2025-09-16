const validator = require('validator');

class Validators {
  // Email validation
  static isValidEmail(email) {
    return validator.isEmail(email) && email.length <= 255;
  }

  // Phone validation (supports international formats)
  static isValidPhone(phone) {
    if (!phone) return true; // Phone is optional
    return validator.isMobilePhone(phone, 'any') || /^\+?[\d\s\-\(\)]{10,15}$/.test(phone);
  }

  // Name validation
  static isValidName(name) {
    return name && 
           typeof name === 'string' && 
           name.trim().length >= 2 && 
           name.trim().length <= 255 &&
           /^[a-zA-Z\s\.\-']+$/.test(name.trim());
  }

  // Currency amount validation
  static isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  }

  // Integer validation
  static isValidInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = parseInt(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  // Date validation
  static isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date <= new Date();
  }

  // Campaign message validation
  static isValidMessage(message) {
    return message && 
           typeof message === 'string' && 
           message.trim().length >= 10 && 
           message.trim().length <= 2000;
  }

  // Segment name validation
  static isValidSegmentName(name) {
    return name && 
           typeof name === 'string' && 
           name.trim().length >= 2 && 
           name.trim().length <= 255;
  }

  // Rule validation
  static validateRule(rule) {
    const errors = [];

    if (!rule || typeof rule !== 'object') {
      errors.push('Rule must be an object');
      return errors;
    }

    // Validate field
    const validFields = ['total_spend', 'visit_count', 'last_visit'];
    if (!rule.field || !validFields.includes(rule.field)) {
      errors.push(`Field must be one of: ${validFields.join(', ')}`);
    }

    // Validate operator
    const validOperators = ['>', '<', '>=', '<=', '=', '!=', 'LIKE', 'NOT LIKE'];
    if (!rule.operator || !validOperators.includes(rule.operator)) {
      errors.push(`Operator must be one of: ${validOperators.join(', ')}`);
    }

    // Validate value
    if (rule.value === undefined || rule.value === null) {
      errors.push('Value is required');
    } else {
      // Field-specific value validation
      if (rule.field === 'total_spend' && !this.isValidAmount(rule.value)) {
        errors.push('Total spend must be a valid amount');
      }

      if (rule.field === 'visit_count' && !this.isValidInteger(rule.value, 0)) {
        errors.push('Visit count must be a valid integer');
      }

      if (rule.field === 'last_visit') {
        if (rule.operator && rule.operator.includes('LIKE')) {
          errors.push('LIKE operator not valid for date fields');
        }
        
        if (typeof rule.value === 'string' && !this.isValidDate(rule.value) && !rule.value.includes('ago')) {
          errors.push('Last visit must be a valid date or relative date (e.g., "30 days ago")');
        }
      }
    }

    return errors;
  }

  // Rules validation
  static validateRules(rules) {
    const errors = [];

    if (!rules || typeof rules !== 'object') {
      errors.push('Rules must be an object');
      return errors;
    }

    if (!rules.operator || !['AND', 'OR'].includes(rules.operator.toUpperCase())) {
      errors.push('Rules operator must be AND or OR');
    }

    if (!rules.conditions || !Array.isArray(rules.conditions)) {
      errors.push('Rules must have a conditions array');
    } else {
      if (rules.conditions.length === 0) {
        errors.push('Rules must have at least one condition');
      }

      // Validate each condition
      rules.conditions.forEach((condition, index) => {
        const conditionErrors = this.validateRule(condition);
        conditionErrors.forEach(error => {
          errors.push(`Condition ${index + 1}: ${error}`);
        });
      });
    }

    return errors;
  }

  // Bulk data validation
  static validateBulkCustomers(customers) {
    const errors = [];
    const emailSet = new Set();

    if (!Array.isArray(customers)) {
      errors.push('Customers must be an array');
      return errors;
    }

    if (customers.length === 0) {
      errors.push('Customers array cannot be empty');
      return errors;
    }

    if (customers.length > 1000) {
      errors.push('Maximum 1000 customers allowed per bulk upload');
    }

    customers.forEach((customer, index) => {
      const rowNumber = index + 1;

      // Required fields
      if (!customer.name || !this.isValidName(customer.name)) {
        errors.push(`Row ${rowNumber}: Invalid name`);
      }

      if (!customer.email || !this.isValidEmail(customer.email)) {
        errors.push(`Row ${rowNumber}: Invalid email`);
      } else {
        // Check for duplicate emails
        if (emailSet.has(customer.email.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Duplicate email ${customer.email}`);
        }
        emailSet.add(customer.email.toLowerCase());
      }

      // Optional fields
      if (customer.phone && !this.isValidPhone(customer.phone)) {
        errors.push(`Row ${rowNumber}: Invalid phone number`);
      }

      if (customer.totalSpend !== undefined && !this.isValidAmount(customer.totalSpend)) {
        errors.push(`Row ${rowNumber}: Invalid total spend amount`);
      }

      if (customer.visitCount !== undefined && !this.isValidInteger(customer.visitCount, 0)) {
        errors.push(`Row ${rowNumber}: Invalid visit count`);
      }
    });

    return errors;
  }

  // Sanitization helpers
  static sanitizeString(str, maxLength = 255) {
    if (!str || typeof str !== 'string') return '';
    
    return validator.escape(str.trim()).substring(0, maxLength);
  }

  static sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    
    return validator.normalizeEmail(email.trim().toLowerCase()) || '';
  }

  static sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    
    // Remove all non-digit characters except + and spaces
    return phone.replace(/[^\d\+\s\-\(\)]/g, '').trim();
  }

  static sanitizeAmount(amount) {
    const num = parseFloat(amount);
    return isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100);
  }

  static sanitizeInteger(value, min = 0) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : Math.max(min, num);
  }

  // Campaign objective validation
  static isValidCampaignObjective(objective) {
    return objective && 
           typeof objective === 'string' && 
           objective.trim().length >= 5 && 
           objective.trim().length <= 200;
  }

  // Pagination validation
  static validatePagination(page, limit) {
    const errors = [];
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1) {
      errors.push('Page must be a positive integer');
    }

    if (limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be between 1 and 100');
    }

    return {
      errors,
      page: Math.max(1, pageNum),
      limit: Math.min(100, Math.max(1, limitNum))
    };
  }

  // Sort validation
  static validateSort(sortBy, sortOrder, validFields) {
    const validOrders = ['ASC', 'DESC'];
    
    return {
      sortBy: validFields.includes(sortBy) ? sortBy : validFields[0],
      sortOrder: validOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    };
  }

  // File validation
  static validateFileType(filename, allowedTypes) {
    if (!filename) return false;
    
    const extension = filename.toLowerCase().split('.').pop();
    return allowedTypes.includes(extension);
  }

  static validateFileSize(size, maxSizeBytes) {
    return size && size <= maxSizeBytes;
  }

  // Rate limiting validation
  static validateRateLimit(current, max, windowStart, windowMs) {
    const now = Date.now();
    const isWithinWindow = (now - windowStart) < windowMs;
    
    if (!isWithinWindow) {
      return { allowed: true, remaining: max - 1 };
    }
    
    return {
      allowed: current < max,
      remaining: Math.max(0, max - current - 1),
      resetTime: windowStart + windowMs
    };
  }
}

module.exports = Validators;
