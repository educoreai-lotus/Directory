import api from '../utils/api';

/**
 * Get company verification status
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Verification status response
 */
export const getCompanyVerificationStatus = async (companyId) => {
  try {
    const response = await api.get(`/companies/${companyId}/verification`);

    return response.data;
  } catch (error) {
    console.error('Company verification status error:', error);
    throw error;
  }
};

/**
 * Trigger domain verification manually
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Verification result
 */
export const triggerVerification = async (companyId) => {
  try {
    const response = await api.post(`/companies/${companyId}/verify`, {
      requester_service: 'directory_service',
      payload: {}
    });

    return response.data;
  } catch (error) {
    console.error('Trigger verification error:', error);
    throw error;
  }
};
