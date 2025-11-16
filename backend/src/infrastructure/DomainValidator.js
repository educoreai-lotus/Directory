// Infrastructure Layer - Domain Validator
// Validates company domains

const dns = require('dns').promises;

class DomainValidator {
  /**
   * Validate domain format
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if domain format is valid
   */
  isValidFormat(domain) {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  /**
   * Check if domain has valid DNS records
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} True if domain has valid DNS
   */
  async hasValidDNS(domain) {
    try {
      // Add timeout for DNS lookup (5 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
      ));
      
      await Promise.race([
        dns.resolve4(domain),
        timeoutPromise
      ]);
      return true;
    } catch (error) {
      // Try AAAA record (IPv6)
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
        );
        
        await Promise.race([
          dns.resolve6(domain),
          timeoutPromise
        ]);
        return true;
      } catch (error2) {
        console.log(`DNS validation failed for ${domain}:`, error2.message);
        return false;
      }
    }
  }

  /**
   * Check if domain has MX records (mail server)
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} True if domain has MX records
   */
  async hasMailServer(domain) {
    try {
      const mxRecords = await dns.resolveMx(domain);
      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform comprehensive domain validation
   * @param {string} domain - Domain to validate
   * @returns {Promise<Object>} Validation result
   */
  async validate(domain) {
    const result = {
      isValid: false,
      hasDNS: false,
      hasMailServer: false,
      errors: []
    };

    // Format validation
    if (!this.isValidFormat(domain)) {
      result.errors.push('Invalid domain format');
      return result;
    }

    // DNS validation
    try {
      result.hasDNS = await this.hasValidDNS(domain);
      if (!result.hasDNS) {
        result.errors.push('Domain does not have valid DNS records');
      }
    } catch (error) {
      result.errors.push('DNS validation failed');
    }

    // Mail server validation (optional but recommended)
    try {
      result.hasMailServer = await this.hasMailServer(domain);
      if (!result.hasMailServer) {
        result.errors.push('Domain does not have mail server (MX records)');
      }
    } catch (error) {
      // Mail server is optional, so we don't fail validation
      result.errors.push('Could not verify mail server');
    }

    // Domain is valid if it has DNS records
    result.isValid = result.hasDNS;

    return result;
  }
}

module.exports = DomainValidator;

