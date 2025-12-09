// Script to upload Course Builder Service migration to Coordinator
// Usage: node backend/scripts/upload-course-builder-migration.js
//
// IMPORTANT: You need Course Builder's service ID from Coordinator.
// To get it, you can:
// 1. Query Coordinator's /register endpoint to list services
// 2. Check Coordinator logs when Course Builder registered
// 3. Or set COURSE_BUILDER_SERVICE_ID environment variable

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('../src/config');

// Set COORDINATOR_URL in process.env before requiring CoordinatorClient
// (CoordinatorClient reads it at module load time)
if (!process.env.COORDINATOR_URL && config.coordinator.baseUrl) {
  process.env.COORDINATOR_URL = config.coordinator.baseUrl;
}

const { uploadMigration } = require('../src/infrastructure/CoordinatorClient');

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Upload Course Builder Service Migration to Coordinator');
    console.log('='.repeat(60));
    console.log('');

    // Configuration
    // TODO: Replace with actual Course Builder service ID from Coordinator
    // You can get this by:
    // 1. Querying Coordinator's service registry
    // 2. Checking Course Builder's registration logs
    // 3. Or setting COURSE_BUILDER_SERVICE_ID in .env
    const SERVICE_ID = process.env.COURSE_BUILDER_SERVICE_ID || 'REPLACE_WITH_COURSE_BUILDER_SERVICE_ID';
    const COORDINATOR_URL = process.env.COORDINATOR_URL;

    if (!COORDINATOR_URL) {
      throw new Error('COORDINATOR_URL environment variable is required');
    }

    if (SERVICE_ID === 'REPLACE_WITH_COURSE_BUILDER_SERVICE_ID') {
      console.error('');
      console.error('❌ ERROR: Course Builder Service ID not set!');
      console.error('');
      console.error('Please set COURSE_BUILDER_SERVICE_ID environment variable, or');
      console.error('update the SERVICE_ID constant in this script with the actual service ID.');
      console.error('');
      console.error('To find the service ID:');
      console.error('  1. Check Course Builder registration logs');
      console.error('  2. Query Coordinator API for registered services');
      console.error('  3. Check Coordinator database/service registry');
      console.error('');
      process.exit(1);
    }

    console.log(`[Config] Service ID: ${SERVICE_ID}`);
    console.log(`[Config] Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`[Config] Private Key configured: ${!!process.env.PRIVATE_KEY}`);
    console.log('');

    // Migration file path
    const migrationPath = path.join(__dirname, '..', 'migrations', 'course-builder-migration.json');
    console.log(`[Migration] Migration file path: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    // Verify file is readable
    const fileStats = fs.statSync(migrationPath);
    console.log(`[Migration] File size: ${fileStats.size} bytes`);
    
    // Read migration data for logging purposes only
    const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`[Migration] Migration file info:`, {
      service_name: migrationData.service_name,
      version: migrationData.version,
      capabilities_count: migrationData.capabilities?.length || 0,
      actions_count: Object.keys(migrationData.schemas?.actions || {}).length,
      endpoints_count: migrationData.schemas?.endpoints?.length || 0,
      tables_count: migrationData.schemas?.database?.length || 0
    });
    console.log('');
    console.log(`[Migration] Capabilities:`, migrationData.capabilities);
    console.log('');
    console.log(`[Migration] Actions:`, Object.keys(migrationData.schemas?.actions || {}));
    console.log('');

    // Upload migration file
    console.log('Uploading migration file to Coordinator...');
    console.log('-'.repeat(60));
    
    const { resp, data } = await uploadMigration(SERVICE_ID, migrationPath);

    if (!resp.ok) {
      throw new Error(`Migration upload failed: ${resp.status} - ${JSON.stringify(data)}`);
    }

    if (!data.success) {
      throw new Error(`Migration upload failed: ${data.message || JSON.stringify(data)}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Migration upload successful');
    console.log('='.repeat(60));
    console.log(`Service ID: ${SERVICE_ID}`);
    console.log(`Service Name: ${migrationData.service_name}`);
    console.log(`Migration Version: ${migrationData.version}`);
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify Coordinator Knowledge Graph shows Course Builder as target for enroll_employees_career_path');
    console.log('  2. Test enrollment flow from Directory to confirm routing');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Migration upload failed');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run the script
main();


