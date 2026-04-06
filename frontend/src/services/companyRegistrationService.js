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

    return response.data;
  } catch (error) {
    console.error('Company registration error:', error);
    throw error;
  }
};

