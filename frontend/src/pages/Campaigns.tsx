import React, { useState } from 'react'
import { Plus, MessageSquare, Sparkles } from 'lucide-react'
import { useAPI } from '../hooks/useAPI'
import CampaignList from '../components/campaigns/CampaignList'
import CampaignStats from '../components/campaigns/CampaignStats'
import CreateCampaign from '../components/campaigns/CreateCampaign'
import MessageGenerator from '../components/ai/MessageGenerator'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const Campaigns: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMessageGenerator, setShowMessageGenerator] = useState(false)
  const [selectedCampaignData, setSelectedCampaignData] = useState<any>(null)
  
  const { useSegments } = useAPI()
  const { data: segmentsData } = useSegments()
  
  const segments = segmentsData?.segments || []

  const handleMessageGenerated = (message: any) => {
    console.log('Generated message:', message)
    // You can pass this message back to the CreateCampaign component
    // or handle it however you need for your campaign creation flow
  }

  const handleUseAIMessages = (campaignType: string, targetSegment: any) => {
    setSelectedCampaignData({ campaignType, audience: targetSegment })
    setShowMessageGenerator(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-600">Create and manage your email marketing campaigns</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowMessageGenerator(true)}
            variant="outline"
            leftIcon={<Sparkles />}
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            AI Message Generator
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus />}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Stats */}
      <CampaignStats />

      {/* Campaign List */}
      <CampaignList onUseAIMessages={handleUseAIMessages} />

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Campaign"
        size="xl"
      >
        <CreateCampaign 
          onClose={() => setShowCreateModal(false)}
          onUseAIMessages={handleUseAIMessages}
        />
      </Modal>

      {/* AI Message Generator Modal */}
      <Modal
        isOpen={showMessageGenerator}
        onClose={() => {
          setShowMessageGenerator(false)
          setSelectedCampaignData(null)
        }}
        title="AI Message Generator"
        size="xl"
      >
        <div className="space-y-6">
          {!selectedCampaignData ? (
            // Campaign Type and Audience Selection
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Type
                </label>
                <select
                  onChange={(e) => setSelectedCampaignData(prev => ({ 
                    ...prev, 
                    campaignType: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select campaign type</option>
                  <option value="promotional">Promotional</option>
                  <option value="winback">Win-back</option>
                  <option value="welcome">Welcome Series</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  onChange={(e) => {
                    const segment = segments.find(s => s.id === parseInt(e.target.value))
                    setSelectedCampaignData(prev => ({ 
                      ...prev, 
                      audience: segment 
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select target segment</option>
                  {segments.map((segment: any) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} ({segment.audienceSize.toLocaleString()} customers)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (selectedCampaignData?.campaignType && selectedCampaignData?.audience) {
                      // Keep the current state to show the MessageGenerator
                    }
                  }}
                  disabled={!selectedCampaignData?.campaignType || !selectedCampaignData?.audience}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Generate Messages
                </Button>
              </div>
            </div>
          ) : (
            // Message Generator Component
            <MessageGenerator
              campaignType={selectedCampaignData.campaignType}
              audience={selectedCampaignData.audience}
              onMessageGenerated={handleMessageGenerated}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}

export default Campaigns
