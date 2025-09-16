export interface Campaign {
  id: number
  segmentId: number
  name: string
  message: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  createdBy: number
  sentCount: number
  failedCount: number
  successRate: string
  createdAt: string
  updatedAt: string
  segment?: {
    name: string
    audienceSize: number
  }
  creator?: {
    name: string
    email: string
  }
}

export interface CreateCampaignRequest {
  segmentId: number
  name: string
  message?: string
  useAI?: boolean
  campaignObjective?: string
}

export interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  draftCampaigns: number
  totalMessagesSent: number
  totalMessagesFailed: number
  successRate: string
  campaignsLast7d: number
  recentCampaigns: Array<{
    name: string
    status: string
    sentCount: number
    failedCount: number
    createdAt: string
    segment: {
      name: string
      audienceSize: number
    }
  }>
}

export interface CampaignInsights {
  summary: string
  insights: string[]
  recommendations: string[]
  performance_score: number
}

export interface DeliveryStats {
  pending: number
  sent: number
  failed: number
  delivered: number
  totalMessages: number
  successRate: string
  avgDeliveryTime?: number
}
