// Coordinator gRPC Client
// Handles gRPC communication between Directory Service and Coordinator
// Based on: GRPC_COMMUNICATION_ARCHITECTURE.md + MICROSERVICE_IMPLEMENTATION_GUIDE.md

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { generateSignature } = require('../../utils/signature');
const config = require('../../config');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../../proto/rag/v1/coordinator.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const coordinatorProto = protoDescriptor.rag.v1;

// Get gRPC configuration
const GRPC_COORDINATOR_HOST = process.env.GRPC_COORDINATOR_HOST || 'coordinator';
const GRPC_COORDINATOR_PORT = process.env.GRPC_COORDINATOR_PORT || '50051';
const GRPC_USE_SSL = process.env.GRPC_USE_SSL === 'true';
const GRPC_TIMEOUT = parseInt(process.env.GRPC_TIMEOUT || '30000', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * Get gRPC credentials (insecure for dev, SSL for prod)
 */
function getCredentials() {
  if (GRPC_USE_SSL) {
    console.log('[CoordinatorGrpcClient] Using SSL/TLS credentials for gRPC');
    const rootCert = process.env.GRPC_ROOT_CERT;
    if (rootCert) {
      return grpc.credentials.createSsl(
        Buffer.from(rootCert, 'base64')
      );
    }
    return grpc.credentials.createSsl();
  }
  
  console.log('[CoordinatorGrpcClient] Using insecure credentials for gRPC (development)');
  return grpc.credentials.createInsecure();
}

/**
 * Coordinator gRPC Client
 */
class CoordinatorGrpcClient {
  constructor() {
    const coordinatorUrl = `${GRPC_COORDINATOR_HOST}:${GRPC_COORDINATOR_PORT}`;
    console.log(`[CoordinatorGrpcClient] Initializing gRPC client for Coordinator: ${coordinatorUrl}`);
    
    this.client = new coordinatorProto.CoordinatorService(
      coordinatorUrl,
      getCredentials()
    );
    
    console.log('[CoordinatorGrpcClient] gRPC client initialized successfully');
  }

  /**
   * Route request to Coordinator via gRPC
   * @param {Object} params - Request parameters
   * @param {string} params.tenantId - Tenant ID (company ID)
   * @param {string} params.userId - User ID (employee ID)
   * @param {string} params.queryText - Query text
   * @param {Object} params.context - Additional context
   * @param {string} params.envelopeJson - Universal Envelope JSON string
   * @returns {Promise<Object>} RouteResponse
   */
  async routeRequest({ tenantId, userId, queryText, context = {}, envelopeJson }) {
    console.log('[CoordinatorGrpcClient] ===== ROUTE REQUEST START =====');
    console.log('[CoordinatorGrpcClient] tenantId:', tenantId);
    console.log('[CoordinatorGrpcClient] userId:', userId);
    console.log('[CoordinatorGrpcClient] queryText:', queryText?.substring(0, 100) + '...');
    
    // Build RouteRequest message
    const request = {
      tenant_id: tenantId,
      user_id: userId,
      query_text: queryText,
      requester_service: SERVICE_NAME,
      context: context || {},
      envelope_json: envelopeJson || '{}'
    };

    // Generate signature if private key is configured
    const metadata = new grpc.Metadata();
    const timestamp = Date.now().toString();
    
    if (PRIVATE_KEY) {
      try {
        // Normalize PRIVATE_KEY to handle multiline strings from environment variables
        let normalizedPrivateKey = PRIVATE_KEY;
        if (normalizedPrivateKey.includes('\\n')) {
          normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, '\n');
        }
        
        const signature = generateSignature(SERVICE_NAME, normalizedPrivateKey, request);
        metadata.add('x-signature', signature);
        metadata.add('x-timestamp', timestamp);
        metadata.add('x-requester-service', SERVICE_NAME);
        
        console.log('[CoordinatorGrpcClient] Signature generated successfully');
      } catch (signatureError) {
        console.error('[CoordinatorGrpcClient] Signature generation failed:', signatureError);
        throw new Error(`Failed to generate signature: ${signatureError.message}`);
      }
    } else {
      console.warn('[CoordinatorGrpcClient] PRIVATE_KEY not configured, sending without signature');
      metadata.add('x-timestamp', timestamp);
      metadata.add('x-requester-service', SERVICE_NAME);
    }

    // Make gRPC call
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setMilliseconds(deadline.getMilliseconds() + GRPC_TIMEOUT);
      
      console.log('[CoordinatorGrpcClient] Making gRPC Route() call to Coordinator...');
      
      this.client.Route(
        request,
        metadata,
        { deadline },
        (error, response) => {
          if (error) {
            console.error('[CoordinatorGrpcClient] ===== gRPC CALL ERROR =====');
            console.error('[CoordinatorGrpcClient] Error code:', error.code);
            console.error('[CoordinatorGrpcClient] Error message:', error.message);
            console.error('[CoordinatorGrpcClient] Error details:', error.details);
            
            // Map gRPC errors to standard errors
            const errorDetails = this.mapGrpcError(error);
            reject(errorDetails);
          } else {
            console.log('[CoordinatorGrpcClient] ===== gRPC CALL SUCCESS =====');
            console.log('[CoordinatorGrpcClient] Response received:', {
              target_services: response.target_services,
              normalized_fields_count: Object.keys(response.normalized_fields || {}).length,
              has_envelope_json: !!response.envelope_json,
              has_routing_metadata: !!response.routing_metadata
            });
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Map gRPC error codes to error details
   * @param {Error} error - gRPC error
   * @returns {Error} Mapped error
   */
  mapGrpcError(error) {
    const errorMappings = {
      [grpc.status.DEADLINE_EXCEEDED]: {
        type: 'TIMEOUT',
        retryable: true,
        message: 'Coordinator request timed out'
      },
      [grpc.status.UNAVAILABLE]: {
        type: 'SERVICE_UNAVAILABLE',
        retryable: true,
        message: 'Coordinator service is unavailable'
      },
      [grpc.status.NOT_FOUND]: {
        type: 'NOT_FOUND',
        retryable: false,
        message: 'Coordinator route not found'
      },
      [grpc.status.INVALID_ARGUMENT]: {
        type: 'INVALID_REQUEST',
        retryable: false,
        message: 'Invalid request to Coordinator'
      },
      [grpc.status.UNAUTHENTICATED]: {
        type: 'UNAUTHENTICATED',
        retryable: false,
        message: 'Authentication failed with Coordinator'
      },
      [grpc.status.INTERNAL]: {
        type: 'INTERNAL_ERROR',
        retryable: true,
        message: 'Coordinator internal error'
      }
    };

    const errorDetails = errorMappings[error.code] || {
      type: 'UNKNOWN_ERROR',
      retryable: false,
      message: error.message || 'Unknown gRPC error'
    };

    const mappedError = new Error(errorDetails.message);
    mappedError.code = error.code;
    mappedError.type = errorDetails.type;
    mappedError.retryable = errorDetails.retryable;
    mappedError.originalError = error;

    return mappedError;
  }
}

module.exports = CoordinatorGrpcClient;

