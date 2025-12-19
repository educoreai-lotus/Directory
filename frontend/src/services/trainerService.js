// Frontend Service - Trainer Service
// Handles API calls for trainer-related operations

import api from '../utils/api';

/**
 * Get trainer settings for an employee
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<Object>} Trainer settings
 */
export const getTrainerSettings = async (employeeId) => {
  try {
    const response = await api.get(`/employees/${employeeId}/trainer-settings`);
    
    // Handle response format
    if (response.data && response.data.response) {
      return response.data.response.settings || response.data.response;
    }
    
    return response.data.settings || response.data;
  } catch (error) {
    console.error('Get trainer settings error:', error);
    throw error;
  }
};

/**
 * Update trainer settings
 * @param {string} employeeId - Employee UUID
 * @param {Object} settings - Settings object with aiEnabled and publicPublishEnable
 * @returns {Promise<Object>} Updated settings
 */
export const updateTrainerSettings = async (employeeId, settings) => {
  try {
    const response = await api.put(`/employees/${employeeId}/trainer-settings`, settings);
    
    // Handle response format - backend returns { requester_service, response: { success, settings } }
    if (response.data && response.data.response) {
      // Return the settings object directly
      return response.data.response.settings || response.data.response;
    }
    
    // Fallback for direct response
    return response.data.settings || response.data;
  } catch (error) {
    console.error('Update trainer settings error:', error);
    // Extract error message from response
    const errorMessage = error.response?.data?.response?.error || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to update settings';
    throw new Error(errorMessage);
  }
};

/**
 * Get courses taught by trainer
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<Array>} Array of courses
 */
export const getCoursesTaught = async (employeeId) => {
  try {
    const response = await api.get(`/employees/${employeeId}/courses-taught`);
    
    // Handle response format
    if (response.data && response.data.response) {
      return response.data.response.courses || [];
    }
    
    return response.data.courses || [];
  } catch (error) {
    console.error('Get courses taught error:', error);
    throw error;
  }
};

