import { useState, useCallback } from 'react'
import type { SegmentRules, RuleCondition } from '../types/segment'

export const useRuleBuilder = (initialRules?: SegmentRules) => {
  const [rules, setRules] = useState<SegmentRules>(
    initialRules || {
      operator: 'AND',
      conditions: [{ field: 'total_spend', operator: '>', value: '' }]
    }
  )

  const updateOperator = useCallback((operator: 'AND' | 'OR') => {
    setRules(prev => ({ ...prev, operator }))
  }, [])

  const addCondition = useCallback(() => {
    const newCondition: RuleCondition = {
      field: 'total_spend',
      operator: '>',
      value: ''
    }
    setRules(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }))
  }, [])

  const removeCondition = useCallback((index: number) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }, [])

  const updateCondition = useCallback((index: number, updates: Partial<RuleCondition>) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    }))
  }, [])

  const resetRules = useCallback(() => {
    setRules({
      operator: 'AND',
      conditions: [{ field: 'total_spend', operator: '>', value: '' }]
    })
  }, [])

  const isValidRules = useCallback(() => {
    return rules.conditions.every(condition => 
      condition.field && condition.operator && condition.value !== ''
    )
  }, [rules])

  return {
    rules,
    setRules,
    updateOperator,
    addCondition,
    removeCondition,
    updateCondition,
    resetRules,
    isValidRules
  }
}
