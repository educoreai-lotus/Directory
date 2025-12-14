// Application Layer - Register Company Use Case
// Business logic for company registration

const CompanyRepository = require('../infrastructure/CompanyRepository');
const VerifyCompanyUseCase = require('./VerifyCompanyUseCase');
const { postToCoordinator } = require('../infrastructure/CoordinatorClient');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class RegisterCompanyUseCase {
  constructor() {
    this.companyRepository = new CompanyRepository();
    this.verifyCompanyUseCase = new VerifyCompanyUseCase();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Register a new company (atomic operation)
   * @param {Object} companyData - Company registration data
   * @returns {Promise<Object>} Created company with ID
   */
  async execute(companyData) {
    // Step 1: Validate all data BEFORE any database operations
    this.validateCompanyData(companyData);

    // Step 2: Check if a FULLY REGISTERED company with same domain already exists
    // Only block domains for companies that have completed full registration (CSV uploaded, employees created)
    // Partial registrations (no CSV/employees) should not block future attempts
    const fullyRegisteredCompany = await this.companyRepository.findFullyRegisteredByDomain(companyData.domain);
    if (fullyRegisteredCompany) {
      throw new Error('A company with this domain has already completed registration. Please use a different domain or contact support if you believe this is an error.');
    }
    
    // If a company exists but hasn't completed registration, allow re-registration
    // (This handles cases where previous registration attempts failed before CSV upload)
    const existingIncompleteCompany = await this.companyRepository.findByDomain(companyData.domain);
    if (existingIncompleteCompany) {
      const hasCompleted = await this.companyRepository.hasCompletedRegistration(existingIncompleteCompany.id);
      if (!hasCompleted) {
        // Company exists but incomplete - allow re-registration by deleting the incomplete record
        console.log(`[RegisterCompanyUseCase] Found incomplete registration for domain ${companyData.domain}, allowing re-registration`);
        await this.companyRepository.deleteById(existingIncompleteCompany.id);
      }
    }

    // Step 3: Use transaction to ensure atomicity
    // If anything fails after this point, the entire operation is rolled back
    const client = await this.companyRepository.beginTransaction();
    
    try {
      // Create company within transaction
      const company = await this.companyRepository.create(companyData, client);
      
      // Commit transaction - only now is the company actually saved
      await this.companyRepository.commitTransaction(client);
      
      // Step 4: Trigger domain verification automatically (async, don't wait)
      // This happens AFTER successful commit, so even if it fails, company is saved
      this.verifyCompanyUseCase.verifyDomain(company.id).catch(error => {
        console.error('Auto-verification failed:', error);
        // Don't fail registration if verification fails - company is already created
      });

      return {
        company_id: company.id,
        company_name: company.company_name,
        domain: company.domain,
        verification_status: company.verification_status
      };
    } catch (error) {
      // Rollback transaction on any error
      await this.companyRepository.rollbackTransaction(client);
      
      // Re-throw the error with context
      if (error.message.includes('already exists')) {
        throw error; // Re-throw domain exists error as-is
      }
      
      // For other errors, wrap with context
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Validate company registration data
   * @param {Object} companyData - Company data to validate
   * @throws {Error} If validation fails
   */
  validateCompanyData(companyData) {
    const requiredFields = [
      'company_name',
      'industry',
      'domain',
      'hr_contact_name',
      'hr_contact_email',
      'hr_contact_role'
    ];

    for (const field of requiredFields) {
      if (!companyData[field] || !companyData[field].trim()) {
        throw new Error(`${field.replace('_', ' ')} is required`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyData.hr_contact_email)) {
      throw new Error('Invalid email format');
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(companyData.domain)) {
      throw new Error('Invalid domain format');
    }
  }

  /**
   * Notify Learner AI microservice via Coordinator about company approval policy
   * @param {Object} company - Created company object
   */
  async notifyLearnerAIAboutApprovalPolicy(company) {
    try {
      console.log('[RegisterCompanyUseCase] Notifying Learner AI about approval policy for company:', company.id);
      
      // Get approval policy (defaults to 'manual' if not set)
      const approvalPolicy = company.approval_policy || 'manual';
      
      // Find decision maker (HR contact or employee with DECISION_MAKER role)
      let decisionMaker = null;
      
      if (approvalPolicy === 'manual') {
        // Try to find HR contact as employee first (if CSV was already uploaded)
        try {
          const hrEmployee = await this.employeeRepository.findByEmail(company.hr_contact_email);
          if (hrEmployee) {
            decisionMaker = {
              employee_id: hrEmployee.id,
              employee_name: hrEmployee.full_name || company.hr_contact_name,
              employee_email: hrEmployee.email || company.hr_contact_email
            };
            console.log('[RegisterCompanyUseCase] Found HR employee as decision maker:', decisionMaker.employee_id);
          } else {
            // HR contact not found as employee yet (CSV not uploaded), use HR contact info
            decisionMaker = {
              employee_id: null, // Will be updated when CSV is uploaded
              employee_name: company.hr_contact_name,
              employee_email: company.hr_contact_email
            };
            console.log('[RegisterCompanyUseCase] HR contact not found as employee yet, using HR contact info');
          }
        } catch (error) {
          // If employee lookup fails, use HR contact info
          console.warn('[RegisterCompanyUseCase] Could not find HR employee, using HR contact info:', error.message);
          decisionMaker = {
            employee_id: null,
            employee_name: company.hr_contact_name,
            employee_email: company.hr_contact_email
          };
        }
      }

      // Build Coordinator envelope
      const coordinatorEnvelope = {
        requester_service: 'directory-service',
        payload: {
          action: 'sending_decision_maker_to_approve_learning_path',
          company_id: company.id,
          company_name: company.company_name,
          approval_policy: approvalPolicy,
          decision_maker: decisionMaker
        },
        response: {
          success: false,
          message: ''
        }
      };

      console.log('[RegisterCompanyUseCase] Sending to Coordinator:', JSON.stringify(coordinatorEnvelope, null, 2));
      
      // Send to Coordinator (non-blocking - don't fail registration if this fails)
      const result = await postToCoordinator(coordinatorEnvelope);
      
      console.log('[RegisterCompanyUseCase] Coordinator response:', {
        status: result.resp?.status,
        success: result.data?.success
      });
      
      if (!result.resp.ok) {
        console.warn('[RegisterCompanyUseCase] Coordinator returned non-OK status:', result.resp.status);
      }
    } catch (error) {
      // Log error but don't throw - registration should succeed even if notification fails
      console.error('[RegisterCompanyUseCase] Error notifying Learner AI:', error.message);
      console.error('[RegisterCompanyUseCase] Error stack:', error.stack);
    }
  }
}

module.exports = RegisterCompanyUseCase;

