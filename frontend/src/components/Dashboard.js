import React from 'react';

const PILLAR_COLORS = {
  A: 'bg-blue-100 text-blue-800 border-blue-300',
  B: 'bg-red-100 text-red-800 border-red-300',
  C: 'bg-green-100 text-green-800 border-green-300',
  D: 'bg-purple-100 text-purple-800 border-purple-300',
  E: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

function Dashboard({ stats, pillars }) {
  if (!stats || !pillars) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const historicalStats = stats.historical_stats || {};

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-linkedin-blue">{stats.ideas_count}</div>
          <div className="text-gray-600">Ideas Captured</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{stats.drafts_count}</div>
          <div className="text-gray-600">Drafts Ready</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{stats.scheduled_count}</div>
          <div className="text-gray-600">Scheduled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-orange-600">{historicalStats.avg_engagement_rate?.toFixed(2) || '0'}%</div>
          <div className="text-gray-600">Avg Engagement</div>
        </div>
      </div>

      {/* Content Pillars Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Content Pillars</h2>
          <p className="text-sm text-gray-500">Your strategic content categories</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(pillars).map(([key, pillar]) => (
            <div
              key={key}
              className={`p-4 rounded-lg border ${PILLAR_COLORS[key]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">Pillar {key}</span>
                <span className="text-sm">{pillar['2025_posts'] || 0} posts</span>
              </div>
              <div className="font-medium mb-1">{pillar.name}</div>
              <div className="text-sm opacity-80">{pillar.description}</div>
              {pillar.avg_impressions && (
                <div className="mt-2 text-xs">
                  Avg: {pillar.avg_impressions} impressions
                </div>
              )}
              <div className="mt-2 text-xs font-medium opacity-70">
                {pillar.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">2025 Performance</h2>
          <p className="text-sm text-gray-500">Based on your 33 LinkedIn posts</p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {historicalStats.total_impressions?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500">Total Impressions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {historicalStats.total_reactions || 0}
            </div>
            <div className="text-sm text-gray-500">Total Reactions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {historicalStats.avg_impressions?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500">Avg Impressions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {historicalStats.avg_reactions || 0}
            </div>
            <div className="text-sm text-gray-500">Avg Reactions</div>
          </div>
        </div>
      </div>

      {/* Posting Schedule */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recommended Schedule</h2>
          <p className="text-sm text-gray-500">3-4 posts per week</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">Monday</div>
              <div className="text-sm text-gray-600">Re-entry / Big picture</div>
              <div className="mt-1 text-xs text-linkedin-blue">Pillar D or A</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">Wednesday</div>
              <div className="text-sm text-gray-600">Category POV / Insight</div>
              <div className="mt-1 text-xs text-linkedin-blue">Pillar A or E</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">Thursday</div>
              <div className="text-sm text-gray-600">Tactical / Operator truth</div>
              <div className="mt-1 text-xs text-linkedin-blue">Pillar B or C</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">Friday</div>
              <div className="text-sm text-gray-600">Founder reflection</div>
              <div className="mt-1 text-xs text-linkedin-blue">Pillar D</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Formula */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Performing Formula</h2>
          <p className="text-sm text-gray-500">Personal story + Strong POV + Your photo</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-800">Bubble Bois AI discussion</span>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Top Performer</span>
              </div>
              <div className="text-sm text-green-700">
                6,342 impressions | 40 reactions
              </div>
              <div className="text-xs text-green-600 mt-2">
                Personal connection, hot take, SoftBank team photo
              </div>
            </div>
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-800">Morning routine reflection</span>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Top Performer</span>
              </div>
              <div className="text-sm text-green-700">
                5,692 impressions | 59 reactions
              </div>
              <div className="text-xs text-green-600 mt-2">
                Vulnerable, relatable, personal photo
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
