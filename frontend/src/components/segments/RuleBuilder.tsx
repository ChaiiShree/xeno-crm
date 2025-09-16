import React from 'react'
import { Plus } from 'lucide-react'
import { useRuleBuilder } from '../../hooks/useRuleBuilder'
import type { SegmentRules } from '../../types/segment'
import RuleCondition from './RuleCondition'
import Button from '../ui/Button'

interface RuleBuilderProps {
  initialRules?: SegmentRules
  onChange: (rules: SegmentRules) => void
  className?: string
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({
  initialRules,
  onChange,
  className
}) => {
  const {
    rules,
    updateOperator,
    addCondition,
    removeCondition,
    updateCondition,
    isValidRules
  } = useRuleBuilder(initialRules)

  React.useEffect(() => {
    onChange(rules)
  }, [rules, onChange])

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Operator Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Match</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => updateOperator('AND')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                rules.operator === 'AND'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => updateOperator('OR')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                rules.operator === 'OR'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ANY
            </button>
          </div>
          <span className="text-sm text-gray-500">of the following conditions:</span>
        </div>

        {/* Conditions */}
        <div className="space-y-3">
          {rules.conditions.map((condition, index) => (
            <div key={index} className="relative">
              {index > 0 && (
                <div className="absolute -top-2 left-4 px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">
                  {rules.operator}
                </div>
              )}
              <RuleCondition
                condition={condition}
                onUpdate={(updates) => updateCondition(index, updates)}
                onRemove={() => removeCondition(index)}
                canRemove={rules.conditions.length > 1}
              />
            </div>
          ))}
        </div>

        {/* Add Condition Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addCondition}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full justify-center border-dashed"
        >
          Add Condition
        </Button>

        {/* Validation Message */}
        {!isValidRules() && (
          <p className="text-sm text-red-600">
            Please fill in all condition fields to preview the audience.
          </p>
        )}
      </div>
    </div>
  )
}

export default RuleBuilder
