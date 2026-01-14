import React, { useState } from 'react';
import { extractContent, extractFromUrl, createIdea } from '../api';

function ContentExtractor({ pillars, onIdeasCreated }) {
  const [inputType, setInputType] = useState('text'); // 'text' or 'url'
  const [sourceType, setSourceType] = useState('transcript'); // transcript, article, podcast
  const [inputText, setInputText] = useState('');
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedInsights, setSelectedInsights] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractedData(null);
    setSelectedInsights([]);

    try {
      let response;
      if (inputType === 'url') {
        response = await extractFromUrl(url);
      } else {
        response = await extractContent(inputText, sourceType);
      }
      setExtractedData(response.data);
    } catch (error) {
      console.error('Error extracting content:', error);
      alert('Failed to extract content. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleInsightSelection = (index) => {
    setSelectedInsights(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSaveAsIdeas = async () => {
    if (selectedInsights.length === 0) {
      alert('Please select at least one insight to save');
      return;
    }

    setIsSaving(true);
    try {
      const insightsToSave = selectedInsights.map(i => extractedData.key_insights[i]);

      for (const insight of insightsToSave) {
        await createIdea({
          raw_input: `${insight.insight}\n\nContext: ${insight.context}\n\nAngle: ${insight.post_angle}`,
          source: inputType === 'url' ? url : `Extracted from ${sourceType}`
        });
      }

      alert(`${insightsToSave.length} idea(s) saved successfully!`);
      setSelectedInsights([]);
      if (onIdeasCreated) onIdeasCreated();
    } catch (error) {
      console.error('Error saving ideas:', error);
      alert('Failed to save ideas. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const PILLAR_INFO = {
    A: { name: 'Offsites as Infrastructure', color: 'bg-blue-100 text-blue-800' },
    B: { name: 'What Actually Breaks', color: 'bg-red-100 text-red-800' },
    C: { name: 'Proof > Promises', color: 'bg-green-100 text-green-800' },
    D: { name: 'Founder POV', color: 'bg-purple-100 text-purple-800' },
    E: { name: 'Category Education', color: 'bg-yellow-100 text-yellow-800' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Content Extractor</h2>
        <p className="text-sm text-gray-500">
          Drop in podcasts, articles, or transcripts to extract key insights for LinkedIn posts
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Input Type Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setInputType('text')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              inputType === 'text'
                ? 'bg-linkedin-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setInputType('url')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              inputType === 'url'
                ? 'bg-linkedin-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Enter URL
          </button>
        </div>

        {inputType === 'text' ? (
          <>
            {/* Source Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <div className="flex space-x-2">
                {[
                  { id: 'transcript', label: 'Transcript', icon: '🎙️' },
                  { id: 'article', label: 'Article', icon: '📄' },
                  { id: 'podcast', label: 'Podcast Notes', icon: '🎧' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSourceType(type.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      sourceType === type.id
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Content
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your transcript, article, or podcast notes here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent text-sm resize-none"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {inputText.length} characters
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article or Video URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article or https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supports articles, blog posts, and YouTube videos
            </p>
          </div>
        )}

        {/* Extract Button */}
        <button
          onClick={handleExtract}
          disabled={isExtracting || (inputType === 'text' ? !inputText.trim() : !url.trim())}
          className="w-full py-3 bg-linkedin-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isExtracting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Extracting Insights...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Extract Key Insights</span>
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {extractedData && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">{extractedData.main_theme}</h3>
                <p className="text-sm text-gray-600">Main Theme</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{extractedData.relevance_score}/10</div>
                <p className="text-sm text-gray-600">Relevance Score</p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Key Insights ({extractedData.key_insights?.length || 0})
              </h3>
              {selectedInsights.length > 0 && (
                <button
                  onClick={handleSaveAsIdeas}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save {selectedInsights.length} as Ideas</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-4 space-y-4">
              {extractedData.key_insights?.map((insight, index) => (
                <div
                  key={index}
                  onClick={() => toggleInsightSelection(index)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedInsights.includes(index)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{insight.insight}</p>
                      <p className="text-sm text-gray-600 mt-2 italic">"{insight.context}"</p>
                      <p className="text-sm text-blue-600 mt-2">
                        <span className="font-medium">Post Angle:</span> {insight.post_angle}
                      </p>

                      {/* Suggested Pillar */}
                      {insight.suggested_pillar && PILLAR_INFO[insight.suggested_pillar] && (
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${PILLAR_INFO[insight.suggested_pillar].color}`}>
                          Pillar {insight.suggested_pillar}: {PILLAR_INFO[insight.suggested_pillar].name}
                        </span>
                      )}

                      {/* Hook Ideas */}
                      {insight.hook_ideas && insight.hook_ideas.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Hook Ideas:</p>
                          <div className="space-y-1">
                            {insight.hook_ideas.map((hook, i) => (
                              <p key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                "{hook}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 ${
                      selectedInsights.includes(index)
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedInsights.includes(index) && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotable Moments */}
          {extractedData.quotable_moments && extractedData.quotable_moments.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Quotable Moments</h3>
              </div>
              <div className="p-4 space-y-3">
                {extractedData.quotable_moments.map((quote, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border-l-4 border-linkedin-blue"
                  >
                    <p className="text-sm text-gray-700 italic">"{quote}"</p>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(quote);
                        alert('Quote copied to clipboard!');
                      }}
                      className="mt-2 text-xs text-linkedin-blue hover:underline"
                    >
                      Copy Quote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContentExtractor;
