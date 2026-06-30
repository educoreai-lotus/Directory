import {
  buildCourseBuilderRedirectUrl,
  buildDevLabRedirectUrl,
  buildLearningAnalyticsRedirectUrl
} from './ApprovedProfileTabs';

describe('buildCourseBuilderRedirectUrl', () => {
  const baseUrl = 'https://course-builder-alpha-nine.vercel.app/learner/dashboard';

  test('appends hash access_token with URL encoding', () => {
    const token = 'header.payload.signature';
    const url = buildCourseBuilderRedirectUrl(baseUrl, token);
    expect(url).toBe(
      `${baseUrl}/#access_token=${encodeURIComponent(token)}`
    );
    expect(url).toContain('#access_token=');
    expect(url).not.toContain('?userId=');
    expect(url).not.toContain('?');
  });

  test('encodes special characters in token', () => {
    const token = 'a+b/c=';
    const url = buildCourseBuilderRedirectUrl(baseUrl, token);
    expect(url).toBe(
      `${baseUrl}/#access_token=${encodeURIComponent(token)}`
    );
  });

  test('strips trailing slash from base URL before hash', () => {
    const url = buildCourseBuilderRedirectUrl(`${baseUrl}/`, 'token');
    expect(url).toBe(`${baseUrl}/#access_token=token`);
  });

  test('does not include userId query param', () => {
    const url = buildCourseBuilderRedirectUrl(baseUrl, 'jwt-token');
    expect(url).not.toMatch(/userId=/);
  });

  test('does not place token in query string', () => {
    const url = buildCourseBuilderRedirectUrl(baseUrl, 'secret.jwt.value');
    expect(url.indexOf('?')).toBe(-1);
    expect(url.split('#')[0]).not.toContain('secret.jwt.value');
  });
});

describe('buildDevLabRedirectUrl', () => {
  const baseUrl = 'https://devlab.example.com';

  test('returns dashboard URL with hash access_token', () => {
    expect(buildDevLabRedirectUrl(baseUrl, 'abc.123')).toBe(
      'https://devlab.example.com/dashboard#access_token=abc.123'
    );
  });

  test('base URL with trailing slash still returns single /dashboard path', () => {
    expect(buildDevLabRedirectUrl(`${baseUrl}/`, 'abc.123')).toBe(
      'https://devlab.example.com/dashboard#access_token=abc.123'
    );
    expect(buildDevLabRedirectUrl(`${baseUrl}///`, 'abc.123')).toBe(
      'https://devlab.example.com/dashboard#access_token=abc.123'
    );
  });

  test('encodes token with encodeURIComponent', () => {
    const token = 'a+b/c=';
    expect(buildDevLabRedirectUrl(baseUrl, token)).toBe(
      `${baseUrl}/dashboard#access_token=${encodeURIComponent(token)}`
    );
  });

  test('does not include query params or identity fields', () => {
    const url = buildDevLabRedirectUrl(baseUrl, 'jwt-token');
    expect(url).not.toContain('?access_token=');
    expect(url).not.toContain('?');
    expect(url).not.toContain('userId');
    expect(url).not.toContain('employeeId');
    expect(url).not.toContain('learner_id');
    expect(url).toContain('#access_token=');
  });

  test('returns null when base URL is missing or empty', () => {
    expect(buildDevLabRedirectUrl(undefined, 'token')).toBeNull();
    expect(buildDevLabRedirectUrl('', 'token')).toBeNull();
    expect(buildDevLabRedirectUrl('   ', 'token')).toBeNull();
  });

  test('returns null when token is missing or empty', () => {
    expect(buildDevLabRedirectUrl(baseUrl, undefined)).toBeNull();
    expect(buildDevLabRedirectUrl(baseUrl, '')).toBeNull();
    expect(buildDevLabRedirectUrl(baseUrl, '   ')).toBeNull();
  });
});

describe('buildLearningAnalyticsRedirectUrl', () => {
  const baseUrl = 'https://learning-analytics-frontend-psi.vercel.app';
  const token = 'header.payload.signature';
  const employeeId = 'emp-uuid-123';
  const companyId = 'company-uuid-456';

  test('employee redirect keeps userId query param and appends hash access_token', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, token);
    expect(url).toBe(
      `${baseUrl}?userId=${encodeURIComponent(employeeId)}#access_token=${encodeURIComponent(token)}`
    );
    expect(url).toContain('?userId=');
    expect(url).toContain('#access_token=');
  });

  test('company redirect keeps company_id query param and appends hash access_token', () => {
    const url = buildLearningAnalyticsRedirectUrl(
      baseUrl,
      { company_id: companyId },
      token
    );
    expect(url).toBe(
      `${baseUrl}/?company_id=${encodeURIComponent(companyId)}#access_token=${encodeURIComponent(token)}`
    );
    expect(url).toContain('?company_id=');
    expect(url).toContain('#access_token=');
  });

  test('does not place JWT in query string', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, token);
    const queryPart = url.split('#')[0];
    expect(queryPart).not.toContain('access_token');
    expect(queryPart).not.toContain(token);
  });

  test('encodes special characters in token', () => {
    const specialToken = 'a+b/c=';
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, specialToken);
    expect(url).toBe(
      `${baseUrl}?userId=${encodeURIComponent(employeeId)}#access_token=${encodeURIComponent(specialToken)}`
    );
  });

  test('returns null when token is missing or empty', () => {
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, undefined)).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, '')).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, { userId: employeeId }, '   ')).toBeNull();
  });

  test('returns null when identity is missing', () => {
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, {}, token)).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, { userId: '' }, token)).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, { company_id: '' }, token)).toBeNull();
  });

  test('uses default base URL when baseUrl is omitted', () => {
    const url = buildLearningAnalyticsRedirectUrl(undefined, { userId: employeeId }, token);
    expect(url).toContain('learning-analytics-frontend-psi.vercel.app?userId=');
    expect(url).toContain('#access_token=');
  });
});
