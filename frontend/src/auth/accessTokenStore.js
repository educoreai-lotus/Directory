// nAuth access token: survives full page reloads (e.g. LinkedIn/GitHub OAuth return) within the same tab.
const STORAGE_KEY = 'directory_nauth_access_token';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEY, accessToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function getAccessToken() {
  if (accessToken) {
    return accessToken;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      accessToken = stored;
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearAccessToken() {
  accessToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
