// Frontend Service - CSV Upload
// Handles CSV file upload to backend API

import api from '../utils/api';

export const uploadCSV = async (companyId, file) => {
  try {
    const formData = new FormData();
    formData.append('csvFile', file);

    const response = await api.post(`/companies/${companyId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('CSV upload error:', error);
    throw error;
  }
};

