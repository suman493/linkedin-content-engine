import React, { useState, useEffect } from 'react';
import { generatePost, getSimilarPosts } from '../api';

const PILLAR_NAMES = {
  A: 'Offsites as Infrastructure',
  B: 'What Actually Breaks',
  C: 'Proof > Promises',
  D: 'Founder POV',
  E: 'Category Education',
};

const PILLAR_COLORS = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-red-100 text-red-800',
  C: 'bg-green-100 text-green-800',
  D: 'bg-purple-100 text-purple-800',
  E: 'bg-yellow-100 text-yellow-800',
};

const FORMATS = ['Text Only', 'Text + Image', 'Carousel'];

function PostGenerator({ selectedIdeas, pillars, onPostGenerated, onClearSelection }) {
  const [selectedPillar, setSelectedPillar] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Text Only');
  const [isGenerating, setIsGenerating] = useState(false);
  const [similarPosts, setSimilarPosts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auto-select pillar based on selected ideas
    if (selectedIdeas.length > 0) {
      const pillarCounts = {};
      selectedIdeas.forEach((idea) => {
        if (idea.pillar) {
          pillarCounts[idea.pillar] = (pillarCounts[idea.pillar] || 0) + 1;
        }
      });
      const topPillar = Object.keys(pillarCounts).sort(
        (a, b) => pillarCounts[b] - pillarCounts[a]
      )[0];
      if (topPillar) {
        setSelectedPillar(topPillar);
      }
    }
  }, [selectedIdeas]);

  useEffect(() => {
    // Load similar posts when pillar changes
    if (selectedPillar) {
      loadSimilarPosts(selectedPillar);
    }
  }, [selectedPillar]);

  const loadSimilarPosts = async (pillar) => {
    try {
      const response = await getSimilarPosts(pillar);
      setSimilarPosts(response.data);
    } catch (error) {
      console.error('Error loading similar posts:', error);
    }
  };

  const handleGenerate = async () => {
    if (selectedIdeas.length === 0) {
      setError('Please select at least one idea');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generatePost({
        idea_ids: selectedIdeas.map((i) => i.id),
        format: selectedFormat,
        pillar: selectedPillar,
      });
      onPostGenerated(response.data);
    } catch (err) {
      console.error('Error generating post:', err);
      setError('Failed to generate post. Make sure the backend is running and API key is set.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Generation Panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Generate Post</h2>
            <p className="text-sm text-gray-500">
              Create a LinkedIn post from your selected ideas
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Selected Ideas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Ideas ({selectedIdeas.length})
              </label>
              {selectedIdeas.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-sm">
                  No ideas selected. Go to the Ideas tab to select ideas.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="p-3 bg-gray-50 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{idea.raw_input}</p>
                        {idea.pillar && (
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${PILLAR_COLORS[idea.pillar]}`}>
                            {idea.pillar}: {PILLAR_NAMES[idea.pillar]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedIdeas.length > 0 && (
                <button
                  onClick={onClearSelection}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Pillar Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Pillar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(PILLAR_NAMES).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPillar(key)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      selectedPillar === key
                        ? `${PILLAR_COLORS[key]} ring-2 ring-offset-2 ring-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-xs mt-1 truncate">{name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Format
              </label>
              <div className="flex space-x-2">
                {FORMATS.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedFormat === format
                        ? 'bg-linkedin-blue text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={handleGenerate}
                disabled={selectedIdeas.length === 0 || isGenerating}
                className="w-full py-3 bg-linkedin-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating with Claude...
                  </span>
                ) : (
                  'Generate Post'
                )}
              </button>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar Posts Sidebar */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Top Performing Posts</h3>
            <p className="text-xs text-gray-500">
              {selectedPillar ? `${selectedPillar}: ${PILLAR_NAMES[selectedPillar]}` : 'Select a pillar'}
            </p>
          </div>
          <div className="p-4">
            {similarPosts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Select a pillar to see similar top-performing posts
              </p>
            ) : (
              <div className="space-y-4">
                {similarPosts.map((post) => (
                  <div key={post.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {post.topic}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>{post.impressions} impressions</span>
                      <span>{post.reactions} reactions</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {post.format} | {post.date}
                    </div>
                    {post.top_performer && (
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Top Performer
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Writing Style Reminders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Writing Style</h3>
          </div>
          <div className="p-4 text-sm text-gray-600 space-y-2">
            <div className="flex items-start">
              <span className="text-green-500 mr-2">+</span>
              <span>Use arrows for bullets</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">+</span>
              <span>Short paragraphs (1-2 sentences)</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">+</span>
              <span>Personal hook opening</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">+</span>
              <span>Punchy insight ending</span>
            </div>
            <div className="flex items-start">
              <span className="text-red-500 mr-2">-</span>
              <span>No buzzwords</span>
            </div>
            <div className="flex items-start">
              <span className="text-red-500 mr-2">-</span>
              <span>No passive voice</span>
            </div>
            <div className="flex items-start">
              <span className="text-red-500 mr-2">-</span>
              <span>No CTAs at the end</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostGenerator;
