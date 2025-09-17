import React, { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import type { SegmentRules, RuleCondition } from '../../types/segment'

interface RuleBuilderProps {
  rules: SegmentRules
  onChange: (rules: SegmentRules) => void
}

const CUSTOMER_FIELDS = [
  { value: 'totalSpend', label: 'Total Spend', type: 'number' },
  { value: 'visitCount', label: 'Visit Count', type: 'number' },
  { value: 'lastVisit', label: 'Last Visit', type: 'date' },
  { value: 'createdAt', label: 'Registration Date', type: 'date' },
  { value: 'name', label: 'Customer Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
]

const OPERATORS = {
  number: [
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<=', label: 'Less than or equal' },
    { value: '=', label: 'Equal to' },
    { value: '!=', label: 'Not equal to' },
  ],
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
  ],
  date: [
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' },
  ],
}

const MAX_CONDITIONS = 10
const DEFAULT_CONDITION: RuleCondition = {
  field: undefined as unknown as RuleCondition['field'],
  operator: undefined as unknown as RuleCondition['operator'],
  value: '',
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ rules, onChange }) => {
  const [errors, setErrors] = useState<string[]>([])

  // Initialize rules if empty
  const safeRules: SegmentRules = {
    operator: rules?.operator || 'AND',
    conditions: rules?.conditions || [{ ...DEFAULT_CONDITION }],
  }

  const validateCondition = (condition: RuleCondition, index: number): string[] => {
    const conditionErrors: string[] = []
    
    if (!condition.field) {
      conditionErrors.push(`Condition ${index + 1}: Field is required`)
    }
    
    if (!condition.operator) {
      conditionErrors.push(`Condition ${index + 1}: Operator is required`)
    }
    
    if (condition.value === '' || condition.value === undefined || condition.value === null) {
      conditionErrors.push(`Condition ${index + 1}: Value is required`)
    }
    
    // Validate number values
    if (condition.field && CUSTOMER_FIELDS.find(f => f.value === condition.field)?.type === 'number') {
      const numValue = parseFloat(condition.value as string)
      if (isNaN(numValue)) {
        conditionErrors.push(`Condition ${index + 1}: Value must be a valid number`)
      }
    }
    
    return conditionErrors
  }

  const validateAllConditions = (): string[] => {
    let allErrors: string[] = []
    
    if (safeRules.conditions.length === 0) {
      allErrors.push('At least one condition is required')
      return allErrors
    }
    
    if (safeRules.conditions.length > MAX_CONDITIONS) {
      allErrors.push(`Maximum ${MAX_CONDITIONS} conditions allowed`)
      return allErrors
    }
    
    safeRules.conditions.forEach((condition, index) => {
      allErrors = allErrors.concat(validateCondition(condition, index))
    })
    
    return allErrors
  }

  const updateRules = (newRules: SegmentRules) => {
    const validationErrors = validateAllConditions()
    setErrors(validationErrors)
    onChange(newRules)
  }

  const addCondition = () => {
    if (safeRules.conditions.length >= MAX_CONDITIONS) {
      setErrors([`Maximum ${MAX_CONDITIONS} conditions allowed`])
      return
    }

    const newRules = {
      ...safeRules,
      conditions: [...safeRules.conditions, { ...DEFAULT_CONDITION }],
    }
    updateRules(newRules)
  }

  const removeCondition = (index: number) => {
    if (safeRules.conditions.length <= 1) {
      setErrors(['At least one condition is required'])
      return
    }

    const newConditions = safeRules.conditions.filter((_, i) => i !== index)
    const newRules = {
      ...safeRules,
      conditions: newConditions,
    }
    updateRules(newRules)
  }

  const updateCondition = (index: number, field: keyof RuleCondition, value: string | number) => {
    const newConditions = [...safeRules.conditions]
    
    if (index >= 0 && index < newConditions.length) {
      newConditions[index] = {
        ...newConditions[index],
        [field]: value,
      }

      // Reset operator and value when field changes
      if (field === 'field') {
  newConditions[index].operator = undefined as unknown as RuleCondition['operator']
  newConditions[index].value = ''
      }

      const newRules = {
        ...safeRules,
        conditions: newConditions,
      }
      updateRules(newRules)
    }
  }

  const getFieldType = (fieldValue: string): string => {
    return CUSTOMER_FIELDS.find(f => f.value === fieldValue)?.type || 'text'
  }

  const getOperatorsForField = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue)
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text
  }

  return (
    <div className="space-y-4">
      {/* Operator Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Combine conditions with:
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="operator"
              value="AND"
              checked={safeRules.operator === 'AND'}
              onChange={(e) => updateRules({ ...safeRules, operator: e.target.value as 'AND' | 'OR' })}
              className="mr-2"
            />
            <span className="text-sm">AND (all conditions must match)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="operator"
              value="OR"
              checked={safeRules.operator === 'OR'}
              onChange={(e) => updateRules({ ...safeRules, operator: e.target.value as 'AND' | 'OR' })}
              className="mr-2"
            />
            <span className="text-sm">OR (any condition must match)</span>
          </label>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Conditions ({safeRules.conditions.length}/{MAX_CONDITIONS})
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={addCondition}
            disabled={safeRules.conditions.length >= MAX_CONDITIONS}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Condition
          </Button>
        </div>

        {safeRules.conditions.map((condition, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Field Selection */}
              <div>
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Field</option>
                  {CUSTOMER_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator Selection */}
              <div>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={!condition.field}
                >
                  <option value="">Select Operator</option>
                  {condition.field &&
                    getOperatorsForField(condition.field).map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Value Input */}
              <div>
                <Input
                  type={getFieldType(condition.field) === 'number' ? 'number' : getFieldType(condition.field) === 'date' ? 'date' : 'text'}
                  placeholder="Enter value"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  disabled={!condition.field || !condition.operator}
                />
              </div>
            </div>

            {/* Remove Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => removeCondition(index)}
              disabled={safeRules.conditions.length <= 1}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Please fix the following issues:</p>
            <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary */}
      {safeRules.conditions.length > 0 && errors.length === 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>Rule Summary:</strong> Show customers where{' '}
            {safeRules.conditions.map((condition, index) => (
              <span key={index}>
                {index > 0 && ` ${safeRules.operator.toLowerCase()} `}
                <strong>{CUSTOMER_FIELDS.find(f => f.value === condition.field)?.label}</strong>{' '}
                <em>{getOperatorsForField(condition.field).find(op => op.value === condition.operator)?.label?.toLowerCase()}</em>{' '}
                <strong>{condition.value}</strong>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}

export default RuleBuilder
