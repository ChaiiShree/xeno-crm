import React, { useState } from 'react';
import { Wand2, Loader } from 'lucide-react';
import Button from '../ui/Button';

interface NLPQueryInputProps {
  onSegmentGenerated: (segment: any) => void;
}

const NLPQueryInput: React.FC<NLPQueryInputProps> = ({ onSegmentGenerated }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ai/segments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ naturalLanguageQuery: query })
      });
      
      const result = await response.json();
      if (result.success) {
        onSegmentGenerated(result.data);
        setQuery('');
      }
    } catch (error) {
      console.error('Failed to generate segment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Wand2 className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Segmentation</h3>
      </div>
      
      <div className="space-y-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your target audience in natural language...
Example: 'Customers who spent more than ₹50,000 in the last 3 months but haven't ordered recently'"
          className="w-full p-4 border border-gray-200 rounded-lg resize-none h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        
        <Button
          onClick={handleGenerate}
          disabled={loading || !query.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Segment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NLPQueryInput;
