// frontend/src/pages/Segments.tsx
import React, { useState } from 'react'
import { Plus, Search, Target, Sparkles } from 'lucide-react'
import { useAPI } from '../hooks/useAPI'
import { useRuleBuilder } from '../hooks/useRuleBuilder'
// FIX: Import SegmentRules type to use it for state.
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
    // FIX: rules property is part of the form state, but not used here.
    // The rules state is managed by the useRuleBuilder hook directly.
    nlpQuery: ''
  })

  const { useSegments, useCreateSegment, useDeleteSegment } = useAPI()
  const { data, isLoading } = useSegments({ search })
  const createMutation = useCreateSegment()
  const deleteMutation = useDeleteSegment()

  const {
    rules,
    setRules,
    resetRules,
    isValidRules // FIX: Get isValidRules from the hook to pass it down.
  } = useRuleBuilder()

  const handleCreateSegment = () => {
    const payload: CreateSegmentRequest = {
      name: formData.name,
      description: formData.description
    }

    if (createMethod === 'manual') {
      payload.rules = rules
    } else {
      payload.nlpQuery = formData.nlpQuery
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setShowCreateModal(false)
        resetForm()
      }
    })
  }

  // FIX: Added explicit types for the 'segment' parameter.
  const handleSegmentGenerated = (segment: {
    conditions: SegmentRules;
    suggestedName?: string;
    explanation?: string;
  }) => {
    console.log('Generated segment:', segment)
    setRules(segment.conditions || { operator: 'AND', conditions: [] })
    setFormData(prev => ({ 
      ...prev, 
      name: prev.name || segment.suggestedName || 'AI Generated Segment',
      description: prev.description || segment.explanation || ''
    }))
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

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this segment?')) {
      deleteMutation.mutate(id)
    }
  }

  const segments = data?.segments || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Segments</h1>
          <p className="text-gray-600">Create targeted customer groups for personalized campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus />}
          className="bg-primary-600 hover:bg-primary-700"
        >
          Create Segment
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search segments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search />}
      />

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No segments found</h3>
            <p className="text-gray-600 mb-6">
              {search
                ? 'No segments match your search criteria.'
                : 'Create your first customer segment to get started with targeted campaigns.'
              }
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus />}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Create Segment
            </Button>
          </div>
        ) : (
          segments.map((segment: Segment) => (
            <div key={segment.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-primary-600">
                  {segment.audienceSize.toLocaleString()}
                </div>
                <span className="text-sm text-gray-500">customers</span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{segment.name}</h3>
              
              {segment.description && (
                <p className="text-gray-600 text-sm mb-4">{segment.description}</p>
              )}
              
              <div className="text-xs text-gray-500 mb-4">
                Created {new Date(segment.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(segment.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Segment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Create New Segment"
        size="2xl" // FIX: Increased modal size for better layout
      >
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segment Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High Value Customers"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this customer segment..."
              />
            </div>
          </div>


          {/* Method Selection */}
          <div className="bg-gray-50 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setCreateMethod('manual')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                createMethod === 'manual'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Manual Rules
            </button>
            <button
              onClick={() => setCreateMethod('ai')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-2 ${
                createMethod === 'ai'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
          </div>

          {/* Rule Builder or NLP Input */}
          {createMethod === 'manual' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RuleBuilder
                // FIX: Prop name changed from 'rules' to 'initialRules' to match the component's definition.
                initialRules={rules}
                onChange={setRules}
              />
              <AudiencePreview
                rules={rules}
                // FIX: The 'isValidRules' prop was missing. We get it from the hook and pass it as a boolean.
                isValidRules={isValidRules()}
              />
            </div>
          ) : (
            <NLPQueryInput
              onSegmentGenerated={handleSegmentGenerated}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSegment}
              // FIX: Simplified the disabled logic.
              disabled={!formData.name || (createMethod === 'manual' && !isValidRules())}
              loading={createMutation.isPending}
              className="bg-primary-600 hover:bg-primary-700"
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