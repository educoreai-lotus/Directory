// Chatbot Controller
// Express controller for chatbot endpoints

const ChatbotQueryService = require('../services/ChatbotQueryService');
const { formatResponse } = require('../shared/responseFormatter');

class ChatbotController {
  constructor() {
    this.chatbotQueryService = new ChatbotQueryService();
  }

  /**
   * Process chatbot query
   * POST /api/v1/chatbot/query
   */
  async processQuery(req, res, next) {
    console.log('[ChatbotController] ===== PROCESS QUERY REQUEST =====');
    console.log('[ChatbotController] Method:', req.method);
    console.log('[ChatbotController] Path:', req.path);
    console.log('[ChatbotController] User:', req.user ? {
      id: req.user.id,
      employeeId: req.user.employeeId,
      companyId: req.user.companyId
    } : 'null');

    try {
      // Extract user context from authMiddleware
      if (!req.user) {
        console.error('[ChatbotController] No user in request (authMiddleware failed)');
        return res.status(401).json(formatResponse({
          success: false,
          message: 'Authentication required'
        }));
      }

      const userId = req.user.id || req.user.employeeId;
      const companyId = req.user.companyId;

      if (!userId || !companyId) {
        console.error('[ChatbotController] Missing user context:', {
          userId: !!userId,
          companyId: !!companyId
        });
        return res.status(400).json(formatResponse({
          success: false,
          message: 'Missing user context'
        }));
      }

      // Extract query from request body
      const { query, context } = req.body || {};

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        console.error('[ChatbotController] Invalid query:', query);
        return res.status(400).json(formatResponse({
          success: false,
          message: 'Query text is required'
        }));
      }

      console.log('[ChatbotController] Processing query:', {
        userId,
        companyId,
        queryLength: query.length,
        hasContext: !!context
      });

      // Process query via service
      const result = await this.chatbotQueryService.processQuery({
        userId,
        companyId,
        queryText: query.trim(),
        context: context || {}
      });

      console.log('[ChatbotController] Query processed:', {
        success: result.success,
        targetServicesCount: result.target_services?.length || 0
      });

      // Return response in Directory envelope format
      return res.status(200).json(formatResponse({
        success: result.success,
        message: result.success ? 'Query processed successfully' : 'Query processing failed',
        data: {
          target_services: result.target_services,
          normalized_fields: result.normalized_fields,
          envelope_json: result.envelope_json,
          routing_metadata: result.routing_metadata
        },
        error: result.error || undefined
      }));

    } catch (error) {
      console.error('[ChatbotController] ===== PROCESS QUERY ERROR =====');
      console.error('[ChatbotController] Error:', error.message);
      console.error('[ChatbotController] Stack:', error.stack);

      return res.status(500).json(formatResponse({
        success: false,
        message: 'Internal server error while processing query',
        error: {
          type: 'INTERNAL_ERROR',
          message: error.message
        }
      }));
    }
  }
}

module.exports = ChatbotController;

