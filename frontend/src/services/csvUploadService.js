// Frontend Service - CSV Upload
// Handles CSV file upload to backend API

import api from '../utils/api';

export const uploadCSV = async (companyId, file) => {
  try {
    console.log('[csvUploadService] Creating FormData for CSV upload');
    console.log('[csvUploadService] Company ID:', companyId);
    console.log('[csvUploadService] File name:', file.name);
    console.log('[csvUploadService] File size:', file.size, 'bytes');
    console.log('[csvUploadService] File type:', file.type);
    
    const formData = new FormData();
    formData.append('csvFile', file);
    
    // Verify FormData was created correctly
    console.log('[csvUploadService] FormData created, field name: csvFile');
    console.log('[csvUploadService] FormData has file:', formData.has('csvFile'));
    
    // DO NOT set Content-Type header - let browser set it automatically with boundary
    // The api.js interceptor will handle removing Content-Type for FormData
    const response = await api.post(`/companies/${companyId}/upload`, formData);
    
    console.log('[csvUploadService] Upload successful');
    return response.data;
  } catch (error) {
    console.error('[csvUploadService] CSV upload error:', error);
    console.error('[csvUploadService] Error response:', error.response?.data);
    throw error;
  }
};

