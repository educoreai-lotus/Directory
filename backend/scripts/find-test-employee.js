// Script to find a valid test employee for Coordinator endpoint testing
// Usage: node backend/scripts/find-test-employee.js

const { Pool } = require('pg');
const config = require('../src/config');

async function findTestEmployee() {
  if (!config.databaseUrl) {
    console.error('❌ DATABASE_URL or database connection parameters are not configured.');
    console.error('Please set DATABASE_URL or individual DB_* environment variables.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
  });

  try {
    console.log('🔗 Connecting to database...\n');

    // Query to find an approved employee with valid employee_id and company_id
    const query = `
      SELECT 
        e.id AS employee_id,
        e.employee_id AS employee_code,
        e.full_name,
        e.email,
        e.profile_status,
        e.company_id,
        c.id AS company_uuid,
        c.company_name
      FROM employees e
      INNER JOIN companies c ON e.company_id = c.id
      WHERE 
        e.profile_status = 'approved'
        AND e.employee_id IS NOT NULL
        AND e.employee_id != ''
        AND e.company_id IS NOT NULL
        AND c.id IS NOT NULL
      ORDER BY e.created_at DESC
      LIMIT 1;
    `;

    console.log('📊 Querying database for approved employee...\n');
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ No approved employees found with valid employee_id and company_id.');
      console.log('\n💡 You may need to:');
      console.log('   1. Upload a CSV with employees');
      console.log('   2. Approve employee profiles via HR dashboard');
      console.log('   3. Ensure employees have employee_id values\n');
      
      // Show what we have
      const countQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE profile_status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE employee_id IS NOT NULL AND employee_id != '') as with_employee_id,
          COUNT(*) FILTER (WHERE profile_status = 'approved' AND employee_id IS NOT NULL AND employee_id != '') as valid_count
        FROM employees;
      `;
      const countResult = await pool.query(countQuery);
      console.log('📈 Current database status:');
      console.log(`   - Approved employees: ${countResult.rows[0].approved_count}`);
      console.log(`   - Employees with employee_id: ${countResult.rows[0].with_employee_id}`);
      console.log(`   - Valid for testing: ${countResult.rows[0].valid_count}\n`);
      
      process.exit(1);
    }

    const employee = result.rows[0];

    // Format result as requested
    const output = {
      companyId: employee.company_id,
      employeeId: employee.employee_id,
      fullName: employee.full_name,
      email: employee.email,
      approved: true
    };

    console.log('✅ Found valid test employee:\n');
    console.log(JSON.stringify(output, null, 2));
    console.log('\n📝 Additional Info:');
    console.log(`   - Company Name: ${employee.company_name}`);
    console.log(`   - Employee Code: ${employee.employee_code}`);
    console.log(`   - Profile Status: ${employee.profile_status}`);
    console.log(`   - Company UUID: ${employee.company_uuid}`);
    console.log('\n🧪 Test URL:');
    console.log(`   GET /api/v1/companies/${output.companyId}/employees/${output.employeeId}/skills\n`);

    return output;

  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  findTestEmployee()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { findTestEmployee };

