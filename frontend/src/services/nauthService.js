const NAUTH_BASE_URL =
  process.env.REACT_APP_NAUTH_BASE_URL || 'https://nauth-production.up.railway.app';

export async function refreshAccessToken() {
  const resp = await fetch(`${NAUTH_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.error || data?.message || 'Failed to refresh access token';
    throw new Error(message);
  }

  // nAuth contract: refresh returns token at data.data.accessToken
  const token = data?.data?.accessToken || '';
  if (!token) {
    throw new Error('nAuth refresh did not return an access token');
  }

  return token;
}

