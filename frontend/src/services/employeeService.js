// Frontend Service - Employee Management
// Handles CRUD operations for employees

import api from '../utils/api';

export const addEmployee = async (companyId, employeeData) => {
  try {
    const response = await api.post(`/companies/${companyId}/employees`, {
      requester_service: 'directory_service',
      payload: employeeData
    });
    return response.data;
  } catch (error) {
    console.error('Add employee error:', error);
    throw error;
  }
};

export const updateEmployee = async (companyId, employeeId, employeeData) => {
  try {
    const response = await api.put(`/companies/${companyId}/employees/${employeeId}`, {
      requester_service: 'directory_service',
      payload: employeeData
    });
    return response.data;
  } catch (error) {
    console.error('Update employee error:', error);
    throw error;
  }
};

export const deleteEmployee = async (companyId, employeeId) => {
  try {
    const response = await api.delete(`/companies/${companyId}/employees/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error('Delete employee error:', error);
    throw error;
  }
};

export const getEmployee = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}`);
    return response.data;
  } catch (error) {
    console.error('Get employee error:', error);
    throw error;
  }
};

