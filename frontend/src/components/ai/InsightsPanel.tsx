import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  campaignId?: string;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ campaignId }) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchInsights();
    }
  }, [campaignId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/campaigns/${campaignId}/insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setInsights(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!campaignId) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <p className="text-gray-600">Select a campaign to get AI-powered insights</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Brain className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
          <div className="h-4 bg-indigo-100 rounded w-1/2"></div>
          <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-800 flex items-center mb-3">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Key Insights
            </h4>
            <ul className="space-y-2">
              {insights.insights?.map((insight: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 flex items-center mb-3">
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {insights.recommendations?.map((rec: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 flex items-center mb-3">
              <Lightbulb className="w-4 h-4 mr-2 text-yellow-600" />
              Next Steps
            </h4>
            <ul className="space-y-2">
              {insights.nextSteps?.map((step: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InsightsPanel;
