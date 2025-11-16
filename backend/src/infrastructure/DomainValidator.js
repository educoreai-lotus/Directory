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
    console.log(`[DomainValidator] Checking DNS for domain: ${domain}`);
    try {
      // Add timeout for DNS lookup (5 seconds)
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('DNS lookup timeout')), 5000);
      });
      
      const ipv4Result = await Promise.race([
        dns.resolve4(domain),
        timeoutPromise
      ]);
      console.log(`[DomainValidator] ✅ Domain ${domain} has valid IPv4 DNS records:`, ipv4Result);
      return true;
    } catch (error) {
      console.log(`[DomainValidator] IPv4 lookup failed for ${domain}, trying IPv6:`, error.message);
      // Try AAAA record (IPv6)
      try {
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('DNS lookup timeout')), 5000);
        });
        
        const ipv6Result = await Promise.race([
          dns.resolve6(domain),
          timeoutPromise
        ]);
        console.log(`[DomainValidator] ✅ Domain ${domain} has valid IPv6 DNS records:`, ipv6Result);
        return true;
      } catch (error2) {
        console.log(`[DomainValidator] ❌ DNS validation failed for ${domain}:`, error2.message);
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
      const hasMX = mxRecords && mxRecords.length > 0;
      if (hasMX) {
        console.log(`[DomainValidator] ✅ Domain ${domain} has MX records:`, mxRecords);
      } else {
        console.log(`[DomainValidator] ⚠️ Domain ${domain} has no MX records`);
      }
      return hasMX;
    } catch (error) {
      console.log(`[DomainValidator] ⚠️ Could not check MX records for ${domain}:`, error.message);
      return false;
    }
  }

  /**
   * Perform comprehensive domain validation
   * @param {string} domain - Domain to validate
   * @returns {Promise<Object>} Validation result
   */
  async validate(domain) {
    console.log(`[DomainValidator] Starting validation for domain: ${domain}`);
    const result = {
      isValid: false,
      hasDNS: false,
      hasMailServer: false,
      errors: []
    };

    // Format validation
    if (!this.isValidFormat(domain)) {
      console.log(`[DomainValidator] ❌ Invalid domain format: ${domain}`);
      result.errors.push('Invalid domain format');
      return result;
    }
    console.log(`[DomainValidator] ✅ Domain format is valid: ${domain}`);

    // DNS validation
    try {
      result.hasDNS = await this.hasValidDNS(domain);
      if (!result.hasDNS) {
        result.errors.push('Domain does not have valid DNS records');
        console.log(`[DomainValidator] ❌ Domain ${domain} failed DNS validation`);
      } else {
        console.log(`[DomainValidator] ✅ Domain ${domain} passed DNS validation`);
      }
    } catch (error) {
      console.log(`[DomainValidator] ❌ DNS validation error for ${domain}:`, error.message);
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
    
    console.log(`[DomainValidator] Validation complete for ${domain}:`, {
      isValid: result.isValid,
      hasDNS: result.hasDNS,
      hasMailServer: result.hasMailServer,
      errors: result.errors
    });

    return result;
  }
}

module.exports = DomainValidator;

