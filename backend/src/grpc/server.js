// GRPC Server for Directory Service
// Handles GRPC requests from Coordinator for RAG Service integration

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const processHandler = require('./handlers/processHandler');
const config = require('../config');

/**
 * GRPC Server for Directory Service
 * Receives requests from Coordinator for RAG Service integration
 */
class GrpcServer {
  constructor() {
    this.server = null;
    this.port = process.env.GRPC_PORT || 50051;
  }

  /**
   * Start GRPC server
   */
  async start() {
    try {
      console.log('[GRPC Server] Starting GRPC server', {
        service: config.coordinator.serviceName || 'directory-service',
        port: this.port
      });

      // Load proto file
      const PROTO_PATH = path.join(__dirname, '../../proto/microservice.proto');
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      // Load package
      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const microservice = protoDescriptor.microservice.v1;

      // Create server
      this.server = new grpc.Server();

      // Register Process handler
      this.server.addService(microservice.MicroserviceAPI.service, {
        Process: processHandler.handle.bind(processHandler)
      });

      // Bind and start
      this.server.bindAsync(
        `0.0.0.0:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            console.error('[GRPC Server] Failed to start GRPC server', {
              service: config.coordinator.serviceName,
              error: error.message,
              stack: error.stack
            });
            throw error;
          }

          console.log('[GRPC Server] ✅ GRPC server started successfully', {
            service: config.coordinator.serviceName,
            port: port
          });
        }
      );

    } catch (error) {
      console.error('[GRPC Server] GRPC server startup failed', {
        service: config.coordinator.serviceName,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Shutdown GRPC server gracefully
   */
  async shutdown() {
    if (this.server) {
      console.log('[GRPC Server] Shutting down GRPC server', {
        service: config.coordinator.serviceName
      });

      return new Promise((resolve) => {
        this.server.tryShutdown(() => {
          console.log('[GRPC Server] ✅ GRPC server shut down', {
            service: config.coordinator.serviceName
          });
          resolve();
        });
      });
    }
  }
}

module.exports = new GrpcServer();

