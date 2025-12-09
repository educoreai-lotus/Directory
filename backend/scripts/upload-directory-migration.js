// Script to upload Directory Service migration to Coordinator
// Usage: node backend/scripts/upload-directory-migration.js

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
    console.log('Upload Directory Service Migration to Coordinator');
    console.log('='.repeat(60));
    console.log('');

    // Configuration
    const SERVICE_ID = 'b75b5a42-3b19-404e-819b-262001c4c38d';
    const COORDINATOR_URL = process.env.COORDINATOR_URL;

    if (!COORDINATOR_URL) {
      throw new Error('COORDINATOR_URL environment variable is required');
    }

    console.log(`[Config] Service ID: ${SERVICE_ID}`);
    console.log(`[Config] Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`[Config] Private Key configured: ${!!process.env.PRIVATE_KEY}`);
    console.log('');

    // Migration file path
    const migrationPath = path.join(__dirname, '..', 'migrations', 'directory-migration.json');
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
      endpoints_count: migrationData.schemas?.endpoints?.length || 0,
      tables_count: migrationData.schemas?.database?.length || 0,
      actions_count: migrationData.schemas?.actions?.length || 0
    });
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
    console.log(`Migration Version: ${migrationData.version}`);
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
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

