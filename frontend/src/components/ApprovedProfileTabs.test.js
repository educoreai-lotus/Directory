import {
  buildCourseBuilderRedirectUrl,
  buildDevLabRedirectUrl,
  buildLearningAnalyticsRedirectUrl,
  buildCompanyLearningAnalyticsRedirectUrl,
  collectAuthRoleSignals,
  resolveLearningAnalyticsDestination
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

describe('resolveLearningAnalyticsDestination', () => {
  test('regular employee routes to learner', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({}, { primary_role: 'REGULAR_EMPLOYEE' })
      )
    ).toBe('learner');
  });

  test('trainer only routes to learner', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({ isTrainer: true }, { primary_role: 'TRAINER', is_trainer: true })
      )
    ).toBe('learner');
  });

  test('HR routes to manager', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({ isHR: true }, { primary_role: 'HR' })
      )
    ).toBe('manager');
  });

  test('DEPARTMENT_MANAGER routes to manager', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({}, { primary_role: 'DEPARTMENT_MANAGER' })
      )
    ).toBe('manager');
  });

  test('TEAM_MANAGER routes to manager', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({}, { roles: ['TEAM_MANAGER'] })
      )
    ).toBe('manager');
  });

  test('isSystemAdmin routes to manager', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({ isSystemAdmin: true }, {})
      )
    ).toBe('manager');
  });

  test('DIRECTORY_ADMIN routes to manager', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({}, { primary_role: 'DIRECTORY_ADMIN' })
      )
    ).toBe('manager');
  });

  test('DECISION_MAKER routes to learner', () => {
    expect(
      resolveLearningAnalyticsDestination(
        collectAuthRoleSignals({ isDecisionMaker: true }, { primary_role: 'DECISION_MAKER' })
      )
    ).toBe('learner');
  });

  test('isTrainer alone does not produce manager destination', () => {
    const signals = collectAuthRoleSignals(
      { isTrainer: true },
      { primary_role: 'TRAINER', is_trainer: true }
    );
    expect(resolveLearningAnalyticsDestination(signals)).toBe('learner');
    expect(signals.isTrainer).toBe(true);
  });
});

describe('buildLearningAnalyticsRedirectUrl', () => {
  const baseUrl = 'https://learning-analytics-frontend-psi.vercel.app';
  const token = 'header.payload.signature';
  const companyId = 'company-uuid-456';

  test('learner destination uses /learner/overview with hash only', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, token, { destination: 'learner' });
    expect(url).toBe(
      `${baseUrl}/learner/overview#access_token=${encodeURIComponent(token)}`
    );
    expect(url).not.toContain('userId');
    expect(url).not.toContain('company_id');
    expect(url).not.toContain('?');
  });

  test('manager destination uses /manager/overview with hash only', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, token, { destination: 'manager' });
    expect(url).toBe(
      `${baseUrl}/manager/overview#access_token=${encodeURIComponent(token)}`
    );
    expect(url).not.toContain('userId');
    expect(url).not.toContain('company_id');
  });

  test('system admin selected company adds company_id query before hash', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, token, {
      destination: 'manager',
      selectedCompanyId: companyId,
      includeSelectedCompanyForSystemAdmin: true
    });
    expect(url).toBe(
      `${baseUrl}/manager/overview?company_id=${encodeURIComponent(companyId)}#access_token=${encodeURIComponent(token)}`
    );
  });

  test('does not place JWT in query string', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, token, { destination: 'learner' });
    const queryPart = url.split('#')[0];
    expect(queryPart).not.toContain('access_token');
    expect(queryPart).not.toContain(token);
  });

  test('encodes special characters in token', () => {
    const specialToken = 'a+b/c=';
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, specialToken, { destination: 'learner' });
    expect(url).toBe(
      `${baseUrl}/learner/overview#access_token=${encodeURIComponent(specialToken)}`
    );
  });

  test('returns null when token is missing or empty', () => {
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, undefined, { destination: 'learner' })).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, '', { destination: 'learner' })).toBeNull();
    expect(buildLearningAnalyticsRedirectUrl(baseUrl, '   ', { destination: 'learner' })).toBeNull();
  });

  test('strips trailing slash from base URL', () => {
    const url = buildLearningAnalyticsRedirectUrl(`${baseUrl}/`, token, { destination: 'learner' });
    expect(url).toBe(`${baseUrl}/learner/overview#access_token=${encodeURIComponent(token)}`);
  });

  test('uses default base URL when baseUrl is omitted', () => {
    const url = buildLearningAnalyticsRedirectUrl(undefined, token, { destination: 'learner' });
    expect(url).toContain('learning-analytics-frontend-psi.vercel.app/learner/overview');
    expect(url).toContain('#access_token=');
  });

  test('JWT only appears after hash', () => {
    const url = buildLearningAnalyticsRedirectUrl(baseUrl, token, { destination: 'manager' });
    expect(url.indexOf('#access_token=')).toBeGreaterThan(0);
    expect(url.split('#')[0]).not.toContain(token);
  });
});

describe('buildCompanyLearningAnalyticsRedirectUrl', () => {
  const baseUrl = 'https://learning-analytics-frontend-psi.vercel.app';
  const token = 'header.payload.signature';
  const companyId = 'company-uuid-456';

  test('HR user does not include company_id query param', () => {
    const url = buildCompanyLearningAnalyticsRedirectUrl(
      baseUrl,
      token,
      { isHR: true, organizationId: companyId },
      companyId
    );
    expect(url).toBe(`${baseUrl}/manager/overview#access_token=${encodeURIComponent(token)}`);
    expect(url).not.toContain('company_id');
  });

  test('system admin without organizationId includes selected company_id', () => {
    const url = buildCompanyLearningAnalyticsRedirectUrl(
      baseUrl,
      token,
      { isSystemAdmin: true },
      companyId
    );
    expect(url).toBe(
      `${baseUrl}/manager/overview?company_id=${encodeURIComponent(companyId)}#access_token=${encodeURIComponent(token)}`
    );
  });

  test('system admin with organizationId does not include company_id', () => {
    const url = buildCompanyLearningAnalyticsRedirectUrl(
      baseUrl,
      token,
      { isSystemAdmin: true, organizationId: companyId },
      companyId
    );
    expect(url).toBe(`${baseUrl}/manager/overview#access_token=${encodeURIComponent(token)}`);
    expect(url).not.toContain('company_id');
  });
});
