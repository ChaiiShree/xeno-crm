import React from 'react'
import { Plus, X } from 'lucide-react'
import type { SegmentRules, RuleCondition } from '../../types/segment'
import RuleCondition from './RuleCondition'
import Button from '../ui/Button'
import { cn } from '../../utils/helpers'

interface ConditionGroupProps {
  rules: SegmentRules
  onUpdateRules: (rules: SegmentRules) => void
  className?: string
}

const ConditionGroup: React.FC<ConditionGroupProps> = ({
  rules,
  onUpdateRules,
  className
}) => {
  const updateOperator = (operator: 'AND' | 'OR') => {
    onUpdateRules({ ...rules, operator })
  }

  const addCondition = () => {
    const newCondition: RuleCondition = {
      field: 'total_spend',
      operator: '>',
      value: ''
    }
    onUpdateRules({
      ...rules,
      conditions: [...rules.conditions, newCondition]
    })
  }

  const removeCondition = (index: number) => {
    onUpdateRules({
      ...rules,
      conditions: rules.conditions.filter((_, i) => i !== index)
    })
  }

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    onUpdateRules({
      ...rules,
      conditions: rules.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Group Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Match</span>
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => updateOperator('AND')}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-md transition-all duration-200',
                rules.operator === 'AND'
                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => updateOperator('OR')}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-md transition-all duration-200',
                rules.operator === 'OR'
                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              ANY
            </button>
          </div>
          <span className="text-sm text-gray-500">of the following conditions:</span>
        </div>

        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          {rules.conditions.length} condition{rules.conditions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3 ml-4">
        {rules.conditions.map((condition, index) => (
          <div key={index} className="relative">
            {/* Connector Line */}
            {index > 0 && (
              <div className="absolute -top-6 left-6 w-px h-6 bg-gray-300"></div>
            )}
            
            {/* Operator Badge */}
            {index > 0 && (
              <div className="absolute -top-3 left-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded border border-primary-200">
                {rules.operator}
              </div>
            )}

            {/* Condition */}
            <div className="flex items-center space-x-3">
              {/* Connector Dot */}
              <div className="w-3 h-3 bg-primary-500 rounded-full border-2 border-white shadow-sm flex-shrink-0"></div>
              
              {/* Condition Component */}
              <div className="flex-1">
                <RuleCondition
                  condition={condition}
                  onUpdate={(updates) => updateCondition(index, updates)}
                  onRemove={() => removeCondition(index)}
                  canRemove={rules.conditions.length > 1}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Condition Button */}
      <div className="ml-4 flex items-center space-x-3">
        <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white flex-shrink-0"></div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          leftIcon={<Plus className="w-4 h-4" />}
          className="border-dashed hover:border-solid"
        >
          Add Condition
        </Button>
      </div>

      {/* Group Summary */}
      <div className="ml-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-medium">
            {rules.operator === 'AND' ? 'All' : 'Any'} of these conditions must be met
          </span>
          {rules.conditions.some(c => !c.value) && (
            <span className="block text-blue-600 mt-1">
              ⚠️ Complete all conditions to preview audience
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default ConditionGroup
