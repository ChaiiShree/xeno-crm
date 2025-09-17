import React, { useState } from 'react'
import { Plus, Search, Target, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAPI } from '../hooks/useAPI'
import { useRuleBuilder } from '../hooks/useRuleBuilder'
import type { CreateSegmentRequest, Segment, SegmentRules } from '../types/segment'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import RuleBuilder from '../components/segments/RuleBuilder'
import AudiencePreview from '../components/segments/AudiencePreview'
import NLPQueryInput from '../components/ai/NLPQueryInput'

const Segments: React.FC = () => {
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMethod, setCreateMethod] = useState<'manual' | 'ai'>('manual')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    nlpQuery: ''
  })

  const { useSegments, useCreateSegment, useDeleteSegment } = useAPI()
  const { data, isLoading, error: segmentsError } = useSegments({ search })
  const createMutation = useCreateSegment()
  const deleteMutation = useDeleteSegment()
  const { rules, setRules, resetRules, isValidRules, getValidationErrors } = useRuleBuilder()

  // Validate rule structure before submission
  const validateRulesStructure = (rules: SegmentRules): boolean => {
    if (!rules) {
      toast.error('Rules are required for manual method')
      return false
    }

    if (!rules.operator || !['AND', 'OR'].includes(rules.operator)) {
      toast.error('Rule operator must be AND or OR')
      return false
    }

    if (!rules.conditions || !Array.isArray(rules.conditions) || rules.conditions.length === 0) {
      toast.error('At least one rule condition is required')
      return false
    }

    // Validate each condition
    for (let i = 0; i < rules.conditions.length; i++) {
      const condition = rules.conditions[i]
      if (!condition.field || !condition.operator || condition.value === undefined || condition.value === '') {
        toast.error(`Condition ${i + 1} is incomplete. Please fill all fields.`)
        return false
      }
    }

    // Limit conditions to prevent performance issues
    if (rules.conditions.length > 10) {
      toast.error('Maximum 10 conditions allowed per segment')
      return false
    }

    return true
  }

  const handleCreateSegment = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Segment name is required')
        return
      }

      if (!formData.description.trim()) {
        toast.error('Segment description is required')
        return
      }

      // Validate based on creation method
      if (createMethod === 'manual') {
        if (!validateRulesStructure(rules)) {
          return
        }
      } else if (createMethod === 'ai') {
        if (!formData.nlpQuery.trim() && !validateRulesStructure(rules)) {
          toast.error('Please enter a natural language query or build manual rules')
          return
        }
      }

      const payload: CreateSegmentRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      }

      if (createMethod === 'manual') {
        // Ensure rules have proper structure
        payload.rules = {
          operator: rules.operator || 'AND',
          conditions: rules.conditions || []
        }
      } else {
        if (formData.nlpQuery.trim()) {
          payload.nlpQuery = formData.nlpQuery.trim()
        } else {
          payload.rules = {
            operator: rules.operator || 'AND',
            conditions: rules.conditions || []
          }
        }
      }

      console.log('Creating segment with payload:', payload)

      await createMutation.mutateAsync(payload)
      toast.success('Segment created successfully!')
      setShowCreateModal(false)
      resetForm()
    } catch (error: any) {
      console.error('Segment creation error:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create segment'
      toast.error(errorMessage)
    }
  }

  const handleSegmentGenerated = (generatedData: any) => {
    console.log('AI Generated segment data:', generatedData)
    
    if (generatedData.rules) {
      setRules({
        operator: generatedData.rules.operator || 'AND',
        conditions: generatedData.rules.conditions || []
      })
    }
    
    if (generatedData.suggestedName && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: generatedData.suggestedName
      }))
    }
    
    if (generatedData.explanation && !formData.description) {
      setFormData(prev => ({
        ...prev,
        description: generatedData.explanation
      }))
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      nlpQuery: ''
    })
    resetRules()
    setCreateMethod('manual')
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this segment?')) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('Segment deleted successfully!')
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to delete segment')
      }
    }
  }

  const segments = data?.segments || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (segmentsError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading segments</div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Segments</h1>
          <p className="text-gray-600">Create targeted customer groups for personalized campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-primary-600 hover:bg-primary-700"
        >
          Create Segment
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search segments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Segments List */}
      {segments.length === 0 ? (
        <div className="text-center py-12">
          <Target className="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No segments found</h3>
          <p className="text-gray-500">
            {search ? 'No segments match your search criteria.' : 'Create your first customer segment to get started with targeted campaigns.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((segment: Segment) => (
            <div key={segment.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{segment.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{segment.description}</p>
                </div>
                <button
                  onClick={() => handleDelete(segment.id)}
                  className="text-red-400 hover:text-red-600 ml-2 p-1"
                  title="Delete segment"
                >
                  <Plus className="w-4 h-4 transform rotate-45" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="font-medium">{segment.audienceSize?.toLocaleString() || 0} customers</span>
                <span>{new Date(segment.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Segment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Create New Segment"
        size="xl"
      >
        <div className="space-y-6">
          {/* Method Selection */}
          <div className="flex space-x-4">
            <button
              onClick={() => setCreateMethod('manual')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                createMethod === 'manual'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Target className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">Manual Rules</div>
              <div className="text-sm text-gray-500">Build segment with conditions</div>
            </button>
            <button
              onClick={() => setCreateMethod('ai')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                createMethod === 'ai'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">AI Assistant</div>
              <div className="text-sm text-gray-500">Describe in natural language</div>
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name *
              </label>
              <Input
                placeholder="Enter segment name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                placeholder="Describe this segment"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          {/* Rule Builder or NLP Input */}
          {createMethod === 'manual' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segmentation Rules *
              </label>
              <RuleBuilder rules={rules} onChange={setRules} />
              {getValidationErrors().length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <ul className="list-disc list-inside">
                    {getValidationErrors().map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe Your Audience
              </label>
              <NLPQueryInput
                value={formData.nlpQuery}
                onChange={(value) => setFormData(prev => ({ ...prev, nlpQuery: value }))}
                onSegmentGenerated={handleSegmentGenerated}
                placeholder="e.g., Customers who spent more than $500 in the last 6 months"
              />
            </div>
          )}

// Segments.tsx

// ... inside the modal's JSX

{/* Audience Preview */}
{(isValidRules() || (createMethod === 'ai' && formData.nlpQuery)) && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Audience Preview
    </label>
    <AudiencePreview
      rules={rules}
      // Pass isValidRules() result
      isValidRules={isValidRules()}
      nlpQuery={createMethod === 'ai' ? formData.nlpQuery : undefined}
    />
  </div>
)}
          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSegment}
              disabled={
                !formData.name.trim() || 
                !formData.description.trim() || 
                createMutation.isPending ||
                (createMethod === 'manual' && !isValidRules()) ||
                (createMethod === 'ai' && !formData.nlpQuery.trim() && !isValidRules())
              }
              loading={createMutation.isPending}
            >
              Create Segment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Segments
