import React, { useState, useEffect } from 'react';
import { createIdea, getMobileSetup } from '../api';

const PILLAR_NAMES = {
  A: 'Offsites as Infrastructure',
  B: 'What Actually Breaks',
  C: 'Proof > Promises',
  D: 'Founder POV',
  E: 'Category Education',
};

const PILLAR_COLORS = {
  A: 'bg-blue-100 text-blue-800 border-blue-300',
  B: 'bg-red-100 text-red-800 border-red-300',
  C: 'bg-green-100 text-green-800 border-green-300',
  D: 'bg-purple-100 text-purple-800 border-purple-300',
  E: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

function IdeaCapture({ pillars, onIdeaCreated }) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [error, setError] = useState(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [mobileSetup, setMobileSetup] = useState(null);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  useEffect(() => {
    if (showIntegrations && !mobileSetup) {
      getMobileSetup().then(res => setMobileSetup(res.data)).catch(console.error);
    }
  }, [showIntegrations, mobileSetup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createIdea({
        raw_input: input.trim(),
        source: 'text',
      });
      setLastCreated(response.data);
      setInput('');
      onIdeaCreated && onIdeaCreated(response.data);
    } catch (err) {
      console.error('Error creating idea:', err);
      setError('Failed to save idea. Make sure the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Capture Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Capture an Idea</h2>
          <p className="text-sm text-gray-500">
            Write your idea and it will be auto-categorized into a content pillar
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your mind? Share an observation, insight, or story idea..."
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {input.length} characters
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="px-6 py-2 bg-linkedin-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Categorizing...' : 'Save & Categorize'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Last Created Idea */}
      {lastCreated && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Idea Saved!</h3>
              <button
                onClick={() => setLastCreated(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">{lastCreated.raw_input}</p>
            {lastCreated.pillar && (
              <div className="flex items-center space-x-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${PILLAR_COLORS[lastCreated.pillar]}`}
                >
                  Pillar {lastCreated.pillar}: {PILLAR_NAMES[lastCreated.pillar]}
                </span>
                {lastCreated.pillar_confidence && (
                  <span className="text-sm text-gray-500">
                    {Math.round(lastCreated.pillar_confidence * 100)}% confidence
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile & Integrations */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Capture Ideas Anywhere</h3>
              <p className="text-sm text-gray-500">Set up mobile, Slack, or SMS capture</p>
            </div>
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className="px-4 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{showIntegrations ? 'Hide Setup' : 'Set Up Mobile'}</span>
            </button>
          </div>
        </div>

        {showIntegrations && mobileSetup && (
          <div className="p-6 space-y-6">
            {/* iOS Shortcut */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">iOS Shortcut</h4>
                  <p className="text-sm text-gray-500">Capture ideas from your iPhone home screen</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {mobileSetup.ios_shortcut.instructions.map((step, i) => (
                  <p key={i} className="text-gray-600">{step}</p>
                ))}
              </div>
            </div>

            {/* Slack Integration */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Slack Integration</h4>
                  <p className="text-sm text-gray-500">Use /idea command in Slack</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {mobileSetup.slack_setup.instructions.map((step, i) => (
                  <p key={i} className="text-gray-600">{step}</p>
                ))}
              </div>
              <div className="mt-3 p-2 bg-purple-50 rounded text-sm text-purple-700">
                Webhook URL: <code className="bg-purple-100 px-1 rounded">{mobileSetup.slack_setup.webhook_url}</code>
              </div>
            </div>

            {/* Bookmarklet */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Browser Bookmarklet</h4>
                  <p className="text-sm text-gray-500">Save selected text from any webpage</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Drag this button to your bookmarks bar, then click it on any page to save selected text as an idea:
              </p>
              <div className="flex items-center space-x-3">
                <a
                  href={mobileSetup.bookmarklet.code}
                  onClick={(e) => e.preventDefault()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-move"
                  draggable="true"
                >
                  Save to Ideas
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mobileSetup.bookmarklet.code);
                    setCopiedBookmarklet(true);
                    setTimeout(() => setCopiedBookmarklet(false), 2000);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm ${copiedBookmarklet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {copiedBookmarklet ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>

            {/* SMS/Twilio */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">SMS (via Twilio)</h4>
                  <p className="text-sm text-gray-500">Text ideas to a phone number</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {mobileSetup.sms_twilio.instructions.map((step, i) => (
                  <p key={i} className="text-gray-600">{step}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pillar Guide */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Content Pillars Guide</h3>
          <p className="text-sm text-gray-500">Ideas are auto-categorized into these pillars</p>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(pillars).map(([key, pillar]) => (
            <div key={key} className={`p-4 rounded-lg border ${PILLAR_COLORS[key]}`}>
              <div className="font-medium">
                Pillar {key}: {pillar.name}
              </div>
              <div className="text-sm opacity-80 mt-1">{pillar.description}</div>
              {pillar.sample_hooks && pillar.sample_hooks.length > 0 && (
                <div className="mt-2 text-xs opacity-70">
                  Example: "{pillar.sample_hooks[0]}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default IdeaCapture;
