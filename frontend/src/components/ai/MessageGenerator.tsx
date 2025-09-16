import React, { useState } from 'react';
import { MessageSquare, Copy, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface MessageGeneratorProps {
  campaignType: string;
  audience: any;
  onMessageGenerated: (message: any) => void;
}

const MessageGenerator: React.FC<MessageGeneratorProps> = ({
  campaignType,
  audience,
  onMessageGenerated
}) => {
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<any>(null);

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'casual', label: 'Casual' }
  ];

  const generateMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/messages/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ campaignType, audience, tone })
      });
      
      const result = await response.json();
      if (result.success) {
        setGeneratedMessage(result.data);
        onMessageGenerated(result.data);
      }
    } catch (error) {
      console.error('Failed to generate message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
          AI Message Generator
        </h3>
        
        <div className="flex items-center space-x-2">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {tones.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          
          <Button
            onClick={generateMessage}
            disabled={loading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </div>

      {generatedMessage && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Subject Line</label>
            <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
              {generatedMessage.subject}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <div className="mt-1 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
              {generatedMessage.message}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Call to Action</label>
            <div className="mt-1 p-3 bg-blue-50 rounded border text-sm font-medium text-blue-800">
              {generatedMessage.cta}
            </div>
          </div>
          
          <Button
            onClick={() => navigator.clipboard.writeText(
              `Subject: ${generatedMessage.subject}\n\n${generatedMessage.message}\n\nCTA: ${generatedMessage.cta}`
            )}
            variant="ghost"
            size="sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy All
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessageGenerator;
