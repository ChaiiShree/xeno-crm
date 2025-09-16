import React, { useState } from 'react'
import { BarChart3, TrendingUp, Users, Mail, Calendar } from 'lucide-react'
import { useAPI } from '../hooks/useAPI'
import StatsCard from '../components/dashboard/StatsCard'
import InsightsPanel from '../components/ai/InsightsPanel'
import Button from '../components/ui/Button'

const Analytics: React.FC = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>()
  
  const { useCustomerStats, useCampaignStats, useSegmentStats, useCampaigns } = useAPI()
  
  const { data: customerStats, isLoading: customerLoading } = useCustomerStats()
  const { data: campaignStats, isLoading: campaignLoading } = useCampaignStats()
  const { data: segmentStats, isLoading: segmentLoading } = useSegmentStats()
  const { data: campaignsData } = useCampaigns()

  const campaigns = campaignsData?.campaigns || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-gray-600">Track your CRM performance and get AI-powered insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Customers"
          value={customerStats?.totalCustomers || 0}
          change={{
            value: customerStats?.activeCustomers30d || 0,
            type: 'increase',
            period: 'active (30d)'
          }}
          icon={Users}
          color="blue"
          loading={customerLoading}
        />

        <StatsCard
          title="Total Revenue"
          value={`Rs.${(customerStats?.totalRevenue || 0).toLocaleString()}`}
          change={{
            value: `Rs.${Math.round(customerStats?.avgSpendPerCustomer || 0).toLocaleString()}`,
            type: 'neutral',
            period: 'avg per customer'
          }}
          icon={TrendingUp}
          color="green"
          loading={customerLoading}
        />

        <StatsCard
          title="Campaign Success"
          value={`${campaignStats?.successRate || 0}%`}
          change={{
            value: campaignStats?.totalMessagesSent || 0,
            type: 'increase',
            period: 'messages sent'
          }}
          icon={Mail}
          color="purple"
          loading={campaignLoading}
        />

        <StatsCard
          title="Segments Created"
          value={segmentStats?.totalSegments || 0}
          change={{
            value: Math.round(segmentStats?.avgAudienceSize || 0),
            type: 'neutral',
            period: 'avg size'
          }}
          icon={BarChart3}
          color="orange"
          loading={segmentLoading}
        />
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">7d</Button>
              <Button variant="secondary" size="sm">30d</Button>
              <Button variant="ghost" size="sm">90d</Button>
            </div>
          </div>

          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Performance chart</p>
              <p className="text-sm text-gray-400">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Customer Segmentation Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Segmentation</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-900">High Value (Rs.10K+)</span>
              <span className="text-blue-700">
                {Math.round((customerStats?.payingCustomers || 0) * 0.15).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-900">Regular (Rs.5K-Rs.10K)</span>
              <span className="text-green-700">
                {Math.round((customerStats?.payingCustomers || 0) * 0.35).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="font-medium text-yellow-900">New (&lt; Rs.5K)</span>
              <span className="text-yellow-700">
                {Math.round((customerStats?.payingCustomers || 0) * 0.5).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">AI Campaign Insights</h3>
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => setSelectedCampaignId(e.target.value || undefined)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign: any) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
          <InsightsPanel campaignId={selectedCampaignId} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Button variant="ghost" size="sm">View all</Button>
          </div>

          <div className="space-y-4">
            {[
              {
                action: 'Campaign "Win-back Inactive" completed',
                time: '2 hours ago',
                stats: '1,247 sent • 89% success rate'
              },
              {
                action: 'New segment "High Value Q4" created',
                time: '4 hours ago',
                stats: '342 customers matched'
              },
              {
                action: 'Bulk customer import completed',
                time: '1 day ago',
                stats: '2,156 customers added'
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.stats}</p>
                </div>
                <div className="text-sm text-gray-500 flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
