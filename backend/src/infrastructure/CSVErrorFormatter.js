// Infrastructure Layer - CSV Error Formatter
// Formats CSV validation errors and warnings for display

class CSVErrorFormatter {
  /**
   * Format errors by row and type
   * @param {Array} errors - Array of error objects
   * @returns {Object} Formatted errors with byRow, byType, and total
   */
  formatErrors(errors) {
    const byRow = {};
    const byType = {};

    errors.forEach(error => {
      // Group by row
      if (!byRow[error.row]) {
        byRow[error.row] = [];
      }
      byRow[error.row].push(error);

      // Group by type
      if (!byType[error.type]) {
        byType[error.type] = [];
      }
      byType[error.type].push(error);
    });

    return {
      byRow,
      byType,
      total: errors.length
    };
  }

  /**
   * Format warnings by row
   * @param {Array} warnings - Array of warning objects
   * @returns {Object} Formatted warnings with byRow and total
   */
  formatWarnings(warnings) {
    const byRow = {};

    warnings.forEach(warning => {
      if (!byRow[warning.row]) {
        byRow[warning.row] = [];
      }
      byRow[warning.row].push(warning);
    });

    return {
      byRow,
      total: warnings.length
    };
  }

  /**
   * Get errors for a specific row
   * @param {Array} errors - Array of error objects
   * @param {number} rowNumber - Row number to filter
   * @returns {Array} Errors for the specified row
   */
  getRowErrors(errors, rowNumber) {
    return errors.filter(error => error.row === rowNumber);
  }
}

module.exports = CSVErrorFormatter;

