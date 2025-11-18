// Script to find HR contact email for a company
// Usage: node scripts/find-hr-email.js [company_name_or_domain]

const { Pool } = require('pg');
const config = require('../src/config');

async function findHREmail(companyNameOrDomain) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
  });

  try {
    console.log('Connecting to database...');
    console.log('Searching for company:', companyNameOrDomain || 'TechFlow Innovations');
    
    // Search by company name or domain
    const query = `
      SELECT 
        id,
        company_name,
        domain,
        hr_contact_name,
        hr_contact_email,
        hr_contact_role,
        verification_status,
        created_at
      FROM companies
      WHERE 
        LOWER(company_name) LIKE LOWER($1)
        OR LOWER(domain) LIKE LOWER($1)
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const searchTerm = `%${companyNameOrDomain || 'techflow%'}%`;
    const result = await pool.query(query, [searchTerm]);

    if (result.rows.length === 0) {
      console.log('\n❌ No company found matching:', companyNameOrDomain || 'TechFlow');
      console.log('\nTrying broader search...');
      
      // Try broader search
      const allCompanies = await pool.query(`
        SELECT company_name, domain, hr_contact_email, hr_contact_name
        FROM companies
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      if (allCompanies.rows.length > 0) {
        console.log('\n📋 Found companies in database:');
        allCompanies.rows.forEach((company, index) => {
          console.log(`\n${index + 1}. ${company.company_name}`);
          console.log(`   Domain: ${company.domain}`);
          console.log(`   HR Email: ${company.hr_contact_email || 'Not set'}`);
          console.log(`   HR Name: ${company.hr_contact_name || 'Not set'}`);
        });
      } else {
        console.log('\n❌ No companies found in database.');
      }
    } else {
      console.log(`\n✅ Found ${result.rows.length} company(ies):\n`);
      result.rows.forEach((company, index) => {
        console.log(`${index + 1}. ${company.company_name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Domain: ${company.domain}`);
        console.log(`   HR Contact Name: ${company.hr_contact_name || 'Not set'}`);
        console.log(`   HR Contact Email: ${company.hr_contact_email || 'Not set'}`);
        console.log(`   HR Contact Role: ${company.hr_contact_role || 'Not set'}`);
        console.log(`   Verification Status: ${company.verification_status}`);
        console.log(`   Created: ${company.created_at}`);
        console.log('');
      });
    }

    // Also check employees for emma.thompson@techflow.io
    console.log('\n---\n');
    console.log('Checking employee: emma.thompson@techflow.io\n');
    
    const employeeQuery = `
      SELECT 
        e.id,
        e.employee_id,
        e.full_name,
        e.email,
        e.company_id,
        c.company_name,
        c.hr_contact_email as company_hr_email
      FROM employees e
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE LOWER(e.email) = LOWER($1)
    `;
    
    const employeeResult = await pool.query(employeeQuery, ['emma.thompson@techflow.io']);
    
    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      console.log(`✅ Found employee: ${employee.full_name}`);
      console.log(`   Email: ${employee.email}`);
      console.log(`   Employee ID: ${employee.employee_id}`);
      console.log(`   Company: ${employee.company_name}`);
      console.log(`   Company HR Email: ${employee.company_hr_email || 'Not set'}`);
      console.log('');
      console.log(`🔑 To log in as HR, use:`);
      console.log(`   Email: ${employee.company_hr_email || 'Check company registration'}`);
      console.log(`   Password: SecurePass123 (or the password set during registration)`);
    } else {
      console.log('❌ Employee not found in database.');
    }

  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Get company name from command line argument or use default
const companyName = process.argv[2] || 'techflow';
findHREmail(companyName);

