import React from 'react'
import { X } from 'lucide-react'
import type { RuleCondition as RuleConditionType } from '../../types/segment'
import Button from '../ui/Button'

interface RuleConditionProps {
  condition: RuleConditionType
  onUpdate: (updates: Partial<RuleConditionType>) => void
  onRemove: () => void
  canRemove: boolean
}

const RuleCondition: React.FC<RuleConditionProps> = ({
  condition,
  onUpdate,
  onRemove,
  canRemove
}) => {
  const fieldOptions = [
    { value: 'total_spend', label: 'Total Spend (Rs.)' },
    { value: 'visit_count', label: 'Visit Count' },
    { value: 'last_visit', label: 'Last Visit' }
  ]

  const operatorOptions = {
    total_spend: [
      { value: '>', label: 'Greater than' },
      { value: '>=', label: 'Greater than or equal' },
      { value: '<', label: 'Less than' },
      { value: '<=', label: 'Less than or equal' },
      { value: '=', label: 'Equal to' }
    ],
    visit_count: [
      { value: '>', label: 'Greater than' },
      { value: '>=', label: 'Greater than or equal' },
      { value: '<', label: 'Less than' },
      { value: '<=', label: 'Less than or equal' },
      { value: '=', label: 'Equal to' }
    ],
    last_visit: [
      { value: '>', label: 'After' },
      { value: '<', label: 'Before' },
      { value: '>=', label: 'On or after' },
      { value: '<=', label: 'On or before' }
    ]
  }

  const getPlaceholder = () => {
    switch (condition.field) {
      case 'total_spend':
        return 'e.g., 10000'
      case 'visit_count':
        return 'e.g., 5'
      case 'last_visit':
        return 'YYYY-MM-DD or "30 days ago"'
      default:
        return ''
    }
  }

  const getInputType = () => {
    switch (condition.field) {
      case 'total_spend':
      case 'visit_count':
        return 'number'
      case 'last_visit':
        return 'text'
      default:
        return 'text'
    }
  }

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Field Select */}
      <select
        value={condition.field}
        onChange={(e) => onUpdate({ 
          field: e.target.value as RuleConditionType['field'],
          operator: '>',
          value: ''
        })}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {fieldOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Operator Select */}
      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as RuleConditionType['operator'] })}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {operatorOptions[condition.field].map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Value Input */}
      <input
        type={getInputType()}
        value={condition.value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder={getPlaceholder()}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />

      {/* Remove Button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="p-2 text-red-600 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

export default RuleCondition
