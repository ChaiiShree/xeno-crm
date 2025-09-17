import React, { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import aiService from '../../services/aiService'
import toast from 'react-hot-toast'

interface NLPQueryInputProps {
  value?: string
  onChange?: (value: string) => void
  onSegmentGenerated?: (data: any) => void
  placeholder?: string
}

const NLPQueryInput: React.FC<NLPQueryInputProps> = ({
  value = '',
  onChange,
  onSegmentGenerated,
  placeholder = "Describe your target audience in natural language"
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRules, setGeneratedRules] = useState<any>(null)

  const sampleQueries = [
    'Customers who spent more than $1000 in the last 6 months',
    'High-value customers who visit frequently but haven\'t purchased recently',
    'New customers who joined in the last 30 days',
    'Customers who haven\'t made a purchase in 3 months',
    'VIP customers with more than 10 orders'
  ]

  const handleGenerate = async () => {
    if (!value.trim()) {
      toast.error('Please enter a description of your target audience')
      return
    }

    if (value.trim().length < 10) {
      toast.error('Please provide a more detailed description (at least 10 characters)')
      return
    }

    setIsGenerating(true)
    
    try {
      console.log('🤖 Generating segment from NLP:', value)
      
      const response = await aiService.generateSegmentFromNLP(value)
      
      console.log('✅ AI Response:', response)
      
      if (response && response.rules) {
        const segmentData = {
          rules: response.rules,
          suggestedName: response.suggestedName || generateNameFromQuery(value),
          explanation: response.explanation || value,
          audienceSize: response.audienceSize || 0
        }
        
        setGeneratedRules(segmentData)
        
        if (onSegmentGenerated) {
          onSegmentGenerated(segmentData)
        }
        
        toast.success('Rules generated successfully! Review and adjust as needed.')
      } else {
        throw new Error('Invalid response from AI service')
      }
    } catch (error: any) {
      console.error('❌ AI generation error:', error)
      
      const errorMessage = error?.response?.data?.error || 
                          error?.message || 
                          'Failed to generate rules from your description'
      
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateNameFromQuery = (query: string): string => {
    const words = query.toLowerCase().split(' ')
    const keyWords = words.filter(word => 
      !['who', 'have', 'has', 'are', 'is', 'the', 'a', 'an', 'in', 'on', 'at', 'with', 'than', 'more', 'less'].includes(word)
    ).slice(0, 4)
    
    return keyWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Segment'
  }

  const handleSampleQuery = (query: string) => {
    if (onChange) {
      onChange(query)
    }
  }

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          rows={3}
          maxLength={500}
          disabled={isGenerating}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">
            {value.length}/500 characters
          </span>
          <Button
            onClick={handleGenerate}
            disabled={!value.trim() || isGenerating}
            loading={isGenerating}
            leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            size="sm"
          >
            {isGenerating ? 'Generating...' : 'Generate Rules'}
          </Button>
        </div>
      </div>

      {/* Sample Queries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sample queries (click to use):
        </label>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuery(query)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              disabled={isGenerating}
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Rules Preview */}
      {generatedRules && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">AI Generated Rules</span>
          </div>
          
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Suggested Name:</strong> {generatedRules.suggestedName}</p>
            <p><strong>Estimated Audience:</strong> {generatedRules.audienceSize?.toLocaleString() || 0} customers</p>
            
            {generatedRules.rules && (
              <div className="mt-2">
                <p><strong>Generated Conditions:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  {generatedRules.rules.conditions?.map((condition: any, index: number) => (
                    <li key={index} className="text-xs">
                      {condition.field} {condition.operator} {condition.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <p className="text-xs text-green-600 mt-2">
            Review the generated rules in the form above and make adjustments as needed.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>
          <strong>Tips:</strong> Be specific about customer behavior, spending patterns, visit frequency, or time periods. 
          Examples: "customers who spent over $500", "users who haven't visited in 30 days", "frequent buyers with 5+ orders"
        </p>
      </div>
    </div>
  )
}

export default NLPQueryInput
