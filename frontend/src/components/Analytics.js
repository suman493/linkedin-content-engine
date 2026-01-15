import React, { useState, useEffect } from 'react';
import { getHistoricalData, updateHistoricalPostMetrics, importCsvAnalytics, getCsvTemplate } from '../api';
import { useUser } from '../auth/ClerkProvider';

// Check if current user is Suman (the owner)
const OWNER_EMAIL = 'suman@marcoexperiences.com';

const VIEWS = {
  OVERVIEW: 'overview',
  ALL_POSTS: 'all_posts',
};

const PILLAR_COLORS = {
  A: { bg: '#3B82F6', name: 'Offsites as Infrastructure' },
  B: { bg: '#EF4444', name: 'What Actually Breaks' },
  C: { bg: '#10B981', name: 'Proof > Promises' },
  D: { bg: '#8B5CF6', name: 'Founder POV' },
  E: { bg: '#F59E0B', name: 'Category Education' },
  External: { bg: '#6B7280', name: 'External/Reposts' },
  Personal: { bg: '#EC4899', name: 'Personal' },
};

const FORMAT_COLORS = {
  'Text + Image': '#10B981',
  'Text Only': '#6B7280',
  'Repost': '#8B5CF6',
  'Text + Link': '#3B82F6',
  'Text + Video': '#F59E0B',
  'Text + Carousel': '#EC4899',
};

// Helper component that uses the Clerk hook (only rendered when Clerk is enabled)
function UserChecker({ onUserLoaded }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
      const isOwner = email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
      onUserLoaded({ email, isOwner, isLoaded: true });
    }
  }, [user, isLoaded, onUserLoaded]);

  return null;
}

function Analytics({ stats }) {
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(VIEWS.OVERVIEW);
  const [timeRange, setTimeRange] = useState('all');
  const [goalImpressions, setGoalImpressions] = useState(5000);
  const [currentPostsPerWeek, setCurrentPostsPerWeek] = useState(2);
  const [projectionWeeks, setProjectionWeeks] = useState(12);
  const [sortBy, setSortBy] = useState('date'); // date, impressions, reactions, engagement
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterPillar, setFilterPillar] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [editingPost, setEditingPost] = useState(null);
  const [editMetrics, setEditMetrics] = useState({ impressions: 0, reactions: 0, comments: 0, url: '' });
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvTemplate, setCsvTemplate] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userInfo, setUserInfo] = useState({ email: null, isOwner: true, isLoaded: false });

  const clerkEnabled = !!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
  // In dev mode (no Clerk), treat as owner
  const isOwner = clerkEnabled ? userInfo.isOwner : true;

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

      const posts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

        const post = {};
        headers.forEach((header, idx) => {
          const value = cleanValues[idx] || '';
          if (header === 'impressions' || header === 'reactions' || header === 'comments' || header === 'reposts') {
            post[header] = parseInt(value) || 0;
          } else {
            post[header] = value;
          }
        });
        if (post.content || post.impressions) {
          posts.push(post);
        }
      }

      const response = await importCsvAnalytics(posts);
      setImportResult(response.data);
      await loadHistoricalData();
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportResult({ error: 'Failed to import CSV. Check the format and try again.' });
    } finally {
      setIsImporting(false);
    }
  };

  const loadCsvTemplate = async () => {
    try {
      const response = await getCsvTemplate();
      setCsvTemplate(response.data);
    } catch (error) {
      console.error('Error loading CSV template:', error);
    }
  };

  const downloadSampleCsv = () => {
    const headers = 'date,post_url,content,impressions,reactions,comments,pillar,format';
    const sample1 = '2025-01-15,https://linkedin.com/posts/example1,My post about company offsites and why they matter for remote teams...,2500,35,8,A,Text + Image';
    const sample2 = '2025-01-10,https://linkedin.com/posts/example2,The biggest mistake I made as a founder was...,1800,22,5,D,Text Only';
    const csv = `${headers}\n${sample1}\n${sample2}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin_analytics_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditMetrics = (post) => {
    setEditingPost(post);
    setEditMetrics({
      impressions: post.impressions || 0,
      reactions: post.reactions || 0,
      comments: post.comments || 0,
      url: post.url || ''
    });
  };

  const handleSaveMetrics = async () => {
    if (!editingPost) return;
    setIsSavingMetrics(true);
    try {
      await updateHistoricalPostMetrics(editingPost.id, editMetrics);
      // Reload data
      await loadHistoricalData();
      setEditingPost(null);
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Failed to save metrics. Please try again.');
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      const response = await getHistoricalData();
      setHistoricalData(response.data);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setHistoricalData(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!historicalData) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700">
        Failed to load historical data. Make sure the backend is running.
      </div>
    );
  }

  const { posts = [], summary_stats = {}, performance_by_pillar = {}, performance_by_format = {} } = historicalData || {};

  // Calculate metrics from real data with defaults
  const filteredPosts = posts;
  const totalImpressions = summary_stats.total_impressions || 0;
  const totalReactions = summary_stats.total_reactions || 0;
  const totalComments = summary_stats.total_comments || 0;
  const avgEngagementRate = summary_stats.avg_engagement_rate || 0;
  const avgImpressionsPerPost = summary_stats.avg_impressions || 0;

  // Top performers
  const topPerformers = [...posts].sort((a, b) => b.impressions - a.impressions).slice(0, 5);

  // Posts by pillar for chart
  const pillarData = Object.entries(performance_by_pillar)
    .filter(([_, data]) => data.posts > 0)
    .map(([pillar, data]) => ({
      label: pillar,
      name: PILLAR_COLORS[pillar]?.name || pillar,
      value: data.avg_impressions,
      posts: data.posts,
      color: PILLAR_COLORS[pillar]?.bg || '#6B7280'
    }))
    .sort((a, b) => b.value - a.value);

  // Posts by format for chart
  const formatData = Object.entries(performance_by_format)
    .map(([format, data]) => ({
      label: format,
      value: data.avg_impressions,
      posts: data.posts,
      color: FORMAT_COLORS[format] || '#6B7280'
    }))
    .sort((a, b) => b.value - a.value);

  // Weekly posting calculation for goal
  const postsNeededForGoal = Math.ceil(goalImpressions / avgImpressionsPerPost);
  const weeksToGoal = Math.ceil(postsNeededForGoal / currentPostsPerWeek);

  // Generate projection data
  const generateProjection = () => {
    const projections = [];
    let cumulativeImpressions = totalImpressions;
    const weeklyImpressions = avgImpressionsPerPost * currentPostsPerWeek;

    for (let week = 1; week <= projectionWeeks; week++) {
      cumulativeImpressions += weeklyImpressions;
      projections.push({
        week,
        projected: cumulativeImpressions,
      });
    }
    return projections;
  };

  // Simple bar chart renderer
  const renderBarChart = (data, maxValue) => {
    return data.map((item, i) => (
      <div key={i} className="flex items-center space-x-3 mb-3">
        <div className="w-32 text-xs text-gray-600 truncate" title={item.name || item.label}>
          {item.label}
        </div>
        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color
            }}
          />
        </div>
        <div className="w-20 text-xs text-gray-700 text-right">
          {item.value.toLocaleString()} avg
        </div>
        <div className="w-16 text-xs text-gray-500 text-right">
          ({item.posts} posts)
        </div>
      </div>
    ));
  };

  // Open LinkedIn profile posts
  const openLinkedInPosts = (url) => {
    window.open(url || 'https://www.linkedin.com/in/sumansiva/recent-activity/all/', '_blank');
  };

  // Sort and filter posts for All Posts view
  const getSortedFilteredPosts = () => {
    let filtered = [...posts];

    if (filterPillar !== 'all') {
      filtered = filtered.filter(p => p.pillar === filterPillar);
    }
    if (filterFormat !== 'all') {
      filtered = filtered.filter(p => p.format === filterFormat);
    }

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'impressions':
          aVal = a.impressions;
          bVal = b.impressions;
          break;
        case 'reactions':
          aVal = a.reactions;
          bVal = b.reactions;
          break;
        case 'engagement':
          aVal = a.engagement_rate;
          bVal = b.engagement_rate;
          break;
        case 'date':
        default:
          aVal = a.id;
          bVal = b.id;
          break;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  };

  // Get unique formats for filter
  const uniqueFormats = [...new Set(posts.map(p => p.format))];
  const uniquePillars = [...new Set(posts.map(p => p.pillar))];

  // Monthly aggregate data
  const getMonthlyData = () => {
    const monthOrder = ['Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
    const monthlyStats = {};

    // Initialize all months
    monthOrder.forEach(month => {
      monthlyStats[month] = { posts: 0, impressions: 0, reactions: 0, comments: 0 };
    });

    // Aggregate posts by month
    posts.forEach(post => {
      const month = post.date;
      if (monthlyStats[month]) {
        monthlyStats[month].posts += 1;
        monthlyStats[month].impressions += post.impressions;
        monthlyStats[month].reactions += post.reactions;
        monthlyStats[month].comments += post.comments;
      }
    });

    return monthOrder.map(month => ({
      month,
      shortMonth: month.split(' ')[0],
      ...monthlyStats[month],
      avgImpressions: monthlyStats[month].posts > 0
        ? Math.round(monthlyStats[month].impressions / monthlyStats[month].posts)
        : 0
    }));
  };

  const monthlyData = getMonthlyData();

  // January target projection
  const janTarget = {
    month: 'Jan 2026',
    targetImpressions: goalImpressions * 4, // Monthly target (4 weeks)
    targetPosts: currentPostsPerWeek * 4,
    projectedImpressions: avgImpressionsPerPost * currentPostsPerWeek * 4,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Render UserChecker only when Clerk is enabled */}
      {clerkEnabled && <UserChecker onUserLoaded={setUserInfo} />}

      {/* Onboarding Banner for non-owner users */}
      {!isOwner && showOnboarding && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-4 sm:p-6 text-white relative">
          <button
            onClick={() => setShowOnboarding(false)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/70 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">Welcome!</span>
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">Demo Data</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">You're viewing Suman's LinkedIn analytics</h3>
              <p className="text-purple-100 text-sm sm:text-base mb-4">
                This is sample data from the app creator. Import your own LinkedIn data to see personalized analytics and AI-powered content recommendations.
              </p>

              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get your data with Claude Code
                </h4>
                <ol className="text-sm text-purple-100 space-y-1 mb-3">
                  <li>1. Install <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Claude Code</a> (free for Mac/Windows/Linux)</li>
                  <li>2. Open LinkedIn's analytics page in Chrome</li>
                  <li>3. Ask Claude to scrape your post data to CSV</li>
                  <li>4. Import the CSV using the button below</li>
                </ol>
                <div className="bg-black/20 rounded p-2 text-xs font-mono break-all">
                  "Go to linkedin.com/analytics/post-analytics, scrape all my posts with impressions, reactions, comments, and save as CSV"
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:min-w-[200px]">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  loadCsvTemplate();
                }}
                className="w-full px-4 py-3 bg-white text-purple-700 rounded-lg font-semibold hover:bg-purple-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Your Data
              </button>
              <button
                onClick={() => setShowOnboarding(false)}
                className="w-full px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
              >
                Continue with Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with LinkedIn Link */}
      <div className="bg-gradient-to-r from-linkedin-blue to-blue-700 rounded-lg shadow p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold">LinkedIn Analytics</h2>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">{posts.length} posts tracked</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* View Toggle */}
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setCurrentView(VIEWS.OVERVIEW)}
                className={`flex-1 px-3 py-1.5 sm:py-1 rounded text-xs sm:text-sm transition-colors ${
                  currentView === VIEWS.OVERVIEW
                    ? 'bg-white text-linkedin-blue'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setCurrentView(VIEWS.ALL_POSTS)}
                className={`flex-1 px-3 py-1.5 sm:py-1 rounded text-xs sm:text-sm transition-colors ${
                  currentView === VIEWS.ALL_POSTS
                    ? 'bg-white text-linkedin-blue'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                All Posts
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  loadCsvTemplate();
                }}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </button>
              <button
                onClick={() => openLinkedInPosts()}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white text-linkedin-blue rounded-lg hover:bg-blue-50 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="hidden sm:inline">View on LinkedIn</span>
                <span className="sm:hidden">LinkedIn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ALL POSTS VIEW */}
      {currentView === VIEWS.ALL_POSTS && (
        <>
          {/* Filters and Sort */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort By */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-linkedin-blue"
                >
                  <option value="date">Date</option>
                  <option value="impressions">Impressions</option>
                  <option value="reactions">Reactions</option>
                  <option value="engagement">Engagement Rate</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              {/* Filter by Pillar */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Pillar:</label>
                <select
                  value={filterPillar}
                  onChange={(e) => setFilterPillar(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-linkedin-blue"
                >
                  <option value="all">All Pillars</option>
                  {uniquePillars.map(p => (
                    <option key={p} value={p}>{p}: {PILLAR_COLORS[p]?.name || p}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Format */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Format:</label>
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-linkedin-blue"
                >
                  <option value="all">All Formats</option>
                  {uniqueFormats.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-500 ml-auto">
                Showing {getSortedFilteredPosts().length} of {posts.length} posts
              </div>
            </div>
          </div>

          {/* Chart View - Bar Chart of All Posts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">All Posts - Impressions Chart</h3>
              <p className="text-sm text-gray-500">Visual comparison of all post performance</p>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {getSortedFilteredPosts().map((post, i) => {
                  const maxImpressions = Math.max(...posts.map(p => p.impressions));
                  return (
                    <div
                      key={post.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => openLinkedInPosts(post.url)}
                    >
                      <div className="w-8 text-sm font-medium text-gray-400">#{i + 1}</div>
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: PILLAR_COLORS[post.pillar]?.bg || '#6B7280' }}
                        title={`Pillar ${post.pillar}`}
                      />
                      <div className="w-48 text-sm text-gray-700 truncate" title={post.topic}>
                        {post.topic}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(post.impressions / maxImpressions) * 100}%`,
                            backgroundColor: PILLAR_COLORS[post.pillar]?.bg || '#0077B5'
                          }}
                        />
                      </div>
                      <div className="w-20 text-sm font-medium text-gray-900 text-right">
                        {post.impressions.toLocaleString()}
                      </div>
                      <div className="w-16 text-xs text-gray-500 text-right">
                        {post.reactions} rxns
                      </div>
                      <div className="w-16 text-xs text-gray-500 text-right">
                        {post.engagement_rate}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data Table View */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">All Posts - Detailed Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reactions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedFilteredPosts().map((post, i) => (
                    <tr
                      key={post.id}
                      className={`hover:bg-gray-50 ${post.top_performer ? 'bg-yellow-50' : ''} ${post.generated_by ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{post.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={post.topic}>
                        {post.topic}
                        {post.top_performer && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                            Top
                          </span>
                        )}
                        {post.generated_by && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{post.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${PILLAR_COLORS[post.pillar]?.bg}20`,
                            color: PILLAR_COLORS[post.pillar]?.bg
                          }}
                          title={PILLAR_COLORS[post.pillar]?.name || post.pillar}
                        >
                          {post.pillar}: {PILLAR_COLORS[post.pillar]?.name?.split(' ')[0] || post.pillar}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{post.format}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {post.impressions === 0 ? (
                          <span className="text-gray-400 italic">--</span>
                        ) : (
                          post.impressions.toLocaleString()
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{post.reactions}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{post.comments}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${post.engagement_rate > 2 ? 'text-green-600' : 'text-gray-600'}`}>
                          {post.engagement_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMetrics(post);
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            {post.impressions === 0 ? 'Add Metrics' : 'Edit'}
                          </button>
                          {post.url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLinkedInPosts(post.url);
                              }}
                              className="text-xs px-2 py-1 bg-linkedin-blue text-white rounded hover:bg-blue-700"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats for Filtered View */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">
                {getSortedFilteredPosts().reduce((sum, p) => sum + p.impressions, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Impressions (filtered)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">
                {getSortedFilteredPosts().reduce((sum, p) => sum + p.reactions, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Reactions (filtered)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(getSortedFilteredPosts().reduce((sum, p) => sum + p.impressions, 0) / getSortedFilteredPosts().length).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Avg Impressions (filtered)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">
                {(getSortedFilteredPosts().reduce((sum, p) => sum + p.engagement_rate, 0) / getSortedFilteredPosts().length).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Avg Engagement (filtered)</div>
            </div>
          </div>
        </>
      )}

      {/* OVERVIEW VIEW */}
      {currentView === VIEWS.OVERVIEW && (
        <>

      {/* Monthly Performance Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Monthly Performance</h3>
          <p className="text-sm text-gray-500">Aggregate impressions by month with January 2026 target</p>
        </div>
        <div className="p-4">
          <div className="flex items-end justify-between space-x-2" style={{ height: '200px' }}>
            {monthlyData.map((month, i) => {
              const maxImpressions = Math.max(...monthlyData.map(m => m.impressions), janTarget.targetImpressions);
              const barHeight = month.impressions > 0 ? (month.impressions / maxImpressions) * 160 : 8;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center group">
                  <div className="text-xs text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {month.impressions.toLocaleString()}
                  </div>
                  <div
                    className="w-full bg-linkedin-blue rounded-t transition-all hover:bg-blue-600 relative"
                    style={{ height: `${barHeight}px` }}
                  >
                    {month.posts > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                        {month.posts}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-medium">{month.shortMonth}</div>
                </div>
              );
            })}
            {/* January Target Bar */}
            <div className="flex-1 flex flex-col items-center group">
              <div className="text-xs text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Target: {janTarget.targetImpressions.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t relative border-2 border-dashed border-green-500 bg-green-50"
                style={{ height: `${(janTarget.targetImpressions / Math.max(...monthlyData.map(m => m.impressions), janTarget.targetImpressions)) * 160}px` }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium">
                  {janTarget.targetPosts}
                </div>
              </div>
              <div className="text-xs text-green-600 mt-2 font-bold">Jan</div>
            </div>
          </div>

          {/* Legend and Stats */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-linkedin-blue rounded" />
                <span className="text-xs text-gray-600">Actual impressions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-dashed border-green-500 bg-green-50 rounded" />
                <span className="text-xs text-gray-600">January target</span>
              </div>
              <div className="text-xs text-gray-400">(Numbers above bars = post count)</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Jan Target: <span className="text-green-600">{janTarget.targetImpressions.toLocaleString()}</span> impressions
              </div>
              <div className="text-xs text-gray-500">
                {janTarget.targetPosts} posts × {avgImpressionsPerPost.toLocaleString()} avg = {janTarget.projectedImpressions.toLocaleString()} projected
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Posts</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Impressions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Avg/Post</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Reactions</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.filter(m => m.posts > 0).map((month) => (
                  <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-900">{month.month}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{month.posts}</td>
                    <td className="py-2 px-2 text-right font-medium text-gray-900">{month.impressions.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{month.avgImpressions.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{month.reactions}</td>
                  </tr>
                ))}
                {/* January Target Row */}
                <tr className="bg-green-50 font-medium">
                  <td className="py-2 px-2 text-green-700">Jan 2026 (Target)</td>
                  <td className="py-2 px-2 text-right text-green-700">{janTarget.targetPosts}</td>
                  <td className="py-2 px-2 text-right text-green-700">{janTarget.targetImpressions.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-green-600">{avgImpressionsPerPost.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-green-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{posts.length}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Posts</div>
          <div className="mt-1 sm:mt-2 text-xs text-green-600 hidden sm:block">Apr - Nov 2025</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Impressions</div>
          <div className="mt-1 sm:mt-2 text-xs text-gray-500 hidden sm:block">{avgImpressionsPerPost.toLocaleString()} avg/post</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalReactions.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Reactions</div>
          <div className="mt-1 sm:mt-2 text-xs text-gray-500 hidden sm:block">{summary_stats.avg_reactions} avg/post</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalComments}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Comments</div>
          <div className="mt-1 sm:mt-2 text-xs text-gray-500 hidden sm:block">{summary_stats.avg_comments} avg/post</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-5 col-span-2 sm:col-span-1">
          <div className="text-2xl sm:text-3xl font-bold text-linkedin-blue">{avgEngagementRate}%</div>
          <div className="text-xs sm:text-sm text-gray-500">Avg Engagement</div>
          <div className="mt-1 sm:mt-2 text-xs text-green-600 hidden sm:block">Above industry avg</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Posts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Top Performing Posts</h3>
              <p className="text-sm text-gray-500">Your best content by impressions</p>
            </div>
            <button
              onClick={openLinkedInPosts}
              className="text-sm text-linkedin-blue hover:underline"
            >
              View on LinkedIn
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {topPerformers.map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={openLinkedInPosts}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}`}>
                      #{i + 1}
                    </div>
                    <div
                      className="w-2 h-10 rounded"
                      style={{ backgroundColor: PILLAR_COLORS[post.pillar]?.bg || '#6B7280' }}
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{post.topic}</div>
                      <div className="text-xs text-gray-500">{post.date} • {post.format} • {post.type}</div>
                      {post.top_performer && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Top Performer
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{post.impressions.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{post.reactions} reactions • {post.comments} comments</div>
                    <div className="text-xs text-green-600">{post.engagement_rate}% engagement</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Posts Timeline */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">All Posts Performance</h3>
            <p className="text-sm text-gray-500">Click any post to view on LinkedIn</p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {posts.map((post, i) => {
                const maxImpressions = Math.max(...posts.map(p => p.impressions));
                return (
                  <div
                    key={post.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={openLinkedInPosts}
                    title={`${post.topic} - Click to view on LinkedIn`}
                  >
                    <div className="w-16 text-xs text-gray-500">{post.date}</div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PILLAR_COLORS[post.pillar]?.bg || '#6B7280' }}
                    />
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-linkedin-blue rounded transition-all"
                        style={{ width: `${(post.impressions / maxImpressions) * 100}%` }}
                      />
                    </div>
                    <div className="w-16 text-xs text-gray-600 text-right">{post.impressions.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Performance by Pillar */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Performance by Content Pillar</h3>
            <p className="text-sm text-gray-500">Average impressions per pillar</p>
          </div>
          <div className="p-4">
            {renderBarChart(pillarData, Math.max(...pillarData.map(d => d.value)))}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-800">
                Best Performer: Pillar {pillarData[0]?.label} ({pillarData[0]?.name})
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {pillarData[0]?.value.toLocaleString()} avg impressions across {pillarData[0]?.posts} posts
              </div>
            </div>
          </div>
        </div>

        {/* Performance by Format */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Performance by Format</h3>
            <p className="text-sm text-gray-500">Average impressions per format type</p>
          </div>
          <div className="p-4">
            {renderBarChart(formatData, Math.max(...formatData.map(d => d.value)))}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-800">
                Best Format: {formatData[0]?.label}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {formatData[0]?.value.toLocaleString()} avg impressions across {formatData[0]?.posts} posts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Best Posting Times */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Best Posting Times</h3>
          <p className="text-sm text-gray-500">Based on LinkedIn's recommended times for B2B engagement</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{day}</div>
                <div
                  className={`h-12 rounded flex items-center justify-center text-xs font-medium ${
                    i < 5
                      ? i === 1 || i === 3
                        ? 'bg-green-500 text-white'
                        : 'bg-green-200 text-green-800'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i === 1 ? 'Best' : i === 3 ? 'Good' : i < 5 ? 'OK' : 'Avoid'}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="font-medium text-green-800">Tuesday 8-10 AM</div>
              <div className="text-xs text-green-600 mt-1">Highest engagement window</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="font-medium text-green-800">Thursday 12-1 PM</div>
              <div className="text-xs text-green-600 mt-1">Second best for B2B</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-medium text-gray-700">Avoid Weekends</div>
              <div className="text-xs text-gray-500 mt-1">~50% lower reach</div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Setting & Projections */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow">
        <div className="p-6 border-b border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900">Goal Planner & Projections</h3>
          <p className="text-sm text-gray-600">Set targets and see how to achieve them based on your historical performance</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Impression Goal
              </label>
              <input
                type="number"
                value={goalImpressions}
                onChange={(e) => setGoalImpressions(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posts per Week
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCurrentPostsPerWeek(n)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      currentPostsPerWeek === n
                        ? 'bg-linkedin-blue text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projection Period
              </label>
              <select
                value={projectionWeeks}
                onChange={(e) => setProjectionWeeks(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue"
              >
                <option value={4}>1 Month</option>
                <option value={12}>3 Months</option>
                <option value={24}>6 Months</option>
                <option value={52}>1 Year</option>
              </select>
            </div>
          </div>

          {/* Recommendation Card */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 text-lg">Recommended Strategy</h4>
                <p className="text-sm text-gray-600 mt-1">Based on your actual historical performance</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-linkedin-blue">{currentPostsPerWeek}x</div>
                <div className="text-sm text-gray-500">posts/week</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{(avgImpressionsPerPost * currentPostsPerWeek).toLocaleString()}</div>
                <div className="text-sm text-blue-600">Projected weekly impressions</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{weeksToGoal}</div>
                <div className="text-sm text-green-600">Weeks to reach {goalImpressions.toLocaleString()}/week goal</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-800">{(avgImpressionsPerPost * currentPostsPerWeek * projectionWeeks).toLocaleString()}</div>
                <div className="text-sm text-purple-600">Total impressions in {projectionWeeks} weeks</div>
              </div>
            </div>

            <div className="mt-6 p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Action Items Based on Your Data:</h5>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">→</span>
                  <span className="text-sm text-gray-600">
                    Post <strong>{currentPostsPerWeek}x per week</strong> consistently (Tue & Thu mornings)
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">→</span>
                  <span className="text-sm text-gray-600">
                    Use <strong>{formatData[0]?.label}</strong> format for best results ({formatData[0]?.value.toLocaleString()} avg impressions)
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">→</span>
                  <span className="text-sm text-gray-600">
                    Focus on <strong>Pillar {pillarData[0]?.label}: {pillarData[0]?.name}</strong> content - your highest performer
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">→</span>
                  <span className="text-sm text-gray-600">
                    Your top posts had <strong>personal stories + vulnerability</strong> - replicate this formula
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="bg-white rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Cumulative Impressions Projection</h4>
            <div className="h-48 flex items-end justify-between space-x-1">
              {generateProjection().slice(0, Math.min(projectionWeeks, 24)).map((point, i) => {
                const maxProjected = avgImpressionsPerPost * currentPostsPerWeek * projectionWeeks + totalImpressions;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="hidden group-hover:block absolute -mt-8 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      {point.projected.toLocaleString()}
                    </div>
                    <div
                      className="w-full bg-linkedin-blue rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${(point.projected / maxProjected) * 160}px` }}
                    />
                    {(i + 1) % 4 === 0 && (
                      <div className="text-xs text-gray-500 mt-1">W{point.week}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-linkedin-blue rounded" />
                <span className="text-xs text-gray-600">Projected cumulative impressions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Analysis */}
      {posts.filter(p => p.top_performer).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Why Your Top Posts Worked</h3>
            <p className="text-sm text-gray-500">Analysis of your best performing content</p>
          </div>
          <div className="p-4 space-y-4">
            {posts.filter(p => p.top_performer).map((post, i) => (
              <div key={post.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{post.topic}</div>
                    <div className="text-sm text-gray-500 mt-1">{post.date} • {post.format}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-700">{post.impressions.toLocaleString()} impressions</div>
                    <div className="text-sm text-yellow-600">{post.reactions} reactions</div>
                  </div>
                </div>
                {post.why_it_worked && (
                  <div className="mt-3 p-3 bg-white rounded border border-yellow-100">
                    <div className="text-sm font-medium text-gray-700">Why it worked:</div>
                    <div className="text-sm text-gray-600 mt-1">{post.why_it_worked}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Calendar Suggestion */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Suggested Content Calendar</h3>
          <p className="text-sm text-gray-500">Optimal posting schedule for next 2 weeks based on your pillar performance</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 pb-2">
                {day}
              </div>
            ))}
            {/* Week 1 */}
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 rounded text-center" style={{ backgroundColor: `${PILLAR_COLORS.D.bg}20` }}>
              <div className="text-xs font-medium" style={{ color: PILLAR_COLORS.D.bg }}>Post</div>
              <div className="text-xs" style={{ color: PILLAR_COLORS.D.bg }}>Pillar D</div>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 rounded text-center" style={{ backgroundColor: `${PILLAR_COLORS.C.bg}20` }}>
              <div className="text-xs font-medium" style={{ color: PILLAR_COLORS.C.bg }}>Post</div>
              <div className="text-xs" style={{ color: PILLAR_COLORS.C.bg }}>Pillar C</div>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 bg-gray-100 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 bg-gray-100 rounded text-center text-xs text-gray-400">-</div>
            {/* Week 2 */}
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 rounded text-center" style={{ backgroundColor: `${PILLAR_COLORS.External.bg}20` }}>
              <div className="text-xs font-medium" style={{ color: PILLAR_COLORS.External.bg }}>Post</div>
              <div className="text-xs" style={{ color: PILLAR_COLORS.External.bg }}>External</div>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 rounded text-center" style={{ backgroundColor: `${PILLAR_COLORS.D.bg}20` }}>
              <div className="text-xs font-medium" style={{ color: PILLAR_COLORS.D.bg }}>Post</div>
              <div className="text-xs" style={{ color: PILLAR_COLORS.D.bg }}>Pillar D</div>
            </div>
            <div className="p-2 bg-gray-50 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 bg-gray-100 rounded text-center text-xs text-gray-400">-</div>
            <div className="p-2 bg-gray-100 rounded text-center text-xs text-gray-400">-</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(PILLAR_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: val.bg }} />
                <span className="text-xs text-gray-500">{key}: {val.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 text-lg">Import LinkedIn Analytics</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-4">Upload your LinkedIn analytics CSV file</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isImporting}
                />
                <label
                  htmlFor="csv-upload"
                  className={`inline-block px-6 py-3 rounded-lg cursor-pointer ${
                    isImporting
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-linkedin-blue text-white hover:bg-blue-700'
                  }`}
                >
                  {isImporting ? 'Importing...' : 'Choose CSV File'}
                </label>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`p-4 rounded-lg ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {importResult.error ? (
                    <p>{importResult.error}</p>
                  ) : (
                    <div>
                      <p className="font-medium">Import successful!</p>
                      <p className="text-sm mt-1">
                        {importResult.imported} new posts imported, {importResult.updated} existing posts updated.
                        Total: {importResult.total_posts} posts.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CSV Format Help */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">CSV Format</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Required columns:</strong> content, impressions</p>
                  <p><strong>Optional columns:</strong> date, post_url, reactions, comments, pillar, format</p>
                  <div className="mt-3">
                    <button
                      onClick={downloadSampleCsv}
                      className="text-linkedin-blue hover:underline flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download sample CSV template</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pillar Codes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Pillar Codes</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">A:</span> Offsites as Infrastructure</div>
                  <div><span className="font-medium">B:</span> What Actually Breaks</div>
                  <div><span className="font-medium">C:</span> Proof &gt; Promises</div>
                  <div><span className="font-medium">D:</span> Founder POV</div>
                  <div><span className="font-medium">E:</span> Category Education</div>
                </div>
              </div>

              {/* Claude Automation Instructions */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Automate with Claude Code</span>
                </h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>Use Claude Code to automatically scrape your LinkedIn analytics:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Install Claude Code on your machine</li>
                    <li>Open LinkedIn analytics in Chrome</li>
                    <li>Run Claude with the prompt below</li>
                    <li>Import the generated CSV here</li>
                  </ol>
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-xs text-gray-500 mb-1">Example prompt for Claude:</p>
                    <code className="text-xs text-gray-700 break-all">
                      "Go to linkedin.com/analytics/post-analytics, scrape all my post data including impressions, reactions, and comments, then save it as a CSV file with columns: date, post_url, content, impressions, reactions, comments"
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metrics Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {editingPost.impressions === 0 ? 'Add Post Metrics' : 'Edit Post Metrics'}
                </h3>
                <button
                  onClick={() => setEditingPost(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{editingPost.topic}</p>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the actual metrics from your LinkedIn post analytics:
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressions
                </label>
                <input
                  type="number"
                  value={editMetrics.impressions}
                  onChange={(e) => setEditMetrics({ ...editMetrics, impressions: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                  placeholder="e.g., 1500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reactions
                  </label>
                  <input
                    type="number"
                    value={editMetrics.reactions}
                    onChange={(e) => setEditMetrics({ ...editMetrics, reactions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                    placeholder="e.g., 25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments
                  </label>
                  <input
                    type="number"
                    value={editMetrics.comments}
                    onChange={(e) => setEditMetrics({ ...editMetrics, comments: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Post URL (optional)
                </label>
                <input
                  type="url"
                  value={editMetrics.url}
                  onChange={(e) => setEditMetrics({ ...editMetrics, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
                  placeholder="https://linkedin.com/posts/..."
                />
              </div>

              {editMetrics.impressions > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Calculated Engagement Rate:{' '}
                    <span className="font-medium text-gray-900">
                      {(((editMetrics.reactions + editMetrics.comments) / editMetrics.impressions) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMetrics}
                disabled={isSavingMetrics}
                className="px-4 py-2 bg-linkedin-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSavingMetrics ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Metrics</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
