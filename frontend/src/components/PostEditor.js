import React, { useState, useEffect, useRef, useCallback } from 'react';
import { updatePost, getSimilarPosts, regeneratePost, predictContentEngagement } from '../api';

const PILLAR_INFO = {
  A: { colors: 'bg-blue-100 text-blue-800', name: 'Offsites as Infrastructure' },
  B: { colors: 'bg-red-100 text-red-800', name: 'What Actually Breaks' },
  C: { colors: 'bg-green-100 text-green-800', name: 'Proof > Promises' },
  D: { colors: 'bg-purple-100 text-purple-800', name: 'Founder POV' },
  E: { colors: 'bg-yellow-100 text-yellow-800', name: 'Category Education' },
  External: { colors: 'bg-gray-100 text-gray-700', name: 'External/Reposts' },
  Personal: { colors: 'bg-pink-100 text-pink-800', name: 'Personal' },
};

const FORMATS = ['Text Only', 'Text + Image', 'Carousel'];

function PostEditor({ post, pillars, onSave, onCancel }) {
  const [content, setContent] = useState(post.content || '');
  const [format, setFormat] = useState(post.format || 'Text Only');
  const [imagePrompt, setImagePrompt] = useState(post.image_prompt || '');
  const [tweetVersion, setTweetVersion] = useState(post.tweet_version || '');
  const [scheduledDate, setScheduledDate] = useState(post.scheduled_date || '');
  const [scheduledTime, setScheduledTime] = useState(post.scheduled_time || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [similarPosts, setSimilarPosts] = useState([]);

  // Coaching state
  const [coachingFeedback, setCoachingFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCoaching, setShowCoaching] = useState(false);

  // Engagement prediction state
  const [engagementData, setEngagementData] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showEngagement, setShowEngagement] = useState(false);

  // Photo upload state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Autosave state
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autosaveTimeoutRef = useRef(null);

  useEffect(() => {
    // Load similar posts based on the first idea's pillar
    if (post.ideas && post.ideas.length > 0 && post.ideas[0].pillar) {
      loadSimilarPosts(post.ideas[0].pillar);
    }
  }, [post]);

  // Autosave function
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    try {
      await updatePost(post.id, {
        content,
        format,
        image_prompt: imagePrompt,
        tweet_version: tweetVersion,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }, [post.id, content, format, imagePrompt, tweetVersion, scheduledDate, scheduledTime, hasUnsavedChanges]);

  // Trigger autosave on content changes (debounced)
  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    setHasUnsavedChanges(true);

    autosaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 1500); // Save after 1.5 seconds of no changes

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [content, format, imagePrompt, tweetVersion, scheduledDate, scheduledTime]);

  // Save immediately when component unmounts (tab switch)
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        // Sync save on unmount
        updatePost(post.id, {
          content,
          format,
          image_prompt: imagePrompt,
          tweet_version: tweetVersion,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
        }).catch(err => console.error('Save on unmount failed:', err));
      }
    };
  }, [post.id, content, format, imagePrompt, tweetVersion, scheduledDate, scheduledTime, hasUnsavedChanges]);

  const loadSimilarPosts = async (pillar) => {
    try {
      const response = await getSimilarPosts(pillar);
      setSimilarPosts(response.data);
    } catch (error) {
      console.error('Error loading similar posts:', error);
    }
  };

  const handleSave = async (status = 'draft') => {
    setIsSaving(true);
    try {
      await updatePost(post.id, {
        content,
        format,
        image_prompt: imagePrompt,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status,
      });
      onSave();
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async (directFeedback = null) => {
    const feedbackToUse = directFeedback || coachingFeedback;
    if (!feedbackToUse.trim()) return;

    setIsRegenerating(true);
    try {
      const response = await regeneratePost(post.id, feedbackToUse);
      setContent(response.data.content);
      setTweetVersion(response.data.tweet_version || '');
      setImagePrompt(response.data.image_prompt || '');
      setCoachingFeedback('');
      setShowCoaching(false);
    } catch (error) {
      console.error('Error regenerating post:', error);
      alert('Failed to regenerate. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handlePostToLinkedIn = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      // Open LinkedIn post composer
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handlePredictEngagement = async () => {
    setIsPredicting(true);
    setShowEngagement(true);
    try {
      const response = await predictContentEngagement(content, format);
      setEngagementData(response.data);
    } catch (error) {
      console.error('Error predicting engagement:', error);
      alert('Failed to analyze post. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      // Auto-switch to Text + Image format
      if (format === 'Text Only') {
        setFormat('Text + Image');
      }
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const characterCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Post</h2>
                <p className="text-sm text-gray-500">
                  Fine-tune your generated post or give coaching feedback
                </p>
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Source Ideas */}
            {post.ideas && post.ideas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Ideas
                </label>
                <div className="flex flex-wrap gap-2">
                  {post.ideas.map((idea) => (
                    <span
                      key={idea.id}
                      className={`text-xs px-2 py-1 rounded ${
                        idea.pillar ? PILLAR_INFO[idea.pillar]?.colors : 'bg-gray-100 text-gray-700'
                      }`}
                      title={idea.pillar ? `${idea.pillar}: ${PILLAR_INFO[idea.pillar]?.name}` : ''}
                    >
                      {idea.pillar && <span className="font-medium mr-1">{idea.pillar}:</span>}
                      {idea.raw_input.substring(0, 50)}...
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="font-medium text-purple-900">AI Coaching</span>
                </div>
                <button
                  onClick={() => setShowCoaching(!showCoaching)}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  {showCoaching ? 'Hide' : 'Give Feedback & Regenerate'}
                </button>
              </div>

              {showCoaching && (
                <div className="space-y-3">
                  <textarea
                    value={coachingFeedback}
                    onChange={(e) => setCoachingFeedback(e.target.value)}
                    placeholder="Give feedback to improve the post. E.g., 'Make it shorter', 'Add more personal story', 'Focus on the irony angle', 'Make the hook punchier'..."
                    className="w-full h-24 p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-purple-600">
                      Tip: Be specific about what you want changed
                    </div>
                    <button
                      onClick={handleRegenerate}
                      disabled={!coachingFeedback.trim() || isRegenerating}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {isRegenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Regenerate with Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Post Content
                </label>
                <span className="text-xs text-gray-500">
                  Edit directly below
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-80 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent font-mono text-sm resize-none"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <span>{characterCount} characters | {wordCount} words</span>
                  {/* Autosave indicator */}
                  <span className={`flex items-center text-xs ${hasUnsavedChanges ? 'text-yellow-600' : 'text-green-600'}`}>
                    {hasUnsavedChanges ? (
                      <>
                        <svg className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="5" />
                        </svg>
                        Saving...
                      </>
                    ) : lastSaved ? (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </>
                    ) : null}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex space-x-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      format === f
                        ? 'bg-linkedin-blue text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload & Prompt (if applicable) */}
            {format === 'Text + Image' && (
              <div className="space-y-4">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-linkedin-blue transition-colors">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Uploaded preview"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <button
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <p className="text-center text-sm text-gray-500 mt-2">{uploadedImage?.name}</p>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Image Prompt/Suggestion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Suggestion (for AI generation)
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="AI image prompt or description of personal photo to use..."
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tweet Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tweet Version (280 chars)
              </label>
              <textarea
                value={tweetVersion}
                onChange={(e) => setTweetVersion(e.target.value)}
                maxLength={280}
                className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent text-sm resize-none"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {tweetVersion.length}/280
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule (Optional)
              </label>
              <div className="flex space-x-4">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={handlePostToLinkedIn}
                  className="px-4 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Post to LinkedIn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview & Reference Sidebar */}
      <div className="space-y-6">
        {/* Live Preview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Preview</h3>
          </div>
          <div className="p-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-linkedin-blue rounded-full flex items-center justify-center text-white font-bold">
                  SS
                </div>
                <div>
                  <div className="font-medium text-gray-900">Suman Siva</div>
                  <div className="text-xs text-gray-500">Co-founder & CEO at Marco Experiences</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {content || 'Your post preview will appear here...'}
              </div>
              {/* Show uploaded image in preview */}
              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Post attachment"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Engagement Prediction */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Engagement Analysis</h3>
              <button
                onClick={handlePredictEngagement}
                disabled={isPredicting || !content.trim()}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPredicting ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
          <div className="p-4">
            {!showEngagement ? (
              <p className="text-sm text-gray-500">Click Analyze to predict engagement and get AI-detection feedback</p>
            ) : isPredicting ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : engagementData ? (
              <div className="space-y-4">
                {/* Score */}
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">{engagementData.score}/100</div>
                  <div className="text-sm text-gray-600">Engagement Score</div>
                  <div className="mt-2 flex justify-center space-x-4 text-xs">
                    <span className="text-gray-500">~{engagementData.predicted_impressions} impressions</span>
                    <span className="text-gray-500">~{engagementData.predicted_reactions} reactions</span>
                  </div>
                </div>

                {/* Strengths */}
                {engagementData.strengths && engagementData.strengths.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-green-700 mb-2">Strengths</div>
                    <ul className="space-y-1">
                      {engagementData.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start">
                          <span className="text-green-500 mr-2">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Flags - Important for de-AI-ing */}
                {engagementData.ai_flags && engagementData.ai_flags.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-sm font-medium text-red-700 mb-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Sounds AI-Generated
                      </div>
                      <button
                        onClick={() => {
                          const feedback = `Fix these AI-sounding phrases to sound more human and natural: ${engagementData.ai_flags.map(f => `"${f}"`).join(', ')}. Make them conversational and authentic to my voice.`;
                          handleRegenerate(feedback);
                        }}
                        disabled={isRegenerating}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {isRegenerating ? 'Fixing...' : 'Fix All'}
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {engagementData.ai_flags.map((flag, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="text-xs text-red-600">"{flag}"</span>
                          <button
                            onClick={() => {
                              handleRegenerate(`Rewrite this phrase to sound more human and natural: "${flag}". Keep the meaning but make it conversational.`);
                            }}
                            disabled={isRegenerating}
                            className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Fix
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {engagementData.weaknesses && engagementData.weaknesses.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-2">Areas to Improve</div>
                    <ul className="space-y-1">
                      {engagementData.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start">
                          <span className="text-red-500 mr-2">-</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {engagementData.improvements && engagementData.improvements.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-blue-700 mb-2">Suggested Improvements</div>
                    <div className="space-y-2">
                      {engagementData.improvements.map((imp, i) => (
                        <div key={i} className="bg-blue-50 p-2 rounded text-xs">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-blue-800">{imp.issue}</div>
                              <div className="text-blue-600 mt-1">{imp.suggestion}</div>
                            </div>
                            <button
                              onClick={() => {
                                handleRegenerate(`${imp.issue}: ${imp.suggestion}`);
                              }}
                              disabled={isRegenerating}
                              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                            >
                              {isRegenerating ? '...' : 'Implement'}
                            </button>
                          </div>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                            imp.priority === 'high' ? 'bg-red-100 text-red-700' :
                            imp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {imp.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Hooks */}
                {engagementData.rewrite_hooks && engagementData.rewrite_hooks.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-purple-700 mb-2">Try These Hooks Instead</div>
                    <div className="space-y-2">
                      {engagementData.rewrite_hooks.map((hook, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                          <span className="flex-1 text-xs text-purple-800">"{hook}"</span>
                          <button
                            onClick={() => {
                              handleRegenerate(`Change the opening hook to: "${hook}"`);
                            }}
                            disabled={isRegenerating}
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 flex-shrink-0"
                          >
                            {isRegenerating ? '...' : 'Use'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Analysis failed. Try again.</p>
            )}
          </div>
        </div>

        {/* Quick Coaching Prompts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Quick Coaching Prompts</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              'Make it shorter and punchier',
              'Add more personal story',
              'Make the hook stronger',
              'Add specific numbers/metrics',
              'Make it more vulnerable',
              'Focus on the lesson learned',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setCoachingFeedback(prompt);
                  setShowCoaching(true);
                }}
                className="block w-full text-left text-sm px-3 py-2 bg-gray-50 hover:bg-purple-50 hover:text-purple-700 rounded transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Similar Posts Reference */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Similar Top Posts</h3>
          </div>
          <div className="p-4">
            {similarPosts.length === 0 ? (
              <p className="text-sm text-gray-500">No similar posts found</p>
            ) : (
              <div className="space-y-3">
                {similarPosts.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">{p.topic}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {p.impressions} impressions | {p.reactions} reactions
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostEditor;
