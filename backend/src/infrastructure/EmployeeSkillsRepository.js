// Infrastructure Layer - Employee Skills Repository
// Handles database operations for employee_skills table
// Stores Skills Engine response to avoid duplicate calls

const { Pool } = require('pg');
const config = require('../config');

class EmployeeSkillsRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured.');
    }

    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Save or update employee skills from Skills Engine response
   * @param {string} employeeId - Employee UUID
   * @param {Object} skillsData - Skills data from Skills Engine
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Saved skills data
   */
  async saveOrUpdate(employeeId, skillsData, client = null) {
    const query = `
      INSERT INTO employee_skills (employee_id, competencies, relevance_score, gap, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        competencies = EXCLUDED.competencies,
        relevance_score = EXCLUDED.relevance_score,
        gap = EXCLUDED.gap,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      employeeId,
      JSON.stringify(skillsData.competencies || []),
      skillsData.relevance_score || 0,
      skillsData.gap ? JSON.stringify(skillsData.gap) : null
    ];

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    
    // Parse JSONB data back to object
    const row = result.rows[0];
    if (row && typeof row.competencies === 'string') {
      row.competencies = JSON.parse(row.competencies);
    }
    if (row && row.gap && typeof row.gap === 'string') {
      row.gap = JSON.parse(row.gap);
    }
    
    return row;
  }

  /**
   * Get employee skills from database
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Skills data or null if not found
   */
  async findByEmployeeId(employeeId) {
    try {
      const query = `
        SELECT * FROM employee_skills
        WHERE employee_id = $1
      `;

      const result = await this.pool.query(query, [employeeId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      // Parse JSONB data back to object
      if (row && typeof row.competencies === 'string') {
        row.competencies = JSON.parse(row.competencies);
      }
      if (row && row.gap && typeof row.gap === 'string') {
        row.gap = JSON.parse(row.gap);
      }
      
      return row;
    } catch (error) {
      // If table doesn't exist (migration not run), return null to trigger fallback
      if (error.code === '42P01') { // relation does not exist
        console.warn('[EmployeeSkillsRepository] employee_skills table does not exist. Run migration 003_add_employee_skills_table.sql');
        return null;
      }
      throw error;
    }
  }

  /**
   * Update skill levels for competencies that have non-undefined levels
   * Recursively updates competencies in the JSONB structure
   * @param {string} employeeId - Employee UUID
   * @param {Array} newCompetencies - Array of competencies with updated levels from Skills Engine
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Updated skills data
   */
  async updateSkillLevels(employeeId, newCompetencies, client = null) {
    // Get existing skills
    const existingSkills = await this.findByEmployeeId(employeeId);
    
    if (!existingSkills || !existingSkills.competencies) {
      console.warn('[EmployeeSkillsRepository] No existing skills found for employee:', employeeId);
      return null;
    }

    // Create a map of competencyId -> level from new competencies
    const levelMap = new Map();
    
    // Recursively extract competencyId and level from new competencies
    const extractLevels = (competencies) => {
      if (!Array.isArray(competencies)) return;
      
      for (const comp of competencies) {
        const competencyId = comp.competencyId || comp.competency_id;
        const level = comp.level;
        
        if (competencyId && level && String(level).toLowerCase() !== 'undefined') {
          levelMap.set(competencyId, level);
        }
        
        // Recursively process children
        if (comp.children && Array.isArray(comp.children)) {
          extractLevels(comp.children);
        }
      }
    };
    
    extractLevels(newCompetencies);
    
    console.log('[EmployeeSkillsRepository] Found', levelMap.size, 'competencies with verified levels to update');
    
    // Recursively update existing competencies
    const updateCompetencyLevels = (competencies) => {
      if (!Array.isArray(competencies)) return competencies;
      
      return competencies.map(comp => {
        const competencyId = comp.competencyId || comp.competency_id;
        const updatedComp = { ...comp };
        
        // If this competency has a verified level in the map, update it
        if (competencyId && levelMap.has(competencyId)) {
          updatedComp.level = levelMap.get(competencyId);
          console.log('[EmployeeSkillsRepository] Updating level for competency:', competencyId, '->', updatedComp.level);
        }
        
        // Recursively update children
        if (comp.children && Array.isArray(comp.children)) {
          updatedComp.children = updateCompetencyLevels(comp.children);
        }
        
        return updatedComp;
      });
    };
    
    const updatedCompetencies = updateCompetencyLevels(existingSkills.competencies);
    
    // Save updated competencies back to database
    const query = `
      UPDATE employee_skills
      SET competencies = $1, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $2
      RETURNING *
    `;
    
    const values = [
      JSON.stringify(updatedCompetencies),
      employeeId
    ];
    
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    
    // Parse JSONB data back to object
    const row = result.rows[0];
    if (row && typeof row.competencies === 'string') {
      row.competencies = JSON.parse(row.competencies);
    }
    if (row && row.gap && typeof row.gap === 'string') {
      row.gap = JSON.parse(row.gap);
    }
    
    console.log('[EmployeeSkillsRepository] ✅ Successfully updated skill levels');
    return row;
  }

  /**
   * Delete employee skills (when employee is deleted)
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<void>}
   */
  async deleteByEmployeeId(employeeId, client = null) {
    const query = `DELETE FROM employee_skills WHERE employee_id = $1`;
    const queryRunner = client || this.pool;
    await queryRunner.query(query, [employeeId]);
  }
}

module.exports = EmployeeSkillsRepository;

