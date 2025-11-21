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
    const response = await api.put(`/companies/${companyId}/employees/${employeeId}`, employeeData);
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

export const getEmployeeSkills = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/skills`);
    return response.data;
  } catch (error) {
    console.error('Get employee skills error:', error);
    throw error;
  }
};

export const getEmployeeCourses = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/courses`);
    return response.data;
  } catch (error) {
    console.error('Get employee courses error:', error);
    throw error;
  }
};

export const getEmployeeLearningPath = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/learning-path`);
    return response.data;
  } catch (error) {
    console.error('Get employee learning path error:', error);
    throw error;
  }
};

export const getEmployeeDashboard = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/dashboard`);
    return response.data;
  } catch (error) {
    console.error('Get employee dashboard error:', error);
    throw error;
  }
};

export const submitEmployeeRequest = async (companyId, employeeId, requestData) => {
  try {
    const response = await api.post(`/companies/${companyId}/employees/${employeeId}/requests`, requestData);
    return response.data;
  } catch (error) {
    console.error('Submit employee request error:', error);
    throw error;
  }
};

export const getEmployeeRequests = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/requests`);
    return response.data;
  } catch (error) {
    console.error('Get employee requests error:', error);
    throw error;
  }
};

export const getCompanyRequests = async (companyId, status = null) => {
  try {
    const url = status 
      ? `/companies/${companyId}/requests?status=${status}`
      : `/companies/${companyId}/requests`;
    console.log('[getCompanyRequests] Calling API:', url);
    const response = await api.get(url);
    console.log('[getCompanyRequests] Raw response:', response);
    console.log('[getCompanyRequests] response.data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get company requests error:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

export const getManagerHierarchy = async (companyId, employeeId) => {
  try {
    const response = await api.get(`/companies/${companyId}/employees/${employeeId}/management-hierarchy`);
    return response.data;
  } catch (error) {
    console.error('Get manager hierarchy error:', error);
    throw error;
  }
};

