import React from 'react';
import { Calendar, Users, TrendingUp, Mail, MoreVertical, Play, Pause, Eye } from 'lucide-react';
import type { Campaign } from '../../types/campaign';
import { cn } from '../../utils/helpers';
import Button from '../ui/Button';

interface CampaignCardProps {
  campaign: Campaign;
  onLaunch?: (id: number) => void;
  onView?: (id: number) => void;
  onPause?: (id: number) => void;
  className?: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onLaunch,
  onView,
  onPause,
  className,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Robust null/undefined checking for counts
  const sentCount = campaign.sentCount ?? 0;
  const failedCount = campaign.failedCount ?? 0;
  const totalMessages = sentCount + failedCount;
  const successRate =
    totalMessages > 0 ? ((sentCount / totalMessages) * 100).toFixed(1) : '0.0';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 truncate" title={campaign.name}>
                {campaign.name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {campaign.segment?.name || campaign.segment_name || 'No segment'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full border',
              getStatusColor(campaign.status)
            )}
          >
            {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1)}
          </span>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Message Preview */}
      <div className="mb-4 flex-grow">
        <p className="text-sm text-gray-700 line-clamp-2">{campaign.message}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            <span>Audience</span>
          </div>
          <div className="font-semibold text-gray-900">
            {(campaign.segment?.audienceSize ??
              campaign.audience_size ??
              0
            ).toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <Mail className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <div className="font-semibold text-gray-900">{sentCount.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Success</span>
          </div>
          <div className="font-semibold text-gray-900">{successRate}%</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(campaign.createdAt)}</span>
        </div>
        <div className="flex items-center space-x-2">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(campaign.id)}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              View
            </Button>
          )}
          {campaign.status === 'draft' && onLaunch && (
            <Button
              size="sm"
              onClick={() => onLaunch(campaign.id)}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Launch
            </Button>
          )}
          {campaign.status === 'active' && onPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause(campaign.id)}
              leftIcon={<Pause className="w-4 h-4" />}
            >
              Pause
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
