import { useState, useCallback } from 'react'
import type { SegmentRules, RuleCondition } from '../types/segment'

export const useRuleBuilder = () => {
  const [rules, setRules] = useState<SegmentRules>({
    operator: 'AND',
    conditions: []
  })

  const resetRules = useCallback(() => {
    setRules({
      operator: 'AND',
      conditions: []
    })
  }, [])

  const isValidRules = useCallback((): boolean => {
    if (!rules) return false
    if (!rules.operator || !['AND', 'OR'].includes(rules.operator)) return false
    if (!rules.conditions || !Array.isArray(rules.conditions) || rules.conditions.length === 0) return false
    
    // Check each condition
    return rules.conditions.every((condition: RuleCondition) => {
      return condition.field && 
             condition.operator && 
             (condition.value !== undefined && condition.value !== '' && condition.value !== null)
    })
  }, [rules])

  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = []
    
    if (!rules) {
      errors.push('Rules object is required')
      return errors
    }

    if (!rules.operator || !['AND', 'OR'].includes(rules.operator)) {
      errors.push('Rule operator must be AND or OR')
    }

    if (!rules.conditions || !Array.isArray(rules.conditions)) {
      errors.push('Conditions must be an array')
      return errors
    }

    if (rules.conditions.length === 0) {
      errors.push('At least one condition is required')
      return errors
    }

    if (rules.conditions.length > 10) {
      errors.push('Maximum 10 conditions allowed')
    }

    rules.conditions.forEach((condition: RuleCondition, index: number) => {
      if (!condition.field) {
        errors.push(`Condition ${index + 1}: Field is required`)
      }
      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`)
      }
      if (condition.value === undefined || condition.value === '' || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`)
      }
    })

    return errors
  }, [rules])

  return {
    rules,
    setRules,
    resetRules,
    isValidRules,
    getValidationErrors
  }
}
