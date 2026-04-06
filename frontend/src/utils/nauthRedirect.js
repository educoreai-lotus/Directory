/**
 * Send the user to the nAuth-hosted login (Directory does not serve a password login).
 */
export function redirectToNAuthLogin() {
  const base = process.env.REACT_APP_NAUTH_FRONTEND_URL;
  if (!base) {
    console.error('[nauthRedirect] REACT_APP_NAUTH_FRONTEND_URL is not set');
    return;
  }
  const normalized = String(base).replace(/\/$/, '');
  window.location.href = `${normalized}/login`;
}
