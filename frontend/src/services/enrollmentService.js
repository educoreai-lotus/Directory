// Frontend Service - Enrollment Service
// Handles employee enrollment API calls

import api from '../utils/api';

console.log('[enrollmentService] Module loaded/imported');

/**
 * Enroll employees via career-path-driven learning flow
 * @param {string} companyId - Company ID
 * @param {Array<string>} employeeIds - Array of employee UUIDs
 * @returns {Promise<Object>} Enrollment result
 */
export const enrollCareerPath = async (companyId, employeeIds) => {
  console.log('[enrollmentService] enrollCareerPath CALLED with:', {
    companyId,
    employeeIds,
    employeeIdsCount: employeeIds?.length || 0,
    employeeIdsType: Array.isArray(employeeIds) ? 'array' : typeof employeeIds
  });

  try {
    console.log('[enrollmentService] Enrolling employees via career-path:', {
      companyId,
      employeeIdsCount: employeeIds.length
    });

    const url = `/companies/${companyId}/enrollments/career-path`;
    const requestBody = { employeeIds };
    
    // Log the final resolved URL that Axios will send
    const finalUrl = api.defaults.baseURL + url;
    console.log('[DEBUG] Final Axios URL =', finalUrl);
    console.log('[DEBUG] api.defaults.baseURL =', api.defaults.baseURL);
    console.log('[DEBUG] Relative URL =', url);
    console.log('[enrollmentService] About to call api.post with:', {
      url,
      requestBody,
      requestBodyType: typeof requestBody,
      baseURL: api.defaults.baseURL,
      finalResolvedURL: finalUrl
    });

    // api.js interceptor will wrap this in envelope format
    console.log('[enrollmentService] Calling api.post NOW...');
    const response = await api.post(url, requestBody);
    console.log('[enrollmentService] api.post completed, response received:', {
      status: response?.status,
      hasData: !!response?.data
    });

    // Handle response format (could be wrapped in response.response or direct)
    const result = response?.data?.response || response?.data;
    
    console.log('[enrollmentService] Enrollment response:', result);
    
    return result;
  } catch (error) {
    console.error('[enrollmentService] Enrollment error:', error);
    
    // Extract error message from response
    const errorMessage = error.response?.data?.response?.message 
      || error.response?.data?.response?.details
      || error.response?.data?.message
      || error.message
      || 'Failed to enroll employees';
    
    throw new Error(errorMessage);
  }
};

