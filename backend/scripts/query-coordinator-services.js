// Script to query Coordinator for registered services
// This helps find service IDs for migration uploads
// Usage: node backend/scripts/query-coordinator-services.js

require('dotenv').config();
const config = require('../src/config');

const COORDINATOR_URL = process.env.COORDINATOR_URL || config.coordinator?.baseUrl || 'https://coordinator-production-e0a0.up.railway.app';

async function queryServices() {
  try {
    console.log('='.repeat(60));
    console.log('Query Coordinator for Registered Services');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Coordinator URL: ${COORDINATOR_URL}`);
    console.log('');

    // Try to query Coordinator's service registry
    // Note: This endpoint may vary - check Coordinator API docs
    const endpointsToTry = [
      '/register',  // Might return list if GET is supported
      '/services',   // Common endpoint for service listing
      '/api/services', // Alternative
      '/api/register/services' // Another possibility
    ];

    console.log('Attempting to query Coordinator for service list...');
    console.log('');

    for (const endpoint of endpointsToTry) {
      try {
        const url = `${COORDINATOR_URL}${endpoint}`;
        console.log(`Trying: GET ${url}`);
        
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (resp.ok) {
          const data = await resp.json();
          console.log('');
          console.log('✅ Success! Found service registry endpoint:');
          console.log(JSON.stringify(data, null, 2));
          console.log('');
          
          // Try to find Course Builder service
          if (Array.isArray(data)) {
            const courseBuilder = data.find(s => 
              s.serviceName?.toLowerCase().includes('course') || 
              s.service_name?.toLowerCase().includes('course')
            );
            if (courseBuilder) {
              console.log('='.repeat(60));
              console.log('🎯 Course Builder Service Found:');
              console.log(JSON.stringify(courseBuilder, null, 2));
              console.log('='.repeat(60));
              return;
            }
          } else if (data.services && Array.isArray(data.services)) {
            const courseBuilder = data.services.find(s => 
              s.serviceName?.toLowerCase().includes('course') || 
              s.service_name?.toLowerCase().includes('course')
            );
            if (courseBuilder) {
              console.log('='.repeat(60));
              console.log('🎯 Course Builder Service Found:');
              console.log(JSON.stringify(courseBuilder, null, 2));
              console.log('='.repeat(60));
              return;
            }
          }
          
          return;
        } else {
          console.log(`  → Status ${resp.status}: ${resp.statusText}`);
        }
      } catch (err) {
        console.log(`  → Error: ${err.message}`);
      }
    }

    console.log('');
    console.log('⚠️  Could not find service registry endpoint.');
    console.log('');
    console.log('Alternative methods to find Course Builder Service ID:');
    console.log('  1. Check Course Builder registration logs when it first registered');
    console.log('  2. Check Coordinator database directly (if you have access)');
    console.log('  3. Contact Course Builder team for their service ID');
    console.log('  4. Check Coordinator admin dashboard (if available)');
    console.log('  5. Look for service ID in Course Builder environment variables');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error querying Coordinator:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
queryServices();


