// Script to upload migration file only (when service is already registered)
// Usage: node backend/scripts/upload-migration-only.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('../src/config');

// Set COORDINATOR_URL in process.env before requiring CoordinatorClient
if (!process.env.COORDINATOR_URL && config.coordinator.baseUrl) {
  process.env.COORDINATOR_URL = config.coordinator.baseUrl;
}

const { uploadMigration } = require('../src/infrastructure/CoordinatorClient');

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Upload Migration File to Coordinator');
    console.log('='.repeat(60));
    console.log('');

    // Use the service ID from previous registration
    const SERVICE_ID = process.env.SERVICE_ID || 'bb6bfa28-66f5-4cb5-8706-e5b41d162bce';
    const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app';

    console.log(`[Config] Service ID: ${SERVICE_ID}`);
    console.log(`[Config] Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`[Config] Private Key configured: ${!!process.env.PRIVATE_KEY}`);
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'directory-migration.json');
    console.log(`[Migration] Reading migration file from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`[Migration] Migration data loaded:`, {
      service_name: migrationData.service_name,
      version: migrationData.version,
      endpoints_count: migrationData.schemas?.endpoints?.length || 0,
      tables_count: migrationData.schemas?.database?.length || 0,
      actions_count: migrationData.schemas?.actions?.length || 0
    });
    console.log('');

    // Upload migration
    console.log('Uploading migration file...');
    console.log('-'.repeat(60));
    const { resp: migrationResp, data: migrationDataResponse } = await uploadMigration(SERVICE_ID, migrationPath);

    if (!migrationResp.ok) {
      throw new Error(`Migration upload failed: ${migrationResp.status} - ${JSON.stringify(migrationDataResponse)}`);
    }

    if (!migrationDataResponse.success) {
      throw new Error(`Migration upload failed: ${migrationDataResponse.message || JSON.stringify(migrationDataResponse)}`);
    }

    console.log('');
    console.log('✅ SUCCESS: Migration uploaded');
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ MIGRATION UPLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(`Service ID: ${SERVICE_ID}`);
    console.log(`Migration Version: ${migrationData.version}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ MIGRATION UPLOAD FAILED');
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


