import React from 'react'
import { Mail, Users, TrendingUp, Clock, Send, AlertTriangle } from 'lucide-react'
import { useAPI } from '../../hooks/useAPI'
import StatsCard from '../dashboard/StatsCard'

const CampaignStats: React.FC = () => {
  const { useCampaignStats } = useAPI()
  const { data: stats, isLoading } = useCampaignStats()

  const successRate = parseFloat(stats?.successRate || '0')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Campaigns"
        value={stats?.totalCampaigns || 0}
        change={{
          value: stats?.campaignsLast7d || 0,
          type: 'increase',
          period: 'last 7 days'
        }}
        icon={Mail}
        color="blue"
        loading={isLoading}
      />
      
      <StatsCard
        title="Active Campaigns"
        value={stats?.activeCampaigns || 0}
        change={{
          value: stats?.completedCampaigns || 0,
          type: 'neutral',
          period: 'completed'
        }}
        icon={Send}
        color="green"
        loading={isLoading}
      />
      
      <StatsCard
        title="Messages Sent"
        value={stats?.totalMessagesSent || 0}
        change={{
          value: stats?.totalMessagesFailed || 0,
          type: 'decrease',
          period: 'failed'
        }}
        icon={Users}
        color="purple"
        loading={isLoading}
      />
      
      <StatsCard
        title="Success Rate"
        value={`${successRate.toFixed(1)}%`}
        change={{
          value: '2.4%',
          type: successRate >= 80 ? 'increase' : 'neutral',
          period: 'last month'
        }}
        icon={TrendingUp}
        color={successRate >= 80 ? 'green' : successRate >= 60 ? 'orange' : 'red'}
        loading={isLoading}
      />
    </div>
  )
}

export default CampaignStats
