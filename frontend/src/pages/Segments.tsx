import React, { useState } from 'react'
import { Plus, Search, Target, Sparkles } from 'lucide-react'
import { useAPI } from '../hooks/useAPI'
import { useRuleBuilder } from '../hooks/useRuleBuilder'
import type { CreateSegmentRequest, Segment, SegmentRules, RuleCondition } from '../types/segment'
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
  const { data, isLoading } = useSegments({ search })
  const createMutation = useCreateSegment()
  const deleteMutation = useDeleteSegment()
  const { rules, setRules, resetRules, isValidRules } = useRuleBuilder()

  // FIX: Ensure proper rule validation and structure
  const handleCreateSegment = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Segment name is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Segment description is required');
      return;
    }

    // Validate rules structure for backend
    if (!isValidRules()) {
      toast.error('Please provide valid segmentation rules');
      return;
    }

    // Ensure rules have the correct structure expected by backend
    const validatedRules = {
      operator: rules.operator || 'AND',
      conditions: rules.conditions || []
    };

    // Ensure conditions array is not empty
    if (validatedRules.conditions.length === 0) {
      toast.error('At least one condition is required');
      return;
    }

    const payload: CreateSegmentRequest = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      rules: validatedRules
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setShowCreateModal(false)
        resetForm()
      },
      onError: (error: any) => {
        console.error('Segment creation failed:', error);
        toast.error(error.response?.data?.error || 'Failed to create segment');
      }
    })
  }

  // FIX: Proper handling of AI-generated segments
  const handleSegmentGenerated = (segment: {
    conditions: RuleCondition[];
    suggestedName?: string;
    explanation?: string;
  }) => {
    console.log('Generated segment:', segment);
    
    // Ensure conditions are properly structured
    const validConditions = segment.conditions || [];
    
    setRules({
      operator: 'AND',
      conditions: validConditions
    });
    
    setFormData(prev => ({
      ...prev,
      name: prev.name || segment.suggestedName || 'AI Generated Segment',
      description: prev.description || segment.explanation || ''
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      nlpQuery: ''
    })
    resetRules()
    setCreateMethod('manual')
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this segment?')) {
      deleteMutation.mutate(id)
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
            <div key={segment.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{segment.description}</p>
                </div>
                <button
                  onClick={() => handleDelete(segment.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Plus className="w-4 h-4 transform rotate-45" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{segment.audienceSize?.toLocaleString()} customers</span>
                <span>{new Date(segment.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Segment Modal */}
      <Modal
        open={showCreateModal}
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
              <Target className="w-6 h-6 mx-auto mb-2" />
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
              <Sparkles className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">AI Assistant</div>
              <div className="text-sm text-gray-500">Describe in natural language</div>
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name
              </label>
              <Input
                placeholder="Enter segment name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Describe this segment"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </div>

          {/* Rule Builder or NLP Input */}
          {createMethod === 'manual' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segmentation Rules
              </label>
              <RuleBuilder rules={rules} onChange={setRules} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe Your Audience
              </label>
              <NLPQueryInput
                onSegmentGenerated={handleSegmentGenerated}
                placeholder="e.g., Customers who spent more than $500 in the last 6 months"
              />
            </div>
          )}

          {/* Audience Preview */}
          {isValidRules() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audience Preview
              </label>
              <AudiencePreview rules={rules} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSegment}
              disabled={!formData.name || !formData.description || !isValidRules() || createMutation.isPending}
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
