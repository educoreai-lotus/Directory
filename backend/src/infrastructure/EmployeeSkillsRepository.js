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
   * Update skill levels and merge new competencies from Skills Engine
   * Recursively updates competencies in the JSONB structure and adds new ones
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
      // If no existing skills, save the new competencies as the initial skills
      if (Array.isArray(newCompetencies) && newCompetencies.length > 0) {
        console.log('[EmployeeSkillsRepository] Saving new competencies as initial skills');
        const query = `
          INSERT INTO employee_skills (employee_id, competencies, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (employee_id)
          DO UPDATE SET
            competencies = EXCLUDED.competencies,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        const values = [employeeId, JSON.stringify(newCompetencies)];
        const queryRunner = client || this.pool;
        const result = await queryRunner.query(query, values);
        const row = result.rows[0];
        if (row && typeof row.competencies === 'string') {
          row.competencies = JSON.parse(row.competencies);
        }
        return row;
      }
      return null;
    }

    // Build a map of competencyId -> full competency data from new competencies
    const newCompetencyMap = new Map();
    
    // Recursively build map of all competencies from new data
    const buildCompetencyMap = (competencies, parentPath = []) => {
      if (!Array.isArray(competencies)) return;
      
      for (const comp of competencies) {
        const competencyId = comp.competencyId || comp.competency_id;
        if (competencyId) {
          // Store the full competency data (including structure)
          newCompetencyMap.set(competencyId, {
            ...comp,
            _path: parentPath
          });
          
          // Recursively process children
          if (comp.children && Array.isArray(comp.children)) {
            buildCompetencyMap(comp.children, [...parentPath, competencyId]);
          }
          if (comp.nested_competencies && Array.isArray(comp.nested_competencies)) {
            buildCompetencyMap(comp.nested_competencies, [...parentPath, competencyId]);
          }
        }
      }
    };
    
    buildCompetencyMap(newCompetencies);
    
    console.log('[EmployeeSkillsRepository] Found', newCompetencyMap.size, 'competencies in new data (including new ones)');
    console.log('[EmployeeSkillsRepository] Existing competencies count:', existingSkills.competencies?.length || 0);
    
    // Helper to find a competency by ID in existing structure
    const findCompetencyById = (competencies, targetId) => {
      if (!Array.isArray(competencies)) return null;
      
      for (const comp of competencies) {
        const compId = comp.competencyId || comp.competency_id;
        if (compId === targetId) {
          return comp;
        }
        
        // Check children
        if (comp.children && Array.isArray(comp.children)) {
          const found = findCompetencyById(comp.children, targetId);
          if (found) return found;
        }
        if (comp.nested_competencies && Array.isArray(comp.nested_competencies)) {
          const found = findCompetencyById(comp.nested_competencies, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Recursively merge and update competencies
    const mergeAndUpdateCompetencies = (existingComps, newComps) => {
      if (!Array.isArray(existingComps)) existingComps = [];
      if (!Array.isArray(newComps)) newComps = [];
      
      // Create a map of existing competencies by ID
      const existingMap = new Map();
      existingComps.forEach(comp => {
        const compId = comp.competencyId || comp.competency_id;
        if (compId) {
          existingMap.set(compId, comp);
        }
      });
      
      // Process each new competency
      const updatedComps = [];
      const processedIds = new Set();
      
      // First, update existing competencies and merge their children
      for (const newComp of newComps) {
        const compId = newComp.competencyId || newComp.competency_id;
        if (!compId) continue;
        
        processedIds.add(compId);
        const existingComp = existingMap.get(compId);
        
        if (existingComp) {
          // Merge existing with new data
          const merged = { ...existingComp };
          
          // Update level if new one is not undefined
          const newLevel = newComp.level;
          if (newLevel && String(newLevel).toLowerCase() !== 'undefined') {
            merged.level = newLevel;
            console.log('[EmployeeSkillsRepository] Updating level for competency:', compId, '->', newLevel);
          }
          
          // Update other fields that might have changed
          if (newComp.competencyName) merged.competencyName = newComp.competencyName;
          if (newComp.name) merged.name = newComp.name;
          if (newComp.coverage !== undefined) merged.coverage = newComp.coverage;
          
          // Recursively merge children
          if (newComp.children && Array.isArray(newComp.children)) {
            merged.children = mergeAndUpdateCompetencies(
              existingComp.children || existingComp.nested_competencies || [],
              newComp.children
            );
          } else if (newComp.nested_competencies && Array.isArray(newComp.nested_competencies)) {
            merged.nested_competencies = mergeAndUpdateCompetencies(
              existingComp.children || existingComp.nested_competencies || [],
              newComp.nested_competencies
            );
          } else if (existingComp.children || existingComp.nested_competencies) {
            // Keep existing children if new one doesn't have children
            merged.children = existingComp.children || existingComp.nested_competencies;
          }
          
          // Merge skills if present and propagate level to skills
          if (newComp.skills && Array.isArray(newComp.skills)) {
            // Propagate competency level to skills if level is not undefined
            merged.skills = newComp.skills.map(skill => ({
              ...skill,
              level: skill.level && String(skill.level).toLowerCase() !== 'undefined'
                ? skill.level
                : (merged.level && String(merged.level).toLowerCase() !== 'undefined' ? merged.level : undefined)
            }));
          } else if (existingComp.skills && Array.isArray(existingComp.skills)) {
            // Propagate competency level to existing skills if level was updated
            merged.skills = existingComp.skills.map(skill => ({
              ...skill,
              level: skill.level && String(skill.level).toLowerCase() !== 'undefined'
                ? skill.level
                : (merged.level && String(merged.level).toLowerCase() !== 'undefined' ? merged.level : undefined)
            }));
          }
          
          updatedComps.push(merged);
        } else {
          // New competency - add it
          const newCompCopy = { ...newComp };
          // Ensure children are properly structured
          if (newCompCopy.children && Array.isArray(newCompCopy.children)) {
            newCompCopy.children = mergeAndUpdateCompetencies([], newCompCopy.children);
          }
          if (newCompCopy.nested_competencies && Array.isArray(newCompCopy.nested_competencies)) {
            newCompCopy.nested_competencies = mergeAndUpdateCompetencies([], newCompCopy.nested_competencies);
          }
          // Propagate level to skills if present
          if (newCompCopy.skills && Array.isArray(newCompCopy.skills)) {
            const compLevel = newCompCopy.level;
            newCompCopy.skills = newCompCopy.skills.map(skill => ({
              ...skill,
              level: skill.level && String(skill.level).toLowerCase() !== 'undefined'
                ? skill.level
                : (compLevel && String(compLevel).toLowerCase() !== 'undefined' ? compLevel : undefined)
            }));
          }
          updatedComps.push(newCompCopy);
          console.log('[EmployeeSkillsRepository] Adding new competency:', compId, newCompCopy.competencyName || newCompCopy.name);
        }
      }
      
      // Add existing competencies that weren't in new data (preserve them)
      for (const existingComp of existingComps) {
        const compId = existingComp.competencyId || existingComp.competency_id;
        if (compId && !processedIds.has(compId)) {
          updatedComps.push(existingComp);
        }
      }
      
      return updatedComps;
    };
    
    // Merge new competencies with existing ones
    let updatedCompetencies = mergeAndUpdateCompetencies(existingSkills.competencies, newCompetencies);
    
    // Post-process: Ensure all skills inherit level from their parent competency
    const propagateLevelsToSkills = (competencies) => {
      if (!Array.isArray(competencies)) return competencies;
      
      return competencies.map(comp => {
        const updated = { ...comp };
        const compLevel = comp.level && String(comp.level).toLowerCase() !== 'undefined' ? comp.level : null;
        
        // Propagate level to skills if competency has a level
        if (compLevel && updated.skills && Array.isArray(updated.skills)) {
          updated.skills = updated.skills.map(skill => ({
            ...skill,
            level: skill.level && String(skill.level).toLowerCase() !== 'undefined'
              ? skill.level
              : compLevel
          }));
        }
        
        // Recursively process children
        if (updated.children && Array.isArray(updated.children)) {
          updated.children = propagateLevelsToSkills(updated.children);
        }
        if (updated.nested_competencies && Array.isArray(updated.nested_competencies)) {
          updated.nested_competencies = propagateLevelsToSkills(updated.nested_competencies);
        }
        
        return updated;
      });
    };
    
    updatedCompetencies = propagateLevelsToSkills(updatedCompetencies);
    
    console.log('[EmployeeSkillsRepository] Merged competencies count:', updatedCompetencies.length);
    
    // Log competencies with levels and their skills
    const competenciesWithLevels = updatedCompetencies.filter(comp => {
      const level = comp.level;
      return level && String(level).toLowerCase() !== 'undefined';
    });
    
    console.log('[EmployeeSkillsRepository] Competencies with verified levels:', competenciesWithLevels.length);
    competenciesWithLevels.forEach(comp => {
      const compId = comp.competencyId || comp.competency_id;
      const compName = comp.competencyName || comp.name;
      const compLevel = comp.level;
      const skillsCount = comp.skills ? comp.skills.length : 0;
      const skillsWithLevels = comp.skills ? comp.skills.filter(s => {
        const sLevel = s.level;
        return sLevel && String(sLevel).toLowerCase() !== 'undefined';
      }).length : 0;
      
      console.log('[EmployeeSkillsRepository] - Competency:', compName, '| Level:', compLevel, '| Skills:', skillsCount, '| Skills with levels:', skillsWithLevels);
    });
    
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
    
    console.log('[EmployeeSkillsRepository] ✅ Successfully updated and merged skill levels');
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

