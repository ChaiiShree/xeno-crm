import apiService from './api'

class AIService {
  async generateSegmentFromNLP(nlpQuery: string) {
    try {
      const response = await apiService.previewAudience({ nlpQuery })
      return response
    } catch (error) {
      console.error('AI segment generation error:', error)
      throw error
    }
  }

  async generateCampaignMessages(segmentId: number, campaignObjective: string) {
    try {
      const response = await apiService.generateAIMessages({
        segmentId,
        campaignObjective
      })
      return response.messages
    } catch (error) {
      console.error('AI message generation error:', error)
      throw error
    }
  }

  async getCampaignInsights(campaignId: number) {
    try {
      const response = await apiService.getCampaignInsights(campaignId)
      return response.insights
    } catch (error) {
      console.error('AI insights error:', error)
      throw error
    }
  }

  // Helper methods for AI suggestions
  getSampleNLPQueries() {
    return [
      'Customers who spent more than Rs.10,000',
      'People who haven\'t shopped in 3 months',
      'High value customers with more than 5 visits',
      'New customers who joined in the last month',
      'Inactive customers who spent over Rs.5,000',
      'Frequent buyers with more than 10 orders'
    ]
  }

  getCampaignObjectives() {
    return [
      'Win back inactive customers',
      'Increase repeat purchases',
      'Promote new product launch',
      'Reward loyal customers',
      'Reduce cart abandonment',
      'Seasonal sale promotion'
    ]
  }
}

export default new AIService()
