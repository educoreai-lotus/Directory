// Script to get Course Builder service ID from Coordinator
// This script attempts to register Course Builder (or get existing ID)
// Usage: node backend/scripts/get-course-builder-service-id.js

require('dotenv').config();
const config = require('../src/config');

// Set COORDINATOR_URL in process.env before requiring CoordinatorClient
if (!process.env.COORDINATOR_URL && config.coordinator.baseUrl) {
  process.env.COORDINATOR_URL = config.coordinator.baseUrl;
}

const { registerService } = require('../src/infrastructure/CoordinatorClient');

async function getServiceId() {
  try {
    console.log('='.repeat(60));
    console.log('Get Course Builder Service ID from Coordinator');
    console.log('='.repeat(60));
    console.log('');

    const COORDINATOR_URL = process.env.COORDINATOR_URL;
    const SERVICE_NAME = 'course-builder-service';
    const ENDPOINT = 'https://coursebuilderfs-production.up.railway.app/api/fill-content-metrics';
    const VERSION = '1.0.0';

    console.log(`[Config] Service Name: ${SERVICE_NAME}`);
    console.log(`[Config] Endpoint: ${ENDPOINT}`);
    console.log(`[Config] Version: ${VERSION}`);
    console.log(`[Config] Coordinator URL: ${COORDINATOR_URL}`);
    console.log('');

    console.log('Attempting to register Course Builder with Coordinator...');
    console.log('(If already registered, this may return the existing service ID)');
    console.log('-'.repeat(60));
    console.log('');

    // Attempt registration - Coordinator may return existing service ID if already registered
    const { resp, data } = await registerService(SERVICE_NAME, ENDPOINT, VERSION);

    console.log('');
    console.log('='.repeat(60));
    console.log('Registration Response:');
    console.log('='.repeat(60));
    console.log(`Status: ${resp.status} ${resp.statusText}`);
    console.log(`Response Data:`, JSON.stringify(data, null, 2));
    console.log('');

    if (resp.ok && data) {
      // Check if response contains service ID
      const serviceId = data.serviceId || data.id || data.service_id || data.service?.id;
      
      if (serviceId) {
        console.log('='.repeat(60));
        console.log('✅ Course Builder Service ID Found:');
        console.log('='.repeat(60));
        console.log(`Service ID: ${serviceId}`);
        console.log('');
        console.log('To use this service ID, run:');
        console.log(`export COURSE_BUILDER_SERVICE_ID="${serviceId}"`);
        console.log('or add it to your .env file:');
        console.log(`COURSE_BUILDER_SERVICE_ID=${serviceId}`);
        console.log('');
        console.log('Then upload the migration:');
        console.log('node backend/scripts/upload-course-builder-migration.js');
        console.log('='.repeat(60));
        return serviceId;
      } else {
        console.log('⚠️  Response received but no service ID found in response.');
        console.log('Check the response data above for service identification.');
        console.log('');
        console.log('Alternative: Check Course Builder registration logs or');
        console.log('contact Course Builder team for their service ID.');
      }
    } else {
      console.log('⚠️  Registration request did not succeed.');
      console.log('This might mean:');
      console.log('  1. Course Builder is already registered (check logs for existing ID)');
      console.log('  2. Coordinator requires different authentication');
      console.log('  3. Service name or endpoint is incorrect');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Check Course Builder registration logs');
      console.log('  2. Check Coordinator database for service registry');
      console.log('  3. Contact Course Builder team for service ID');
    }

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Error getting service ID:');
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
getServiceId();


