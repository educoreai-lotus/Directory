// Tests for NAuthRequestController — is_trainer on POST /request lookup responses

jest.mock('../../infrastructure/EmployeeRepository');
jest.mock('../../infrastructure/AdminRepository');

const NAuthRequestController = require('../../presentation/NAuthRequestController');

describe('NAuthRequestController', () => {
  let controller;
  let mockPoolQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NAuthRequestController();
    mockPoolQuery = jest.fn();
    controller.employeeRepository.pool = { query: mockPoolQuery };
  });

  describe('buildFoundResponse', () => {
    const employee = {
      id: 'emp-uuid',
      company_id: 'company-uuid',
      full_name: 'Jane Doe',
      organization_name: 'Acme Corp'
    };

    test('includes is_trainer true when enrichment sets it', () => {
      const result = controller.buildFoundResponse(employee, {
        roles: ['TRAINER'],
        primary_role: 'TRAINER',
        is_system_admin: false,
        is_trainer: true
      });
      expect(result.response.is_trainer).toBe(true);
      expect(result.response.roles).toEqual(['TRAINER']);
      expect(result.response.primary_role).toBe('TRAINER');
      expect(result.response.is_system_admin).toBe(false);
    });

    test('includes is_trainer false when enrichment sets it', () => {
      const result = controller.buildFoundResponse(employee, {
        roles: ['REGULAR_EMPLOYEE'],
        primary_role: 'REGULAR_EMPLOYEE',
        is_system_admin: false,
        is_trainer: false
      });
      expect(result.response.is_trainer).toBe(false);
    });

    test('HR override shape: roles HR but is_trainer true', () => {
      const result = controller.buildFoundResponse(employee, {
        roles: ['HR'],
        primary_role: 'HR',
        is_system_admin: false,
        is_trainer: true
      });
      expect(result.response.roles).toEqual(['HR']);
      expect(result.response.primary_role).toBe('HR');
      expect(result.response.is_trainer).toBe(true);
    });
  });

  describe('buildAdminFoundResponse', () => {
    test('includes is_system_admin true and is_trainer false', () => {
      const result = controller.buildAdminFoundResponse({
        id: 'admin-uuid',
        full_name: 'Admin User'
      });
      expect(result.response.is_system_admin).toBe(true);
      expect(result.response.is_trainer).toBe(false);
      expect(result.response.primary_role).toBe('DIRECTORY_ADMIN');
    });
  });

  describe('buildNotFoundResponse', () => {
    test('includes is_trainer false', () => {
      const result = controller.buildNotFoundResponse();
      expect(result.response.user_exists).toBe(false);
      expect(result.response.is_trainer).toBe(false);
      expect(result.response.is_system_admin).toBe(false);
    });
  });

  describe('handleRequest employee lookup', () => {
    function mockRes() {
      const res = { statusCode: 200 };
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      res.on = jest.fn();
      return res;
    }

    function baseReq(email) {
      return {
        method: 'POST',
        path: '/request',
        headers: { 'content-type': 'application/json' },
        body: { payload: { email } }
      };
    }

    test('regular employee without TRAINER -> is_trainer false', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'emp-1',
            company_id: 'co-1',
            email: 'user@acme.com',
            full_name: 'User',
            organization_name: 'Acme',
            hr_contact_email: 'hr@acme.com'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ role_type: 'REGULAR_EMPLOYEE' }] });

      const res = mockRes();
      await controller.handleRequest(baseReq('user@acme.com'), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({
            roles: ['REGULAR_EMPLOYEE'],
            primary_role: 'REGULAR_EMPLOYEE',
            is_trainer: false,
            is_system_admin: false
          })
        })
      );
    });

    test('regular employee with TRAINER -> is_trainer true', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'emp-2',
            company_id: 'co-1',
            email: 'trainer@acme.com',
            full_name: 'Trainer',
            organization_name: 'Acme',
            hr_contact_email: 'hr@acme.com'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ role_type: 'TRAINER' }] });

      const res = mockRes();
      await controller.handleRequest(baseReq('trainer@acme.com'), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({
            roles: ['TRAINER'],
            primary_role: 'TRAINER',
            is_trainer: true
          })
        })
      );
    });

    test('HR without TRAINER -> roles HR, is_trainer false', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'emp-hr',
            company_id: 'co-1',
            email: 'hr@acme.com',
            full_name: 'HR Person',
            organization_name: 'Acme',
            hr_contact_email: 'hr@acme.com'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ role_type: 'REGULAR_EMPLOYEE' }] });

      const res = mockRes();
      await controller.handleRequest(baseReq('hr@acme.com'), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({
            roles: ['HR'],
            primary_role: 'HR',
            is_trainer: false,
            is_system_admin: false
          })
        })
      );
    });

    test('HR with TRAINER -> roles HR, is_trainer true', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'emp-hr-trainer',
            company_id: 'co-1',
            email: 'hr@acme.com',
            full_name: 'HR Trainer',
            organization_name: 'Acme',
            hr_contact_email: 'hr@acme.com'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ role_type: 'TRAINER' }, { role_type: 'REGULAR_EMPLOYEE' }]
        });

      const res = mockRes();
      await controller.handleRequest(baseReq('hr@acme.com'), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({
            roles: ['HR'],
            primary_role: 'HR',
            is_trainer: true,
            is_system_admin: false
          })
        })
      );
    });
  });
});
