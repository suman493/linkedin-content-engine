import React, { useState, useEffect } from 'react';
import { getPosts, updatePost, deletePost } from '../api';

const STATUS_CONFIG = {
  draft: { label: 'Drafts', color: 'bg-gray-100 border-gray-300' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 border-blue-300' },
  published: { label: 'Published', color: 'bg-green-50 border-green-300' },
};

const PILLAR_INFO = {
  A: { colors: 'bg-blue-100 text-blue-800', name: 'Offsites as Infrastructure' },
  B: { colors: 'bg-red-100 text-red-800', name: 'What Actually Breaks' },
  C: { colors: 'bg-green-100 text-green-800', name: 'Proof > Promises' },
  D: { colors: 'bg-purple-100 text-purple-800', name: 'Founder POV' },
  E: { colors: 'bg-yellow-100 text-yellow-800', name: 'Category Education' },
  External: { colors: 'bg-gray-100 text-gray-700', name: 'External/Reposts' },
  Personal: { colors: 'bg-pink-100 text-pink-800', name: 'Personal' },
};

function PostQueue({ pillars, onEditPost, refreshKey }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // 'kanban' or 'calendar'

  useEffect(() => {
    loadPosts();
  }, [refreshKey]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts();
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (postId, newStatus) => {
    try {
      await updatePost(postId, { status: newStatus });
      setPosts(posts.map((p) => (p.id === postId ? { ...p, status: newStatus } : p)));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm('Delete this post?')) {
      try {
        await deletePost(postId);
        setPosts(posts.filter((p) => p.id !== postId));
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const getPostsByStatus = (status) => posts.filter((p) => p.status === status);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading posts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'kanban'
                ? 'bg-linkedin-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Kanban View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'calendar'
                ? 'bg-linkedin-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Calendar View
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {posts.length} total posts
        </div>
      </div>

      {view === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className={`rounded-lg border-2 ${config.color}`}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{config.label}</h3>
                  <span className="text-sm text-gray-500">
                    {getPostsByStatus(status).length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4 min-h-[200px]">
                {getPostsByStatus(status).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No {config.label.toLowerCase()}
                  </p>
                ) : (
                  getPostsByStatus(status).map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onEdit={() => onEditPost(post)}
                      onDelete={() => handleDelete(post.id)}
                      onCopy={() => handleCopy(post.content)}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar View */
        <CalendarView
          posts={posts}
          onEditPost={onEditPost}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function PostCard({ post, onEdit, onDelete, onCopy, onStatusChange }) {
  const [showActions, setShowActions] = useState(false);

  const getPillar = () => {
    if (post.ideas && post.ideas.length > 0 && post.ideas[0].pillar) {
      return post.ideas[0].pillar;
    }
    return null;
  };

  const pillar = getPillar();

  return (
    <div
      className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-2">
        {pillar && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${PILLAR_INFO[pillar]?.colors || 'bg-gray-100 text-gray-700'}`}
            title={PILLAR_INFO[pillar]?.name || pillar}
          >
            {pillar}: {PILLAR_INFO[pillar]?.name?.split(' ')[0] || pillar}
          </span>
        )}
        <span className="text-xs text-gray-400">{post.format}</span>
      </div>

      <p className="text-sm text-gray-700 line-clamp-3 mb-3">
        {post.content}
      </p>

      {post.scheduled_date && (
        <div className="text-xs text-gray-500 mb-2">
          Scheduled: {post.scheduled_date} {post.scheduled_time}
        </div>
      )}

      {showActions && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs text-linkedin-blue hover:underline"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
          <select
            value={post.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(post.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>
      )}
    </div>
  );
}

function CalendarView({ posts, onEditPost, onStatusChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add padding for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getPostsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter((p) => p.scheduled_date === dateStr);
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const recommendedDays = ['Monday', 'Wednesday', 'Thursday', 'Friday'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-medium text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-2 ${
                recommendedDays.includes(day === 'Mon' ? 'Monday' : day === 'Wed' ? 'Wednesday' : day === 'Thu' ? 'Thursday' : day === 'Fri' ? 'Friday' : day)
                  ? 'text-linkedin-blue'
                  : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const postsForDay = getPostsForDate(day);
            const isToday = day && day.toDateString() === new Date().toDateString();
            const dayOfWeek = day ? dayNames[day.getDay()] : '';
            const isRecommended = ['Mon', 'Wed', 'Thu', 'Fri'].includes(dayOfWeek);

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border rounded ${
                  day
                    ? isToday
                      ? 'bg-linkedin-light border-linkedin-blue'
                      : isRecommended
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm mb-1 ${isToday ? 'font-bold text-linkedin-blue' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {postsForDay.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => onEditPost(post)}
                          className={`text-xs p-1 rounded truncate cursor-pointer ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : post.status === 'scheduled'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {post.content.substring(0, 20)}...
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 flex items-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-50 border border-blue-100 rounded mr-1"></div>
          Recommended posting days
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-100 rounded mr-1"></div>
          Scheduled
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
          Published
        </div>
      </div>
    </div>
  );
}

export default PostQueue;
