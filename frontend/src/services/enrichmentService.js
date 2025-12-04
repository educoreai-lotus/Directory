// Frontend Service - Enrichment Service
// Handles extended enrichment flow API calls (PDF upload, manual data, enrichment trigger)
// PHASE_4: This file is part of the extended enrichment flow

import api from '../utils/api';

/**
 * Upload CV as PDF file
 * PHASE_4: Upload PDF CV to backend for extraction and storage
 * @param {string} employeeId - Employee UUID
 * @param {File} file - PDF file
 * @returns {Promise<Object>} Upload result
 */
export const uploadCV = async (employeeId, file) => {
  try {
    const formData = new FormData();
    formData.append('cv', file); // Backend expects field name 'cv'

    // Frontend calls: /employees/${employeeId}/upload-cv
    // baseURL already includes /api/v1, so full URL is: /api/v1/employees/${employeeId}/upload-cv
    console.log('[uploadCV] Calling POST /employees/' + employeeId + '/upload-cv');
    // Don't set Content-Type header - let browser set it automatically with boundary for FormData
    const response = await api.post(`/employees/${employeeId}/upload-cv`, formData);

    // Log response details
    console.log('[uploadCV] response status:', response.status);
    console.log('[uploadCV] response data:', response.data);
    console.log('[uploadCV] response.data.response:', response?.data?.response);

    // PHASE_4_FIX: Backend wraps response in microservice envelope:
    // { requester_service: "directory_service", response: { success: true } }
    // So we need to check response.data.response.success, not response.data.success
    const normalizedResponse = response?.data?.response || response?.data;
    console.log('[uploadCV] normalized response:', normalizedResponse);
    
    if (normalizedResponse?.success === true) {
      return { success: true };
    } else {
      console.warn('[uploadCV] Unexpected response data:', response?.data);
      throw new Error('Upload failed - no success response');
    }
  } catch (error) {
    console.error('[uploadCV] Error uploading CV:', error?.response?.status, error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Save manual profile data
 * PHASE_4: Save manual form data to backend
 * @param {string} employeeId - Employee UUID
 * @param {Object} data - Manual form data { work_experience (optional), skills (optional), education (optional) }
 * @returns {Promise<Object>} Save result
 */
export const saveManualData = async (employeeId, data) => {
  try {
    const response = await api.post(`/employees/${employeeId}/manual-data`, data);

    // Handle response format (could be wrapped in response.response or direct)
    return response?.data?.response || response?.data || response;
  } catch (error) {
    console.error('[enrichmentService] Manual data save error:', error);
    throw error;
  }
};

/**
 * Trigger profile enrichment
 * PHASE_4: Call backend to trigger enrichment with merged raw data
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<Object>} Enrichment result
 */
export const triggerEnrichment = async (employeeId) => {
  try {
    // IMPORTANT FIX: send a non-empty JSON body ({}).  
    // Without it, Axios triggers a preflight OPTIONS that never continues to POST.
    const response = await api.post(
      `/employees/${employeeId}/enrich`,
      { trigger: true } // <-- REQUIRED!
    );

    // Handle response format (could be wrapped in response.response or direct)
    return response?.data?.response || response?.data || response;
  } catch (error) {
    console.error('[enrichmentService] Enrichment trigger error:', error);
    throw error;
  }
};

/**
 * Get enrichment status
 * PHASE_4: Check if employee is ready for enrichment
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<Object>} Status object with ready_for_enrichment boolean
 */
export const getEnrichmentStatus = async (employeeId) => {
  try {
    const response = await api.get(`/employees/${employeeId}/enrichment-status`);

    // Handle response format (could be wrapped in response.response or direct)
    return response?.data?.response || response?.data || response;
  } catch (error) {
    console.error('[enrichmentService] Get enrichment status error:', error);
    throw error;
  }
};

