// Presentation Layer - Employee Profile Approval Controller
// Handles HR approval/rejection of enriched employee profiles

const EmployeeProfileApprovalRepository = require('../infrastructure/EmployeeProfileApprovalRepository');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const MicroserviceClient = require('../infrastructure/MicroserviceClient');
const { hrOnlyMiddleware } = require('../shared/authMiddleware');

class EmployeeProfileApprovalController {
  constructor() {
    this.approvalRepository = new EmployeeProfileApprovalRepository();
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
    this.microserviceClient = new MicroserviceClient();
  }

  /**
   * Get all pending approval requests for a company
   * GET /api/v1/companies/:id/profile-approvals
   * Requires HR authentication
   */
  async getPendingApprovals(req, res, next) {
    try {
      const { id: companyId } = req.params;

      // Verify user is HR for this company
      if (!req.user || !req.user.isHR || req.user.companyId !== companyId) {
        return res.status(403).json({
          error: 'Access denied. HR privileges required.'
        });
      }

      const pendingApprovals = await this.approvalRepository.findPendingByCompanyId(companyId);

      return res.status(200).json({
        approvals: pendingApprovals
      });
    } catch (error) {
      console.error('[EmployeeProfileApprovalController] Error fetching pending approvals:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching pending approvals'
      });
    }
  }

  /**
   * Approve an enriched employee profile
   * POST /api/v1/companies/:id/profile-approvals/:approvalId/approve
   * Requires HR authentication
   */
  async approveProfile(req, res, next) {
    try {
      const { id: companyId, approvalId } = req.params;
      const hrEmployeeId = req.user?.id;

      // Verify user is HR for this company
      if (!req.user || !req.user.isHR || req.user.companyId !== companyId) {
        return res.status(403).json({
          error: 'Access denied. HR privileges required.'
        });
      }

      // Get approval request
      const approval = await this.approvalRepository.findById(approvalId);
      if (!approval) {
        console.error('[EmployeeProfileApprovalController] Approval not found:', {
          approvalId,
          companyId,
          hrEmployeeId
        });
        return res.status(404).json({
          error: 'Approval request not found'
        });
      }

      console.log('[EmployeeProfileApprovalController] Found approval:', {
        id: approval.id,
        employee_uuid: approval.employee_uuid,
        employee_id: approval.employee_id,
        company_id: approval.company_id,
        status: approval.status
      });

      // Verify approval belongs to this company
      // Compare as strings to handle UUID comparison (UUIDs can be objects or strings)
      const approvalCompanyId = approval.company_id?.toString() || approval.company_id;
      const requestCompanyId = companyId?.toString() || companyId;
      
      if (approvalCompanyId !== requestCompanyId) {
        console.error('[EmployeeProfileApprovalController] Company ID mismatch:', {
          approvalCompanyId: approvalCompanyId,
          requestedCompanyId: requestCompanyId,
          approvalCompanyIdType: typeof approvalCompanyId,
          requestCompanyIdType: typeof requestCompanyId
        });
        return res.status(403).json({
          error: 'Approval request does not belong to this company'
        });
      }

      // Verify approval is pending
      if (approval.status !== 'pending') {
        return res.status(400).json({
          error: `Approval request is already ${approval.status}`
        });
      }

      // Update approval request
      const updatedApproval = await this.approvalRepository.approveProfile(approvalId, hrEmployeeId);

      // Update employee profile status to 'approved'
      // Use employee_uuid (the UUID from apa.employee_id) - this is the correct UUID field
      const employeeUuid = approval.employee_uuid || approval.employee_id;
      
      if (!employeeUuid) {
        console.error('[EmployeeProfileApprovalController] No employee UUID found in approval:', approval);
        return res.status(500).json({
          error: 'Unable to identify employee from approval request'
        });
      }

      console.log('[EmployeeProfileApprovalController] Updating employee profile status:', {
        employeeUuid,
        newStatus: 'approved'
      });

      await this.employeeRepository.updateProfileStatus(employeeUuid, 'approved');

      console.log(`[EmployeeProfileApprovalController] ✅ Profile approved for employee: ${employeeUuid}`);

      // Send response FIRST to ensure frontend gets confirmation
      // Then make Skills Engine call asynchronously (non-blocking)
      res.status(200).json({
        success: true,
        approval: updatedApproval,
        message: 'Profile approved successfully'
      });

      // After approval, send skills data to Skills Engine via Coordinator
      // This is non-blocking; errors are logged but won't fail the approval
      // Run asynchronously after response is sent
      setImmediate(async () => {
        try {
        const employee = await this.employeeRepository.findById(employeeUuid);
        const company = await this.companyRepository.findById(approvalCompanyId);

        if (employee && company) {
          // Determine employee type from roles
          const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
          const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [employeeUuid]);
          const roles = rolesResult.rows.map(row => row.role_type);
          const isTrainer = roles.includes('TRAINER');
          const employeeType = isTrainer ? 'trainer' : 'regular_employee';

          // Prepare raw_data from ALL stored enrichment sources in employees table
          // Skills Engine extracts data from raw_data JSON - it accepts any keys in the structure
          // IMPORTANT: Only include sources that have actual data (don't send empty objects)
          const rawData = {};

          // Only include linkedin if data exists
          if (employee.linkedin_data) {
            const linkedinData = typeof employee.linkedin_data === 'string' 
              ? JSON.parse(employee.linkedin_data) 
              : employee.linkedin_data;
            if (linkedinData && Object.keys(linkedinData).length > 0) {
              rawData.linkedin = linkedinData;
            }
          }

          // Only include github if data exists
          if (employee.github_data) {
            const githubData = typeof employee.github_data === 'string' 
              ? JSON.parse(employee.github_data) 
              : employee.github_data;
            if (githubData && Object.keys(githubData).length > 0) {
              rawData.github = githubData;
            }
          }

          // Only include pdf if data exists
          if (employee.pdf_data) {
            const pdfData = typeof employee.pdf_data === 'string' 
              ? JSON.parse(employee.pdf_data) 
              : employee.pdf_data;
            if (pdfData && Object.keys(pdfData).length > 0) {
              rawData.pdf = pdfData;
            }
          }

          // Only include manual if data exists
          if (employee.manual_data) {
            const manualData = typeof employee.manual_data === 'string' 
              ? JSON.parse(employee.manual_data) 
              : employee.manual_data;
            if (manualData && Object.keys(manualData).length > 0) {
              rawData.manual = manualData;
            }
          }

          console.log('[EmployeeProfileApprovalController] Sending post-approval skills payload to Skills Engine via Coordinator...');
          console.log('[EmployeeProfileApprovalController] Payload:', JSON.stringify({
            user_id: employee.id,
            user_name: employee.full_name,
            company_id: employee.company_id.toString(),
            company_name: company.company_name,
            employee_type: employeeType,
            path_career: employee.target_role_in_company || null,
            preferred_language: employee.preferred_language || 'en',
            raw_data_sources_included: Object.keys(rawData), // Only sources with actual data
            raw_data_keys: Object.keys(rawData).reduce((acc, key) => {
              acc[key] = Object.keys(rawData[key] || {}).length;
              return acc;
            }, {})
          }, null, 2));
          
          const skillsData = await this.microserviceClient.getEmployeeSkills({
            userId: employee.id,
            userName: employee.full_name,
            companyId: employee.company_id.toString(),
            companyName: company.company_name,
            roleType: employeeType,
            pathCareer: employee.target_role_in_company || null,
            preferredLanguage: employee.preferred_language || 'en',
            rawData
          });
          
          console.log('[EmployeeProfileApprovalController] ✅ Skills Engine response received:');
          console.log('[EmployeeProfileApprovalController] Response:', JSON.stringify({
            user_id: skillsData?.user_id,
            competencies_count: skillsData?.competencies?.length || 0,
            relevance_score: skillsData?.relevance_score,
            has_gap: !!skillsData?.gap,
            full_response: skillsData
          }, null, 2));
          
          // Store skills data in database to avoid duplicate calls
          if (skillsData && (skillsData.competencies || skillsData.relevance_score !== undefined)) {
            try {
              const EmployeeSkillsRepository = require('../infrastructure/EmployeeSkillsRepository');
              const skillsRepository = new EmployeeSkillsRepository();
              // Store original Skills Engine response (before transformation)
              await skillsRepository.saveOrUpdate(employee.id, skillsData);
              console.log('[EmployeeProfileApprovalController] ✅ Skills data stored in database');
            } catch (storageError) {
              // If table doesn't exist, log warning but don't fail approval
              if (storageError.code === '42P01') {
                console.warn('[EmployeeProfileApprovalController] ⚠️ employee_skills table does not exist. Run migration 003_add_employee_skills_table.sql');
              } else {
                console.warn('[EmployeeProfileApprovalController] ⚠️ Failed to store skills data (non-blocking):', storageError.message);
              }
            }
          }
        } else {
          console.warn('[EmployeeProfileApprovalController] Skipping Skills Engine call: employee or company not found', {
            hasEmployee: !!employee,
            hasCompany: !!company
          });
        }
        } catch (skillsError) {
          console.warn('[EmployeeProfileApprovalController] ⚠️ Skills Engine call after approval failed (non-blocking):', skillsError.message);
        }
      });
    } catch (error) {
      console.error('[EmployeeProfileApprovalController] Error approving profile:', error);
      return res.status(500).json({
        error: 'An error occurred while approving profile'
      });
    }
  }

  /**
   * Reject an enriched employee profile
   * POST /api/v1/companies/:id/profile-approvals/:approvalId/reject
   * Requires HR authentication
   */
  async rejectProfile(req, res, next) {
    try {
      const { id: companyId, approvalId } = req.params;
      const { reason } = req.body;
      const hrEmployeeId = req.user?.id;

      // Verify user is HR for this company
      if (!req.user || !req.user.isHR || req.user.companyId !== companyId) {
        return res.status(403).json({
          error: 'Access denied. HR privileges required.'
        });
      }

      // Get approval request
      const approval = await this.approvalRepository.findById(approvalId);
      if (!approval) {
        return res.status(404).json({
          error: 'Approval request not found'
        });
      }

      // Verify approval belongs to this company
      // Compare as strings to handle UUID comparison
      const approvalCompanyId = approval.company_id?.toString() || approval.company_id;
      const requestCompanyId = companyId?.toString() || companyId;
      
      if (approvalCompanyId !== requestCompanyId) {
        console.error('[EmployeeProfileApprovalController] Company ID mismatch (reject):', {
          approvalCompanyId: approvalCompanyId,
          requestedCompanyId: requestCompanyId
        });
        return res.status(403).json({
          error: 'Approval request does not belong to this company'
        });
      }

      // Verify approval is pending
      if (approval.status !== 'pending') {
        return res.status(400).json({
          error: `Approval request is already ${approval.status}`
        });
      }

      // Update approval request
      const updatedApproval = await this.approvalRepository.rejectProfile(
        approvalId,
        hrEmployeeId,
        reason || 'Profile rejected by HR'
      );

      // Update employee profile status to 'rejected'
      // Use employee_uuid (the UUID from apa.employee_id) - this is the correct UUID field
      const employeeUuid = approval.employee_uuid || approval.employee_id;
      
      if (!employeeUuid) {
        console.error('[EmployeeProfileApprovalController] No employee UUID found in approval:', approval);
        return res.status(500).json({
          error: 'Unable to identify employee from approval request'
        });
      }

      console.log('[EmployeeProfileApprovalController] Updating employee profile status:', {
        employeeUuid,
        newStatus: 'rejected'
      });

      await this.employeeRepository.updateProfileStatus(employeeUuid, 'rejected');

      console.log(`[EmployeeProfileApprovalController] ❌ Profile rejected for employee: ${employeeUuid}`);

      return res.status(200).json({
        success: true,
        approval: updatedApproval,
        message: 'Profile rejected'
      });
    } catch (error) {
      console.error('[EmployeeProfileApprovalController] Error rejecting profile:', error);
      return res.status(500).json({
        error: 'An error occurred while rejecting profile'
      });
    }
  }

  /**
   * Get approval status for an employee
   * GET /api/v1/employees/:id/approval-status
   * Requires authentication
   */
  async getApprovalStatus(req, res, next) {
    try {
      const { id: employeeId } = req.params;
      const authenticatedEmployeeId = req.user?.id;
      const isHR = req.user?.isHR || false;

      // Verify user can access this employee's approval status
      if (!isHR && authenticatedEmployeeId !== employeeId) {
        return res.status(403).json({
          error: 'You can only view your own approval status'
        });
      }

      const approval = await this.approvalRepository.findByEmployeeId(employeeId);
      const employee = await this.employeeRepository.findById(employeeId);

      if (!employee) {
        return res.status(404).json({
          error: 'Employee not found'
        });
      }

      return res.status(200).json({
        employee_id: employeeId,
        profile_status: employee.profile_status,
        approval: approval || null
      });
    } catch (error) {
      console.error('[EmployeeProfileApprovalController] Error fetching approval status:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching approval status'
      });
    }
  }
}

module.exports = EmployeeProfileApprovalController;

