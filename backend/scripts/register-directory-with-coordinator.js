// Script to register Directory Service with Coordinator (two-step process)
// Usage: node backend/scripts/register-directory-with-coordinator.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('../src/config');

// Set COORDINATOR_URL in process.env before requiring CoordinatorClient
// (CoordinatorClient reads it at module load time)
if (!process.env.COORDINATOR_URL && config.coordinator.baseUrl) {
  process.env.COORDINATOR_URL = config.coordinator.baseUrl;
}

const { registerService, uploadMigration } = require('../src/infrastructure/CoordinatorClient');

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Directory Service Registration with Coordinator');
    console.log('='.repeat(60));
    console.log('');

    // Configuration
    const SERVICE_NAME = 'directory-service';
    const SERVICE_ENDPOINT = process.env.DIRECTORY_URL || 'https://directory3-production.up.railway.app';
    const SERVICE_VERSION = '1.0.0';
    const COORDINATOR_URL = process.env.COORDINATOR_URL;

    if (!COORDINATOR_URL) {
      throw new Error('COORDINATOR_URL environment variable is required');
    }

    console.log(`[Config] Service Name: ${SERVICE_NAME}`);
    console.log(`[Config] Service Endpoint: ${SERVICE_ENDPOINT}`);
    console.log(`[Config] Service Version: ${SERVICE_VERSION}`);
    console.log(`[Config] Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`[Config] Private Key configured: ${!!process.env.PRIVATE_KEY}`);
    console.log('');

    // STEP 1: Register the service
    console.log('STEP 1: Registering service with Coordinator...');
    console.log('-'.repeat(60));
    
    const { resp: registerResp, data: registerData } = await registerService(SERVICE_NAME, SERVICE_ENDPOINT, SERVICE_VERSION);

    if (!registerResp.ok) {
      throw new Error(`Service registration failed: ${registerResp.status} - ${JSON.stringify(registerData)}`);
    }

    if (!registerData.success) {
      throw new Error(`Service registration failed: ${registerData.message || JSON.stringify(registerData)}`);
    }

    const serviceId = registerData.serviceId || registerData.data?.serviceId;
    if (!serviceId) {
      throw new Error(`Service registration succeeded but no serviceId returned: ${JSON.stringify(registerData)}`);
    }

    console.log('');
    console.log('✅ STEP 1 SUCCESS: Service registered');
    console.log(`   Service ID: ${serviceId}`);
    console.log('');

    // STEP 2: Upload migration file
    console.log('STEP 2: Uploading migration file...');
    console.log('-'.repeat(60));

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
    const { resp: migrationResp, data: migrationDataResponse } = await uploadMigration(serviceId, migrationData);

    if (!migrationResp.ok) {
      throw new Error(`Migration upload failed: ${migrationResp.status} - ${JSON.stringify(migrationDataResponse)}`);
    }

    if (!migrationDataResponse.success) {
      throw new Error(`Migration upload failed: ${migrationDataResponse.message || JSON.stringify(migrationDataResponse)}`);
    }

    console.log('');
    console.log('✅ STEP 2 SUCCESS: Migration uploaded');
    console.log('');

    // Final success message
    console.log('='.repeat(60));
    console.log('✅ REGISTRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Service Name: ${SERVICE_NAME}`);
    console.log(`Service ID: ${serviceId}`);
    console.log(`Service Endpoint: ${SERVICE_ENDPOINT}`);
    console.log(`Migration Version: ${migrationData.version}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ REGISTRATION FAILED');
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

