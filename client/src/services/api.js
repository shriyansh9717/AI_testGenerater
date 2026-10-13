import axios from 'axios';

const TOKEN_KEY = 'atg.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      if (onUnauthorized) onUnauthorized();
    }

    const normalized = new Error(
      payload?.message ||
        (error.code === 'ECONNABORTED'
          ? 'That took too long. Check your connection and try again.'
          : 'The server could not be reached.')
    );
    normalized.status = status;
    normalized.details = payload?.details;
    return Promise.reject(normalized);
  }
);

const unwrap = (promise) => promise.then((res) => res.data.data);

export const authApi = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  me: () => unwrap(api.get('/auth/me')),
  updateProfile: (payload) => unwrap(api.patch('/auth/profile', payload)),
};

export const documentsApi = {
  upload: (formData, onUploadProgress) =>
    unwrap(api.post('/documents/upload', formData, { onUploadProgress })),
  process: (payload) => unwrap(api.post('/documents/process', payload)),
  list: () => unwrap(api.get('/documents')),
};

export const questionsApi = {
  generate: (payload) => unwrap(api.post('/questions/generate', payload)),
  list: (params) => unwrap(api.get('/questions', { params })),
  remove: (id) => unwrap(api.delete(`/questions/${id}`)),
};

export const patternsApi = {
  list: () => unwrap(api.get('/exam-patterns')),
  create: (payload) => unwrap(api.post('/exam-patterns', payload)),
  remove: (id) => unwrap(api.delete(`/exam-patterns/${id}`)),
};

export const testsApi = {
  create: (payload) => unwrap(api.post('/tests', payload)),
  list: () => unwrap(api.get('/tests')),
  get: (id) => unwrap(api.get(`/tests/${id}`)),
  remove: (id) => unwrap(api.delete(`/tests/${id}`)),
  start: (id, payload = {}) => unwrap(api.post(`/tests/${id}/start`, payload)),
  saveProgress: (id, attemptId, payload) =>
    unwrap(api.patch(`/tests/${id}/attempts/${attemptId}`, payload)),
  submit: (id, payload) => unwrap(api.post(`/tests/${id}/submit`, payload)),
};

export const resultsApi = {
  list: () => unwrap(api.get('/results')),
  get: (id) => unwrap(api.get(`/results/${id}`)),
};

export const analyticsApi = {
  get: () => unwrap(api.get('/analytics')),
};

export default api;
