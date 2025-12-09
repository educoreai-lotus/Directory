// Script to register Directory Service with Coordinator
// Usage: node backend/scripts/register-with-coordinator.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('../src/config');

// Set COORDINATOR_URL in process.env before requiring CoordinatorClient
// (CoordinatorClient reads it at module load time)
if (!process.env.COORDINATOR_URL && config.coordinator.baseUrl) {
  process.env.COORDINATOR_URL = config.coordinator.baseUrl;
}

const { registerService } = require('../src/infrastructure/CoordinatorClient');

async function main() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'directory-migration.json');
    console.log(`[Register] Reading migration file from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`[Register] Migration data loaded:`, {
      service_name: migrationData.service_name,
      version: migrationData.version,
      endpoints_count: migrationData.schemas?.endpoints?.length || 0,
      tables_count: migrationData.schemas?.database?.length || 0,
      actions_count: migrationData.schemas?.actions?.length || 0
    });

    // Check required environment variables
    const COORDINATOR_URL = process.env.COORDINATOR_URL;
    if (!COORDINATOR_URL) {
      throw new Error('COORDINATOR_URL environment variable is required');
    }

    console.log(`[Register] Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`[Register] Service Name: ${process.env.SERVICE_NAME || 'directory-service'}`);
    console.log(`[Register] Private Key configured: ${!!process.env.PRIVATE_KEY}`);

    // Register with Coordinator
    console.log(`[Register] Sending registration request to Coordinator...`);
    const { resp, data } = await registerService(migrationData);

    // Check response
    if (resp.ok) {
      console.log(`\n✅ [Register] Registration successful!`);
      console.log(`[Register] Response status: ${resp.status}`);
      console.log(`[Register] Response data:`, JSON.stringify(data, null, 2));
    } else {
      console.error(`\n❌ [Register] Registration failed!`);
      console.error(`[Register] Response status: ${resp.status}`);
      console.error(`[Register] Response data:`, JSON.stringify(data, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ [Register] Error during registration:`, error.message);
    console.error(`[Register] Stack:`, error.stack);
    process.exit(1);
  }
}

// Run the script
main();

