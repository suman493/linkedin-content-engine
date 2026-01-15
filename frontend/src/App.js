import React, { useState, useEffect } from 'react';
import IdeaCapture from './components/IdeaCapture';
import IdeasList from './components/IdeasList';
import PostGenerator from './components/PostGenerator';
import PostEditor from './components/PostEditor';
import PostQueue from './components/PostQueue';
import Dashboard from './components/Dashboard';
import ContentExtractor from './components/ContentExtractor';
import ImageEditor from './components/ImageEditor';
import Analytics from './components/Analytics';
import { getStats, getPillars } from './api';
import { UserButton, useUser } from './auth/ClerkProvider';

const clerkEnabled = !!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'capture', label: 'Capture Ideas' },
  { id: 'extract', label: 'Extract Content' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'generate', label: 'Generate Post' },
  { id: 'images', label: 'Create Image' },
  { id: 'queue', label: 'Post Queue' },
];

// Component that safely uses the useUser hook - ONLY rendered when inside ClerkProvider
function UserInfoWithClerk() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <span>Loading...</span>;
  if (!user) return <span>Guest</span>;
  return <span>{user.firstName || user.emailAddresses?.[0]?.emailAddress || 'User'}</span>;
}

// User button component - ONLY rendered when inside ClerkProvider
function UserButtonWithClerk() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'w-9 h-9',
        }
      }}
      afterSignOutUrl="/"
    />
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [pillars, setPillars] = useState({});
  const [selectedIdeas, setSelectedIdeas] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      const [statsRes, pillarsRes] = await Promise.all([
        getStats(),
        getPillars(),
      ]);
      setStats(statsRes.data);
      setPillars(pillarsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleIdeaCreated = () => {
    refresh();
  };

  const handleSelectIdeas = (ideas) => {
    setSelectedIdeas(ideas);
    setActiveTab('generate');
  };

  const handlePostGenerated = (post) => {
    setEditingPost(post);
    refresh();
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setActiveTab('generate');
  };

  const handlePostSaved = () => {
    setEditingPost(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linkedin-blue rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-xl">L</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">LinkedIn Content Engine</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {clerkEnabled ? <UserInfoWithClerk /> : 'Suman Siva | Marco Experiences'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              {stats && (
                <div className="hidden md:flex space-x-4 lg:space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{stats.ideas_count}</div>
                    <div className="text-gray-500 text-xs">Ideas</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{stats.drafts_count}</div>
                    <div className="text-gray-500 text-xs">Drafts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{stats.scheduled_count}</div>
                    <div className="text-gray-500 text-xs">Scheduled</div>
                  </div>
                </div>
              )}
              {clerkEnabled && <UserButtonWithClerk />}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - horizontally scrollable on mobile */}
      <nav className="bg-white border-b border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-linkedin-blue text-linkedin-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.id === 'ideas' && selectedIdeas.length > 0 && (
                  <span className="ml-1 sm:ml-2 bg-linkedin-blue text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                    {selectedIdeas.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'analytics' && (
          <Analytics stats={stats} pillars={pillars} />
        )}

        {activeTab === 'capture' && (
          <IdeaCapture pillars={pillars} onIdeaCreated={handleIdeaCreated} />
        )}

        {activeTab === 'extract' && (
          <ContentExtractor pillars={pillars} onIdeasCreated={refresh} />
        )}

        {activeTab === 'ideas' && (
          <IdeasList
            pillars={pillars}
            selectedIdeas={selectedIdeas}
            onSelectIdeas={setSelectedIdeas}
            onGeneratePost={handleSelectIdeas}
            refreshKey={refreshKey}
          />
        )}

        {activeTab === 'generate' && (
          <div className="space-y-6">
            {editingPost ? (
              <PostEditor
                post={editingPost}
                pillars={pillars}
                onSave={handlePostSaved}
                onCancel={() => setEditingPost(null)}
              />
            ) : (
              <PostGenerator
                selectedIdeas={selectedIdeas}
                pillars={pillars}
                onPostGenerated={handlePostGenerated}
                onClearSelection={() => setSelectedIdeas([])}
              />
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <ImageEditor />
        )}

        {activeTab === 'queue' && (
          <PostQueue
            pillars={pillars}
            onEditPost={handleEditPost}
            refreshKey={refreshKey}
          />
        )}
      </main>
    </div>
  );
}

export default App;
