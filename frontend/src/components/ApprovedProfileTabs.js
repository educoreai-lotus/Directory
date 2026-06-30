// Component - Approved Profile Tabs
// Organizes approved employee profile sections into tabs

import React, { useState } from 'react';
import ProfileSkills from './ProfileSkills';
import ProfileCareerPath from './ProfileCareerPath';
import ProfileCourses from './ProfileCourses';
import LearningPath from './LearningPath';
import ProfileAnalytics from './ProfileAnalytics';
import ProfileDashboard from './ProfileDashboard';
import { getAccessToken } from '../auth/accessTokenStore';

const CONTENT_STUDIO_DEFAULT_URL = 'https://content-studio-two.vercel.app';
const COURSE_BUILDER_DEFAULT_URL =
  'https://course-builder-alpha-nine.vercel.app/learner/dashboard';
const LEARNING_ANALYTICS_DEFAULT_URL =
  'https://learning-analytics-frontend-psi.vercel.app';

export const LEARNING_ANALYTICS_MANAGER_ROLES = new Set([
  'HR',
  'DEPARTMENT_MANAGER',
  'TEAM_MANAGER'
]);

/** @param {string|undefined|null} value */
export function normalizeRole(value) {
  return String(value || '').trim().toUpperCase();
}

/**
 * @param {object|null|undefined} user - authenticated user from AuthContext /auth/me
 * @param {object|null|undefined} claims - decoded JWT payload
 */
export function collectAuthRoleSignals(user, claims = {}) {
  const safeUser = user || {};
  const safeClaims = claims || {};
  const primaryRole = normalizeRole(
    safeClaims.primaryRole ??
      safeClaims.primary_role ??
      safeUser.primaryRole ??
      safeUser.primary_role ??
      ''
  );
  const rolesRaw = safeClaims.roles ?? safeUser.roles ?? [];
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map(normalizeRole).filter(Boolean)
    : [];

  return {
    primaryRole,
    roles,
    isSystemAdmin:
      safeUser.isSystemAdmin === true ||
      safeUser.is_system_admin === true ||
      safeUser.isAdmin === true ||
      safeClaims.isSystemAdmin === true ||
      safeClaims.is_system_admin === true ||
      primaryRole === 'DIRECTORY_ADMIN' ||
      normalizeRole(safeUser.role) === 'DIRECTORY_ADMIN',
    isTrainer:
      safeUser.isTrainer === true ||
      safeClaims.isTrainer === true ||
      safeClaims.is_trainer === true,
    isHR:
      safeUser.isHR === true ||
      safeClaims.isHR === true ||
      safeClaims.is_hr === true ||
      primaryRole === 'HR',
    isDecisionMaker:
      safeUser.isDecisionMaker === true ||
      safeClaims.isDecisionMaker === true ||
      primaryRole === 'DECISION_MAKER' ||
      roles.includes('DECISION_MAKER'),
    organizationId:
      safeUser.organizationId ??
      safeUser.companyId ??
      safeUser.company_id ??
      safeClaims.organizationId ??
      safeClaims.organization_id ??
      ''
  };
}

/** @param {{ organizationId?: string }} signals */
export function hasValidOrganizationId(signals) {
  const org = signals?.organizationId;
  return org != null && String(org).trim() !== '' && String(org) !== 'undefined';
}

/** @param {ReturnType<typeof collectAuthRoleSignals>} signals */
export function resolveLearningAnalyticsDestination(signals) {
  if (signals.isSystemAdmin || signals.primaryRole === 'DIRECTORY_ADMIN') {
    return 'manager';
  }
  if (signals.isHR || signals.primaryRole === 'HR') {
    return 'manager';
  }
  if (LEARNING_ANALYTICS_MANAGER_ROLES.has(signals.primaryRole)) {
    return 'manager';
  }
  for (let i = 0; i < signals.roles.length; i += 1) {
    if (LEARNING_ANALYTICS_MANAGER_ROLES.has(signals.roles[i])) {
      return 'manager';
    }
  }
  return 'learner';
}

/** @param {string} baseUrl @param {string} accessToken */
export function buildCourseBuilderRedirectUrl(baseUrl, accessToken) {
  const normalized = (baseUrl || COURSE_BUILDER_DEFAULT_URL).replace(/\/$/, '');
  return `${normalized}/#access_token=${encodeURIComponent(accessToken)}`;
}

/** @param {string} url */
export function normalizeExternalUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * @param {string|undefined} baseUrl - DevLab frontend origin (REACT_APP_DEVLAB_URL)
 * @param {string|undefined} accessToken - nAuth JWT
 * @returns {string|null} Redirect URL or null when base URL or token is missing
 */
export function buildDevLabRedirectUrl(baseUrl, accessToken) {
  const normalized = normalizeExternalUrl(baseUrl);
  const token = String(accessToken || '').trim();
  if (!normalized || !token) {
    return null;
  }
  return `${normalized}/dashboard#access_token=${encodeURIComponent(token)}`;
}

/**
 * @param {string|undefined} baseUrl - Learning Analytics frontend origin
 * @param {string|undefined} accessToken - nAuth JWT
 * @param {{ destination?: 'learner'|'manager', selectedCompanyId?: string, includeSelectedCompanyForSystemAdmin?: boolean }} [options]
 * @returns {string|null} Redirect URL or null when token is missing
 */
export function buildLearningAnalyticsRedirectUrl(baseUrl, accessToken, options = {}) {
  const token = String(accessToken || '').trim();
  if (!token) {
    return null;
  }

  const destination = options.destination === 'manager' ? 'manager' : 'learner';
  const normalizedBase = normalizeExternalUrl(baseUrl || LEARNING_ANALYTICS_DEFAULT_URL);
  const path = destination === 'manager' ? '/manager/overview' : '/learner/overview';
  let urlWithoutHash = `${normalizedBase}${path}`;

  if (
    destination === 'manager' &&
    options.includeSelectedCompanyForSystemAdmin === true
  ) {
    const selectedCompanyId = options.selectedCompanyId;
    if (selectedCompanyId != null && String(selectedCompanyId).trim() !== '') {
      urlWithoutHash = `${urlWithoutHash}?company_id=${encodeURIComponent(selectedCompanyId)}`;
    }
  }

  return `${urlWithoutHash}#access_token=${encodeURIComponent(token)}`;
}

/**
 * @param {string|undefined} baseUrl
 * @param {string|undefined} accessToken
 * @param {object|null|undefined} user
 * @param {string|undefined} selectedCompanyId
 */
export function buildCompanyLearningAnalyticsRedirectUrl(
  baseUrl,
  accessToken,
  user,
  selectedCompanyId
) {
  const token = String(accessToken || '').trim();
  if (!token) {
    return null;
  }
  const claims = decodeJwtPayload(token) || {};
  const signals = collectAuthRoleSignals(user, claims);
  const includeSelectedCompanyForSystemAdmin =
    signals.isSystemAdmin && !hasValidOrganizationId(signals);

  return buildLearningAnalyticsRedirectUrl(baseUrl, token, {
    destination: 'manager',
    selectedCompanyId,
    includeSelectedCompanyForSystemAdmin
  });
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function ApprovedProfileTabs({ employeeId, user, employee, isViewOnly = false }) {
  const [activeTab, setActiveTab] = useState('skills');

  const claims = decodeJwtPayload(getAccessToken()) || {};
  const isTrainer =
    user?.isTrainer === true ||
    claims.isTrainer === true ||
    claims.is_trainer === true;

  const tabs = [
    { id: 'skills', label: 'Skills', component: ProfileSkills },
    { id: 'career-path', label: 'Career Path', component: ProfileCareerPath },
    { id: 'courses', label: 'Courses', component: ProfileCourses },
    { id: 'learning-path', label: 'Learning Path', component: LearningPath },
    { id: 'analytics', label: 'Analytics', component: ProfileAnalytics },
    { id: 'devlab', label: 'DevLab' }
  ];

  const handleCreateContentClick = () => {
    const baseUrl = (
      process.env.REACT_APP_CONTENT_STUDIO_URL || CONTENT_STUDIO_DEFAULT_URL
    ).replace(/\/$/, '');
    const accessToken = getAccessToken();
    const url =
      accessToken && String(accessToken).trim() !== ''
        ? `${baseUrl}/#access_token=${encodeURIComponent(accessToken)}`
        : `${baseUrl}/`;
    console.log('[ApprovedProfileTabs] Redirecting to Content Studio');
    window.location.href = url;
  };

  const handleTabClick = (tabId) => {
    if (tabId === 'analytics') {
      const accessToken = getAccessToken();
      if (!accessToken || String(accessToken).trim() === '') {
        console.warn('[ApprovedProfileTabs] Learning Analytics redirect blocked: missing access token');
        alert('Authentication token not found. Please sign in again.');
        return;
      }

      const claims = decodeJwtPayload(accessToken) || {};
      const signals = collectAuthRoleSignals(user, claims);
      const destination = resolveLearningAnalyticsDestination(signals);
      const baseUrl = process.env.REACT_APP_LEARNING_ANALYTICS_URL || LEARNING_ANALYTICS_DEFAULT_URL;
      const analyticsUrl = buildLearningAnalyticsRedirectUrl(baseUrl, accessToken, {
        destination
      });
      if (!analyticsUrl) {
        console.warn('[ApprovedProfileTabs] Learning Analytics redirect blocked: invalid redirect URL');
        alert('Authentication token not found. Please sign in again.');
        return;
      }

      console.log('[ApprovedProfileTabs] Redirecting to Learning Analytics');
      window.location.href = analyticsUrl;
    } else if (tabId === 'courses') {
      const baseUrl = (
        process.env.REACT_APP_COURSE_BUILDER_URL || COURSE_BUILDER_DEFAULT_URL
      ).replace(/\/$/, '');

      const accessToken = getAccessToken();
      if (!accessToken || String(accessToken).trim() === '') {
        console.warn('[ApprovedProfileTabs] Course Builder redirect blocked: missing access token');
        alert('Your session token is missing. Please sign in again and retry.');
        return;
      }

      const courseBuilderUrl = buildCourseBuilderRedirectUrl(baseUrl, accessToken);
      console.log('[ApprovedProfileTabs] Redirecting to Course Builder');
      window.location.href = courseBuilderUrl;
    } else if (tabId === 'learning-path') {
      // Redirect to Learner AI frontend with user ID + access token
      const baseUrl = process.env.REACT_APP_LEARNER_AI_URL || 'https://learner-ai-omega.vercel.app';
      
      if (!employeeId) {
        console.error('[ApprovedProfileTabs] Cannot redirect: Employee ID is missing');
        alert('Error: Employee ID not found. Please try again.');
        return;
      }

      const accessToken = getAccessToken();
      if (!accessToken || String(accessToken).trim() === '') {
        console.warn('[ApprovedProfileTabs] Learner AI redirect blocked: missing access token');
        alert('Your session token is missing. Please sign in again and retry.');
        return;
      }
      
      const learnerAIUrl = new URL(baseUrl);
      learnerAIUrl.searchParams.set('user_id', employeeId);
      learnerAIUrl.searchParams.set('access_token', accessToken);
      
      console.log('[ApprovedProfileTabs] Redirecting to Learner AI with user_id and token handoff');
      window.location.href = learnerAIUrl.toString();
    } else if (tabId === 'devlab') {
      const devlabBaseUrl = normalizeExternalUrl(process.env.REACT_APP_DEVLAB_URL);
      if (!devlabBaseUrl) {
        console.warn('[ApprovedProfileTabs] REACT_APP_DEVLAB_URL is not configured');
        alert('DevLab is not configured yet.');
        return;
      }

      const accessToken = getAccessToken();
      if (!accessToken || String(accessToken).trim() === '') {
        console.warn('[ApprovedProfileTabs] DevLab redirect blocked: missing access token');
        alert('Please sign in again through Directory before opening DevLab.');
        return;
      }

      const devlabUrl = buildDevLabRedirectUrl(devlabBaseUrl, accessToken);
      console.log('[ApprovedProfileTabs] Redirecting to DevLab');
      window.location.href = devlabUrl;
    } else {
      setActiveTab(tabId);
    }
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const inactiveTabStyle = {
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary, #475569)',
    background: 'transparent',
    cursor: 'pointer',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500'
  };

  const activeTabStyle = {
    ...inactiveTabStyle,
    borderBottom: '2px solid #047857',
    color: '#047857'
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-default, #e2e8f0)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={activeTab === tab.id ? activeTabStyle : inactiveTabStyle}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
        {isTrainer && (
          <button
            type="button"
            onClick={handleCreateContentClick}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={inactiveTabStyle}
            onMouseEnter={(e) => {
              e.target.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Create Content
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {ActiveComponent && <ActiveComponent employeeId={employeeId} user={user} employee={employee} isViewOnly={isViewOnly} />}
      </div>
    </div>
  );
}

export default ApprovedProfileTabs;

