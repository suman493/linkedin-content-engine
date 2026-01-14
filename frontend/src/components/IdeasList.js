import React, { useState, useEffect } from 'react';
import { getIdeas, updateIdea, deleteIdea } from '../api';

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

const STATUS_COLORS = {
  captured: 'bg-gray-100 text-gray-800',
  drafted: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
};

function IdeasList({ pillars, selectedIdeas, onSelectIdeas, onGeneratePost, refreshKey }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPillar, setFilterPillar] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadIdeas();
  }, [refreshKey, filterPillar, filterStatus]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterPillar) params.pillar = filterPillar;
      if (filterStatus) params.status = filterStatus;
      const response = await getIdeas(params);
      setIdeas(response.data);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIdea = (idea) => {
    const isSelected = selectedIdeas.some((i) => i.id === idea.id);
    if (isSelected) {
      onSelectIdeas(selectedIdeas.filter((i) => i.id !== idea.id));
    } else {
      onSelectIdeas([...selectedIdeas, idea]);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this idea?')) {
      try {
        await deleteIdea(id);
        setIdeas(ideas.filter((i) => i.id !== id));
        onSelectIdeas(selectedIdeas.filter((i) => i.id !== id));
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    }
  };

  const handleUpdatePillar = async (id, newPillar) => {
    try {
      await updateIdea(id, { pillar: newPillar });
      setIdeas(ideas.map((i) => (i.id === id ? { ...i, pillar: newPillar } : i)));
    } catch (error) {
      console.error('Error updating pillar:', error);
    }
  };

  const filteredIdeas = ideas.filter((idea) =>
    idea.raw_input.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSelected = (idea) => selectedIdeas.some((i) => i.id === idea.id);

  return (
    <div className="space-y-6">
      {/* Selection Bar */}
      {selectedIdeas.length > 0 && (
        <div className="bg-linkedin-light border border-linkedin-blue rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="font-medium text-linkedin-blue">
              {selectedIdeas.length} idea{selectedIdeas.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onSelectIdeas([])}
              className="ml-4 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={() => onGeneratePost(selectedIdeas)}
            className="px-4 py-2 bg-linkedin-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Post from Selection
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
            />
          </div>
          <select
            value={filterPillar}
            onChange={(e) => setFilterPillar(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
          >
            <option value="">All Pillars</option>
            {Object.entries(PILLAR_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                Pillar {key}: {name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-blue focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="captured">Captured</option>
            <option value="drafted">Drafted</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading ideas...</div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500 mb-4">No ideas found</div>
          <p className="text-sm text-gray-400">
            Capture some ideas to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                isSelected(idea)
                  ? 'ring-2 ring-linkedin-blue shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleSelectIdea(idea)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected(idea)}
                    onChange={() => handleSelectIdea(idea)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-linkedin-blue rounded focus:ring-linkedin-blue"
                  />
                  {idea.pillar && (
                    <select
                      value={idea.pillar}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdatePillar(idea.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs px-2 py-1 rounded border ${PILLAR_COLORS[idea.pillar]} cursor-pointer`}
                    >
                      {Object.entries(PILLAR_NAMES).map(([key, name]) => (
                        <option key={key} value={key}>
                          {key}: {name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idea.id);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-700 text-sm mb-3 line-clamp-4">
                {idea.raw_input}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className={`px-2 py-1 rounded ${STATUS_COLORS[idea.status]}`}>
                  {idea.status}
                </span>
                <span>
                  {new Date(idea.created_at).toLocaleDateString()}
                </span>
              </div>

              {idea.pillar_confidence && (
                <div className="mt-2 text-xs text-gray-400">
                  {Math.round(idea.pillar_confidence * 100)}% confidence
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IdeasList;
