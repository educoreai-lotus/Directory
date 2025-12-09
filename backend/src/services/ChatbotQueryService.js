// Chatbot Query Service
// Service layer for processing chatbot queries via Coordinator gRPC

const CoordinatorGrpcClient = require('../infrastructure/grpc/CoordinatorGrpcClient');
const crypto = require('crypto');

class ChatbotQueryService {
  constructor() {
    this.grpcClient = new CoordinatorGrpcClient();
  }

  /**
   * Process chatbot query
   * @param {Object} params - Query parameters
   * @param {string} params.userId - User ID (employee ID)
   * @param {string} params.companyId - Company ID (tenant ID)
   * @param {string} params.queryText - Query text from user
   * @param {Object} params.context - Additional context (optional)
   * @returns {Promise<Object>} Formatted response
   */
  async processQuery({ userId, companyId, queryText, context = {} }) {
    console.log('[ChatbotQueryService] ===== PROCESS QUERY START =====');
    console.log('[ChatbotQueryService] userId:', userId);
    console.log('[ChatbotQueryService] companyId:', companyId);
    console.log('[ChatbotQueryService] queryText:', queryText?.substring(0, 100) + '...');

    try {
      // Create Universal Envelope
      const envelope = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        request_id: `dir-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        tenant_id: companyId,
        user_id: userId,
        source: 'directory-service',
        payload: {
          query_text: queryText,
          metadata: {
            category: this.detectCategory(queryText),
            context: context
          }
        }
      };

      console.log('[ChatbotQueryService] Universal Envelope created:', {
        version: envelope.version,
        request_id: envelope.request_id,
        tenant_id: envelope.tenant_id,
        user_id: envelope.user_id,
        source: envelope.source
      });

      // Call Coordinator via gRPC
      const response = await this.grpcClient.routeRequest({
        tenantId: companyId,
        userId: userId,
        queryText: queryText,
        context: context,
        envelopeJson: JSON.stringify(envelope)
      });

      console.log('[ChatbotQueryService] Coordinator response received');

      // Format response for frontend
      const formattedResponse = {
        success: true,
        target_services: response.target_services || [],
        normalized_fields: response.normalized_fields || {},
        envelope_json: response.envelope_json || '{}',
        routing_metadata: response.routing_metadata || '{}'
      };

      console.log('[ChatbotQueryService] ===== PROCESS QUERY SUCCESS =====');
      return formattedResponse;

    } catch (error) {
      console.error('[ChatbotQueryService] ===== PROCESS QUERY ERROR =====');
      console.error('[ChatbotQueryService] Error:', error.message);
      console.error('[ChatbotQueryService] Error type:', error.type);
      console.error('[ChatbotQueryService] Error retryable:', error.retryable);

      // Return graceful error response
      return {
        success: false,
        error: {
          type: error.type || 'UNKNOWN_ERROR',
          message: error.message || 'Failed to process query',
          retryable: error.retryable || false
        },
        target_services: [],
        normalized_fields: {},
        envelope_json: '{}',
        routing_metadata: '{}'
      };
    }
  }

  /**
   * Detect query category (simple heuristic)
   * @param {string} queryText - Query text
   * @returns {string} Category
   */
  detectCategory(queryText) {
    const text = queryText.toLowerCase();
    
    if (text.includes('assessment') || text.includes('test') || text.includes('exam')) {
      return 'assessment';
    }
    if (text.includes('course') || text.includes('learning') || text.includes('training')) {
      return 'learning';
    }
    if (text.includes('skill') || text.includes('competency')) {
      return 'skills';
    }
    if (text.includes('progress') || text.includes('analytics') || text.includes('report')) {
      return 'analytics';
    }
    
    return 'general';
  }
}

module.exports = ChatbotQueryService;

