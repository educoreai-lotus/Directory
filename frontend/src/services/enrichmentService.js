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

    const response = await api.post(`/employees/${employeeId}/upload-cv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // Handle response format (could be wrapped in response.response or direct)
    return response?.data?.response || response?.data || response;
  } catch (error) {
    console.error('[enrichmentService] PDF upload error:', error);
    throw error;
  }
};

/**
 * Save manual profile data
 * PHASE_4: Save manual form data to backend
 * @param {string} employeeId - Employee UUID
 * @param {Object} data - Manual form data { name, email, current_role, target_role, bio (optional), projects (optional) }
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
    const response = await api.post(`/employees/${employeeId}/enrich`);

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

