import React from 'react'
import { Users, Eye, RefreshCw } from 'lucide-react'
import { useAPI } from '../../hooks/useAPI'
import type { SegmentRules } from '../../types/segment'
import type { Customer } from '../../types/customer'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'

interface AudiencePreviewProps {
  rules: SegmentRules
  nlpQuery?: string // Add nlpQuery as an optional prop
  isValidRules: boolean
}

const AudiencePreview: React.FC<AudiencePreviewProps> = ({
  rules,
  nlpQuery, // Destructure the new prop
  isValidRules
}) => {
  const { usePreviewAudience } = useAPI()
  const previewMutation = usePreviewAudience()

  const handlePreview = () => {
    // The preview can be triggered by valid manual rules OR a valid NLP query
    if (isValidRules || (nlpQuery && nlpQuery.trim().length > 0)) {
      // Pass both rules and nlpQuery to the mutation
      previewMutation.mutate({ rules, nlpQuery })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Audience Preview</h3>
          </div>
          <Button
            onClick={handlePreview}
            disabled={!isValidRules || previewMutation.isPending}
            size="sm"
            leftIcon={previewMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          >
            {previewMutation.isPending ? 'Loading...' : 'Preview'}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {!isValidRules ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Complete the rules above to preview your audience</p>
          </div>
        ) : previewMutation.isPending ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 mt-4">Analyzing your audience...</p>
          </div>
        ) : previewMutation.isError ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-red-600 mb-2">Failed to load preview</p>
            <p className="text-sm text-gray-500">Please check your rules and try again</p>
          </div>
        ) : previewMutation.data ? (
          <div className="space-y-4">
            {/* Audience Size */}
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-600 font-medium">Estimated Audience Size</p>
                  <p className="text-2xl font-bold text-primary-900">
                    {previewMutation.data.audienceSize.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </div>

            {/* Sample Customers */}
            {previewMutation.data.sampleCustomers && previewMutation.data.sampleCustomers.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Sample Customers</h4>
                <div className="space-y-2">
                  {previewMutation.data.sampleCustomers.slice(0, 5).map((customer: Customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.totalSpend)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {customer.visitCount} visits
                          {customer.lastVisit && ` • ${formatDate(customer.lastVisit)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {previewMutation.data.sampleCustomers.length > 5 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Showing 5 of {previewMutation.data.sampleCustomers.length} sample customers
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Click "Preview" to see your audience</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AudiencePreview
