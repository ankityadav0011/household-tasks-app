import { API_URL as DEFAULT_BASE_URL } from '../config';

export { DEFAULT_BASE_URL };

// The server address can be changed at runtime (Server settings), which is what makes a built APK usable
// with whichever laptop is running the backend.
let baseUrl = DEFAULT_BASE_URL;
export const getBaseUrl = () => baseUrl;
export const setBaseUrl = (url) => {
  baseUrl = String(url).trim().replace(/\/+$/, '');
};

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message, details }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message:
        err.name === 'AbortError'
          ? 'The request timed out. Please check your connection and try again.'
          : 'Cannot reach the server. Check your connection and the server address, then try again.',
    });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // empty or non-JSON body
  }

  if (!res.ok) {
    const err = data && data.error;
    const apiError = new ApiError({
      status: res.status,
      code: (err && err.code) || 'UNKNOWN',
      message: (err && err.message) || 'Something went wrong. Please try again.',
      details: err && err.details,
    });
    if (res.status === 401 && apiError.code === 'INVALID_TOKEN' && onUnauthorized) onUnauthorized();
    throw apiError;
  }
  return data;
}

export const api = {
  register: (payload) => request('POST', '/api/auth/register', payload),
  verifyOtp: (email, code) => request('POST', '/api/auth/verify-otp', { email, code }),
  resendOtp: (email) => request('POST', '/api/auth/resend-otp', { email }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  me: () => request('GET', '/api/auth/me'),
  getProfile: () => request('GET', '/api/profile'),
  saveProfile: (profile) => request('PUT', '/api/profile', profile),
  getTasks: () => request('GET', '/api/tasks'),
  getSelectedTasks: () => request('GET', '/api/tasks/selection'),
  saveTaskSelection: (taskIds) => request('PUT', '/api/tasks/selection', { taskIds }),
};
