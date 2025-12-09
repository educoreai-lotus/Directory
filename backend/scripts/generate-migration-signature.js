// Script to generate X-Signature for migration file upload
// Usage: node backend/scripts/generate-migration-signature.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { generateSignature } = require('../src/utils/signature');

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Generate X-Signature for Migration File');
    console.log('='.repeat(60));
    console.log('');

    // Configuration
    const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
    let PRIVATE_KEY = process.env.PRIVATE_KEY;

    // Try to load from file if not in env
    if (!PRIVATE_KEY) {
      const keyPath = path.join(__dirname, '..', 'src', 'security', 'private-key.pem');
      if (fs.existsSync(keyPath)) {
        console.log(`[Key] Loading private key from file: ${keyPath}`);
        PRIVATE_KEY = fs.readFileSync(keyPath, 'utf8');
      }
    }

    if (!PRIVATE_KEY) {
      console.error('');
      console.error('PRIVATE_KEY not found. Please provide it in one of these ways:');
      console.error('  1. Set PRIVATE_KEY environment variable');
      console.error('  2. Place private key file at: backend/src/security/private-key.pem');
      console.error('');
      throw new Error('PRIVATE_KEY is required to generate signature');
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'directory-migration.json');
    console.log(`[Migration] Reading migration file from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`[Migration] Migration data loaded`);
    console.log(`[Migration] Service: ${migrationData.service_name}`);
    console.log(`[Migration] Version: ${migrationData.version}`);
    console.log('');

    // Generate signature
    console.log('Generating signature...');
    console.log('-'.repeat(60));
    
    const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, migrationData);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Signature Generated');
    console.log('='.repeat(60));
    console.log(`X-Service-Name: ${SERVICE_NAME}`);
    console.log(`X-Signature: ${signature}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Use these headers in your request:');
    console.log(`  X-Service-Name: ${SERVICE_NAME}`);
    console.log(`  X-Signature: ${signature}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Signature Generation Failed');
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

