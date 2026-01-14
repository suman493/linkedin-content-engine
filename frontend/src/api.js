import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ideas API
export const createIdea = (data) => api.post('/ideas', data);
export const getIdeas = (params) => api.get('/ideas', { params });
export const getIdea = (id) => api.get(`/ideas/${id}`);
export const updateIdea = (id, data) => api.patch(`/ideas/${id}`, data);
export const deleteIdea = (id) => api.delete(`/ideas/${id}`);

// Posts API
export const generatePost = (data) => api.post('/posts/generate', data);
export const getPosts = (params) => api.get('/posts', { params });
export const getPost = (id) => api.get(`/posts/${id}`);
export const updatePost = (id, data) => api.patch(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const copyPost = (id) => api.post(`/posts/${id}/copy`);
export const regeneratePost = (id, feedback) => api.post(`/posts/${id}/regenerate`, { feedback });

// Utility API
export const getPillars = () => api.get('/pillars');
export const getSimilarPosts = (pillar, limit = 3) =>
  api.get(`/pillars/${pillar}/similar-posts`, { params: { limit } });
export const getProfile = () => api.get('/profile');
export const getStats = () => api.get('/stats');
export const getScheduleRecommendations = () => api.get('/schedule/recommendations');

// Engagement Prediction API
export const predictEngagement = (id) => api.post(`/posts/${id}/predict`);
export const predictContentEngagement = (content, format) =>
  api.post('/posts/predict-content', { content, format });

// Content Extraction API
export const extractContent = (text, type) => api.post('/content/extract', { text, type });
export const extractFromUrl = (url) => api.post('/content/extract-url', { url });

// Analytics API
export const getHistoricalData = () => api.get('/analytics/historical');
export const updateHistoricalPostMetrics = (postId, data) =>
  api.patch(`/analytics/historical/${postId}`, data);
export const importCsvAnalytics = (posts) => api.post('/analytics/import-csv', { posts });
export const getCsvTemplate = () => api.get('/analytics/csv-template');

// Mobile/Integration APIs
export const getMobileSetup = () => api.get('/mobile-setup');
export const quickCapture = (text, source = 'web') => api.post('/quick-capture', { text, source });

export default api;
