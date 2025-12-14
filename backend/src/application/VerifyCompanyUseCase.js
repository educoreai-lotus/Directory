// Application Layer - Verify Company Use Case
// Business logic for company verification

const CompanyRepository = require('../infrastructure/CompanyRepository');
const DomainValidator = require('../infrastructure/DomainValidator');

class VerifyCompanyUseCase {
  constructor() {
    this.companyRepository = new CompanyRepository();
    this.domainValidator = new DomainValidator();
  }

  /**
   * Get company verification status
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company with verification status
   */
  async getStatus(companyId) {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    return {
      id: company.id,
      company_name: company.company_name,
      domain: company.domain,
      verification_status: company.verification_status,
      industry: company.industry,
      hr_contact_name: company.hr_contact_name,
      hr_contact_email: company.hr_contact_email,
      created_at: company.created_at
    };
  }

  /**
   * Perform domain verification
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyDomain(companyId) {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    // If already verified, return current status
    if (company.verification_status === 'approved') {
      return {
        company_id: company.id,
        verification_status: 'approved',
        message: 'Company already verified'
      };
    }

    // Perform domain validation
    console.log(`[VerifyCompanyUseCase] Verifying domain for company ${companyId}: ${company.domain}`);
    const validationResult = await this.domainValidator.validate(company.domain);
    console.log(`[VerifyCompanyUseCase] Validation result:`, JSON.stringify(validationResult, null, 2));

    // Update verification status based on validation
    let newStatus = 'pending';
    if (validationResult.isValid) {
      // For now, we auto-approve if DNS is valid
      // In production, this might require manual approval by Directory Admin
      newStatus = 'approved';
      console.log(`[VerifyCompanyUseCase] ✅ Domain ${company.domain} is valid - auto-approving`);
    } else if (validationResult.errors.length > 0 && !validationResult.hasDNS) {
      // Reject if DNS is completely invalid (domain doesn't exist or can't be resolved)
      newStatus = 'rejected';
      console.log(`[VerifyCompanyUseCase] ❌ Domain ${company.domain} validation failed - rejecting: ${validationResult.errors.join(', ')}`);
    } else if (validationResult.errors.length > 0) {
      // If there are errors but DNS exists, keep as pending for manual review
      newStatus = 'pending';
      console.log(`[VerifyCompanyUseCase] ⚠️ Domain ${company.domain} has issues but DNS exists - keeping as pending for manual review: ${validationResult.errors.join(', ')}`);
    }

    // Update company verification status
    const updatedCompany = await this.companyRepository.updateVerificationStatus(
      companyId,
      newStatus
    );

    // Verify the update was successful by fetching fresh data
    const freshCompany = await this.companyRepository.findById(companyId);
    console.log(`[VerifyCompanyUseCase] Status updated to ${newStatus}, verified in DB: ${freshCompany.verification_status}`);

    return {
      company_id: updatedCompany.id,
      verification_status: freshCompany.verification_status, // Use fresh data
      domain: freshCompany.domain,
      company_name: freshCompany.company_name,
      domain_validation: {
        isValid: validationResult.isValid,
        hasDNS: validationResult.hasDNS,
        hasMailServer: validationResult.hasMailServer,
        errors: validationResult.errors
      },
      message: newStatus === 'approved' 
        ? 'Company verified successfully' 
        : 'Verification pending review'
    };
  }

  /**
   * Manually approve company (for Directory Admin)
   * @param {string} companyId - Company ID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated company
   */
  async approveCompany(companyId, adminId) {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    const updatedCompany = await this.companyRepository.updateVerificationStatus(
      companyId,
      'approved'
    );

    // When company is manually approved, notify Learner AI via Coordinator
    // Import RegisterCompanyUseCase to reuse the notification logic
    const RegisterCompanyUseCase = require('./RegisterCompanyUseCase');
    const registerUseCase = new RegisterCompanyUseCase();
    registerUseCase.notifyLearnerAIAboutApprovalPolicy(updatedCompany).catch(error => {
      console.error('[VerifyCompanyUseCase] Failed to notify Learner AI after manual approval:', error);
      // Don't fail approval if notification fails
    });

    // TODO: Log this action in audit_logs table
    // await auditLogger.log({
    //   action_type: 'company_approved',
    //   company_id: companyId,
    //   user_id: adminId
    // });

    return {
      company_id: updatedCompany.id,
      verification_status: updatedCompany.verification_status,
      message: 'Company approved successfully'
    };
  }

  /**
   * Manually reject company (for Directory Admin)
   * @param {string} companyId - Company ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated company
   */
  async rejectCompany(companyId, adminId, reason) {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    const updatedCompany = await this.companyRepository.updateVerificationStatus(
      companyId,
      'rejected'
    );

    // TODO: Store rejection reason and log in audit_logs
    // await auditLogger.log({
    //   action_type: 'company_rejected',
    //   company_id: companyId,
    //   user_id: adminId,
    //   details: { reason }
    // });

    return {
      company_id: updatedCompany.id,
      verification_status: updatedCompany.verification_status,
      message: 'Company rejected'
    };
  }
}

module.exports = VerifyCompanyUseCase;

