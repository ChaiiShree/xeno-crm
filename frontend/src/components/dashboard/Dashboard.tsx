import React from 'react'
import { Users, Mail, Target, TrendingUp, Plus, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAPI } from '../../hooks/useAPI'
import StatsCard from './StatsCard'
import RecentCampaigns from './RecentCampaigns'
import Button from '../ui/Button'

const Dashboard: React.FC = () => {
  const { useCustomerStats, useCampaignStats, useSegmentStats } = useAPI()
  
  const { data: customerStats, isLoading: customerLoading } = useCustomerStats()
  const { data: campaignStats, isLoading: campaignLoading } = useCampaignStats()
  const { data: segmentStats, isLoading: segmentLoading } = useSegmentStats()

  const quickActions = [
    {
      title: 'Create Segment',
      description: 'Build targeted customer segments',
      href: '/segments',
      icon: Target,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'New Campaign',
      description: 'Launch personalized campaigns',
      href: '/campaigns',
      icon: Mail,
      color: 'bg-blue-600 hover:bg-blue-700'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your customers.</p>
        </div>
        <div className="flex items-center space-x-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} to={action.href}>
                <Button
                  className={`${action.color} text-white`}
                  leftIcon={<Icon className="w-4 h-4" />}
                >
                  {action.title}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Customers"
          value={customerStats?.totalCustomers || 0}
          change={{
            value: customerStats?.activeCustomers7d || 0,
            type: 'increase',
            period: 'last 7 days'
          }}
          icon={Users}
          color="blue"
          loading={customerLoading}
        />
        
        <StatsCard
          title="Active Campaigns"
          value={campaignStats?.activeCampaigns || 0}
          change={{
            value: campaignStats?.campaignsLast7d || 0,
            type: 'increase',
            period: 'last 7 days'
          }}
          icon={Mail}
          color="green"
          loading={campaignLoading}
        />
        
        <StatsCard
          title="Total Segments"
          value={segmentStats?.totalSegments || 0}
          change={{
            value: segmentStats?.segmentsLast7d || 0,
            type: 'increase',
            period: 'last 7 days'
          }}
          icon={Target}
          color="purple"
          loading={segmentLoading}
        />
        
        <StatsCard
          title="Success Rate"
          value={`${campaignStats?.successRate || 0}%`}
          change={{
            value: '2.4%',
            type: 'increase',
            period: 'last month'
          }}
          icon={TrendingUp}
          color="orange"
          loading={campaignLoading}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <RecentCampaigns />
        </div>

        {/* Quick Actions & AI Insights */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  Your high-value customers (Rs.10K+ spend) have a <strong>95% delivery rate</strong> - consider targeting similar segments.
                </p>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>127 customers</strong> haven't purchased in 90 days but have high lifetime value. Perfect for win-back campaigns.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="font-semibold text-gray-900">
                  Rs.{(customerStats?.totalRevenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg. Spend per Customer</span>
                <span className="font-semibold text-gray-900">
                  Rs.{Math.round(customerStats?.avgSpendPerCustomer || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active (30 days)</span>
                <span className="font-semibold text-gray-900">
                  {(customerStats?.activeCustomers30d || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Paying Customers</span>
                <span className="font-semibold text-gray-900">
                  {(customerStats?.payingCustomers || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">7 days</Button>
            <Button variant="ghost" size="sm">30 days</Button>
            <Button variant="secondary" size="sm">90 days</Button>
          </div>
        </div>
        
        {/* Chart placeholder */}
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Campaign performance chart</p>
            <p className="text-sm text-gray-400">Visual analytics coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
