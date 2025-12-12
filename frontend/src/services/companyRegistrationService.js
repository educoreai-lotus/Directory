import api from '../utils/api';

/**
 * Register a new company
 * @param {Object} companyData - Company registration data
 * @returns {Promise<Object>} Response with company_id
 */
export const registerCompany = async (companyData) => {
  try {
    const response = await api.post('/companies/register', {
      requester_service: 'directory_service',
      payload: companyData
    });

    // After successful company registration, inject dummy token for dummy mode
    // This ensures CSV upload and other operations work without requiring login
    const isDummyMode = process.env.REACT_APP_AUTH_MODE === 'dummy' || !process.env.REACT_APP_AUTH_MODE;
    if (isDummyMode) {
      const dummyToken = 'dummy-token';
      localStorage.setItem('auth_token', dummyToken);
      console.log('[companyRegistrationService] Dummy mode: Injected dummy token after company registration');
    }

    return response.data;
  } catch (error) {
    console.error('Company registration error:', error);
    throw error;
  }
};

