// Application Layer - Validate CSV Data Use Case
// Validates CSV data and formats errors/warnings for UI display

const CSVValidator = require('../infrastructure/CSVValidator');
const CSVErrorFormatter = require('../infrastructure/CSVErrorFormatter');

class ValidateCSVDataUseCase {
  constructor() {
    this.csvValidator = new CSVValidator();
    this.csvErrorFormatter = new CSVErrorFormatter();
  }

  /**
   * Validate CSV data and format errors/warnings
   * @param {Array} rows - Parsed CSV rows
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Validation result with formatted errors/warnings
   */
  async execute(rows, companyId) {
    // Validate CSV data
    const validation = this.csvValidator.validate(rows, companyId);

    // Format errors and warnings
    const formattedErrors = this.csvErrorFormatter.formatErrors(validation.errors);
    const formattedWarnings = this.csvErrorFormatter.formatWarnings(validation.warnings);

    return {
      validation,
      formattedErrors,
      formattedWarnings
    };
  }
}

module.exports = ValidateCSVDataUseCase;

