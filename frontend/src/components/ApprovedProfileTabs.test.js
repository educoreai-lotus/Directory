import { buildCourseBuilderRedirectUrl, buildDevLabRedirectUrl } from './ApprovedProfileTabs';

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
  test('returns normalized URL with trailing slash', () => {
    expect(buildDevLabRedirectUrl('https://devlab.example.com')).toBe(
      'https://devlab.example.com/'
    );
  });

  test('strips trailing slashes from configured URL', () => {
    expect(buildDevLabRedirectUrl('https://devlab.example.com///')).toBe(
      'https://devlab.example.com/'
    );
  });

  test('returns null when env URL is missing or empty', () => {
    expect(buildDevLabRedirectUrl(undefined)).toBeNull();
    expect(buildDevLabRedirectUrl('')).toBeNull();
    expect(buildDevLabRedirectUrl('   ')).toBeNull();
  });

  test('does not include access_token or identity query params', () => {
    const url = buildDevLabRedirectUrl('https://devlab.example.com');
    expect(url).not.toContain('access_token');
    expect(url).not.toContain('userId');
    expect(url).not.toContain('employeeId');
    expect(url).not.toContain('learner_id');
    expect(url).not.toContain('?');
    expect(url).not.toContain('#');
  });
});
