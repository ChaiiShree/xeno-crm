// frontend/src/components/campaigns/CreateCampaign.tsx
import React, { useState } from 'react'
// FIX: Removed 'X' as it was not being used.
import { Target, Mail, Sparkles, Users } from 'lucide-react'
import { useAPI } from '../../hooks/useAPI'
// FIX: Import the Segment type to use for strong typing.
import type { Segment } from '../../types/segment'
import type { CreateCampaignRequest } from '../../types/campaign'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import MessageGenerator from '../ai/MessageGenerator'

interface CreateCampaignProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CreateCampaign: React.FC<CreateCampaignProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    segmentId: 0,
    name: '',
    message: '',
    useAI: false,
    campaignObjective: ''
  })

  const { useSegments, useCreateCampaign } = useAPI()
  const { data: segmentsData } = useSegments({ limit: 100 })
  const createMutation = useCreateCampaign()

  const segments = segmentsData?.segments || []

  const handleNext = () => {
    if (step === 1 && formData.segmentId && formData.name) {
      setStep(2)
    } else if (step === 2 && (formData.message || formData.useAI)) {
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    // The type for mutate is inferred from the useCreateCampaign hook,
    // which should be (payload: CreateCampaignRequest).
    createMutation.mutate(formData, {
      onSuccess: () => {
        onClose()
        setStep(1)
        setFormData({
          segmentId: 0,
          name: '',
          message: '',
          useAI: false,
          campaignObjective: ''
        })
        onSuccess?.()
      }
    })
  }

  const handleClose = () => {
    onClose()
    setStep(1)
    setFormData({
      segmentId: 0,
      name: '',
      message: '',
      useAI: false,
      campaignObjective: ''
    })
  }

  // FIX: Added explicit 'Segment' type for the parameter 's'.
  const selectedSegment = segments.find((s: Segment) => s.id === formData.segmentId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Campaign"
      size="lg"
    >
      <div className="p-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <Target className="w-4 h-4" />
            </div>
            <div className={`w-16 h-px ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <Mail className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Step 1: Basic Info & Segment */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
              
              <div className="space-y-4">
                <Input
                  label="Campaign Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Win-back Campaign for Inactive Customers"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Segment
                  </label>
                  <select
                    value={formData.segmentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, segmentId: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={0}>Select a segment</option>
                    {/* FIX: Added explicit 'Segment' type for the parameter 'segment'. */}
                    {segments.map((segment: Segment) => (
                      <option key={segment.id} value={segment.id}>
  {segment.name} ({(segment.audienceSize ?? 0).toLocaleString()} customers)
</option>
                    ))}
                  </select>
                </div>

                {selectedSegment && (
                  <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-primary-900">{selectedSegment.name}</h4>
                        <p className="text-sm text-primary-700">
  {(selectedSegment.audienceSize ?? 0).toLocaleString()} customers
</p>
                        {selectedSegment.description && (
                          <p className="text-sm text-primary-600 mt-1">{selectedSegment.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Message Creation */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Message</h3>
              
              <div className="flex items-center space-x-3 mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={formData.useAI}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    useAI: e.target.checked,
                    message: e.target.checked ? '' : prev.message
                  }))}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="useAI" className="flex items-center space-x-2 cursor-pointer">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Use AI to generate messages</span>
                </label>
              </div>

              {formData.useAI ? (
                <div className="space-y-4">
                  <Input
                    label="Campaign Objective"
                    value={formData.campaignObjective}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaignObjective: e.target.value }))}
                    placeholder="e.g., Win back inactive customers with a special offer"
                    helperText="Describe what you want to achieve with this campaign"
                  />
                  
                  <MessageGenerator
                    // The error indicates MessageGenerator doesn't accept 'segmentId'.
                    // The fix is in MessageGenerator.tsx itself. See the note below.
                    campaignObjective={formData.campaignObjective}
                    // FIX: Added explicit 'string' type for the parameter 'message'.
                    onMessageSelect={(message: string) => setFormData(prev => ({ ...prev, message }))}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Hi [NAME], we have something special for you..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Use [NAME] to personalize with customer names
                  </p>
                </div>
              )}

              {formData.message && (
                <div className="bg-gray-50 rounded-lg p-4 border mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Message Preview:</h4>
                  <p className="text-gray-700 text-sm">{formData.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
           {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
           <div className="flex-grow"></div>
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              loading={createMutation.isPending}
              disabled={
                (step === 1 && (!formData.segmentId || !formData.name)) ||
                (step === 2 && !formData.message && !(formData.useAI && formData.campaignObjective))
              }
            >
              {step === 1 ? 'Next' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default CreateCampaign