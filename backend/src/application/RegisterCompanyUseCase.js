// Application Layer - Register Company Use Case
// Business logic for company registration

const CompanyRepository = require('../infrastructure/CompanyRepository');
const VerifyCompanyUseCase = require('./VerifyCompanyUseCase');
const { postToCoordinator } = require('../infrastructure/CoordinatorClient');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const DomainValidator = require('../infrastructure/DomainValidator');

class RegisterCompanyUseCase {
  constructor() {
    this.companyRepository = new CompanyRepository();
    this.verifyCompanyUseCase = new VerifyCompanyUseCase();
    this.employeeRepository = new EmployeeRepository();
    this.domainValidator = new DomainValidator();
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

    // Step 3: Perform domain verification BEFORE saving to database
    // This ensures we only save companies with 'pending' or 'approved' status
    console.log('[RegisterCompanyUseCase] Performing domain verification before saving...');
    const domainValidationResult = await this.domainValidator.validate(companyData.domain);
    console.log('[RegisterCompanyUseCase] Domain validation result:', JSON.stringify(domainValidationResult, null, 2));

    // Determine initial verification status based on validation
    let initialVerificationStatus = 'pending';
    if (domainValidationResult.isValid) {
      initialVerificationStatus = 'approved';
      console.log('[RegisterCompanyUseCase] ✅ Domain is valid - setting status to approved');
    } else if (domainValidationResult.errors.length > 0 && !domainValidationResult.hasDNS) {
      // Reject if DNS is completely invalid
      initialVerificationStatus = 'rejected';
      console.log('[RegisterCompanyUseCase] ❌ Domain validation failed - status will be rejected');
    } else if (domainValidationResult.errors.length > 0) {
      // If there are errors but DNS exists, keep as pending for manual review
      initialVerificationStatus = 'pending';
      console.log('[RegisterCompanyUseCase] ⚠️ Domain has issues but DNS exists - keeping as pending');
    }

    // CRITICAL: Only save to database if status is 'pending' or 'approved'
    // Rejected companies should NOT be saved
    if (initialVerificationStatus === 'rejected') {
      console.log('[RegisterCompanyUseCase] ❌ Company registration rejected - NOT saving to database');
      throw new Error(`Company registration rejected: Domain validation failed. ${domainValidationResult.errors.join(', ')}`);
    }

    // Step 4: Use transaction to ensure atomicity
    // If anything fails after this point, the entire operation is rolled back
    const client = await this.companyRepository.beginTransaction();
    
    try {
      // Create company within transaction with determined verification status
      // Pass verification_status to create method
      const companyDataWithStatus = {
        ...companyData,
        verification_status: initialVerificationStatus
      };
      const company = await this.companyRepository.create(companyDataWithStatus, client);
      
      // Commit transaction - only now is the company actually saved
      await this.companyRepository.commitTransaction(client);
      
      console.log('[RegisterCompanyUseCase] ✅ Company saved to database with status:', company.verification_status);

      // Step 5: Notify Learner AI microservice via Coordinator ONLY if status is 'approved'
      // Pending companies are saved but NOT sent to Coordinator until approved
      if (company.verification_status === 'approved') {
        console.log('[RegisterCompanyUseCase] Company is approved - sending to Coordinator');
        this.notifyLearnerAIAboutApprovalPolicy(company).catch(error => {
          console.error('[RegisterCompanyUseCase] Failed to notify Learner AI about approval policy:', error);
          // Don't fail registration if notification fails - company is already created
        });
      } else {
        console.log('[RegisterCompanyUseCase] Company is pending - NOT sending to Coordinator (will be sent when approved)');
      }

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
        // CRITICAL: Find employee with DECISION_MAKER role, NOT HR contact
        // The DECISION_MAKER is the employee with DECISION_MAKER role_type in the CSV
        try {
          const decisionMakerEmployee = await this.employeeRepository.findDecisionMakerByCompanyId(company.id);
          if (decisionMakerEmployee) {
            decisionMaker = {
              employee_id: decisionMakerEmployee.id,
              employee_name: decisionMakerEmployee.full_name,
              employee_email: decisionMakerEmployee.email
            };
            console.log('[RegisterCompanyUseCase] Found DECISION_MAKER employee:', decisionMaker.employee_id, decisionMaker.employee_name);
          } else {
            // DECISION_MAKER not found yet (CSV not uploaded or no DECISION_MAKER in CSV)
            // Don't send decision_maker info - it will be sent after CSV upload
            console.log('[RegisterCompanyUseCase] DECISION_MAKER employee not found yet (CSV may not be uploaded). Not sending decision_maker info.');
            decisionMaker = null; // Don't send decision_maker if not found
          }
        } catch (error) {
          // If employee lookup fails, don't send decision_maker
          console.warn('[RegisterCompanyUseCase] Could not find DECISION_MAKER employee:', error.message);
          decisionMaker = null; // Don't send decision_maker if lookup fails
        }
      }

      // Build Coordinator envelope
      const coordinatorEnvelope = {
        requester_service: 'directory',
        payload: {
          action: 'sending_new_decision_maker',
          company_id: company.id,
          company_name: company.company_name,
          approval_policy: approvalPolicy,
          // Only include decision_maker if approval_policy is manual AND decision_maker was found
          // If CSV not uploaded yet, decision_maker will be null and won't be included
          ...(approvalPolicy === 'manual' && decisionMaker ? { decision_maker: decisionMaker } : {})
        },
        response: {}
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

