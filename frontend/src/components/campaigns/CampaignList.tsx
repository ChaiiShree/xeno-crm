import React, { useState } from 'react'
import { Search, Filter, Plus, Mail } from 'lucide-react'
import { useAPI } from '../../hooks/useAPI'
import type { Campaign } from '../../types/campaign'
import CampaignCard from './CampaignCard'
import Button from '../ui/Button'
import Input from '../ui/Input'
import LoadingSpinner from '../ui/LoadingSpinner'

interface CampaignListProps {
  onCreateNew?: () => void
  onViewCampaign?: (id: number) => void
}

const CampaignList: React.FC<CampaignListProps> = ({
  onCreateNew,
  onViewCampaign
}) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { useCampaigns, useLaunchCampaign } = useAPI()
  const launchMutation = useLaunchCampaign()

  const { data, isLoading } = useCampaigns({
    page,
    limit: 12,
    search,
    status: statusFilter || undefined
  })

  const handleLaunch = (campaignId: number) => {
    launchMutation.mutate(campaignId)
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' }
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const campaigns = data?.campaigns || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center space-x-4 max-w-2xl">
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {onCreateNew && (
          <Button
            onClick={onCreateNew}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Campaign
          </Button>
        )}
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
          <p className="text-gray-500 mb-6">
            {search || statusFilter 
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first email campaign.'
            }
          </p>
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign: Campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onLaunch={handleLaunch}
              onView={onViewCampaign}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default CampaignList
