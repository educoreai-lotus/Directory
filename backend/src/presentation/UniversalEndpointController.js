// Presentation Layer - Universal Endpoint Controller
// Handles requests from other microservices via /api/fill-content-metrics

const FillContentMetricsUseCase = require('../application/FillContentMetricsUseCase');

class UniversalEndpointController {
  constructor() {
    this.fillContentMetricsUseCase = new FillContentMetricsUseCase();
  }

  /**
   * Handle universal endpoint request
   * POST /api/fill-content-metrics
   */
  async handleRequest(req, res) {
    try {
      // Parse request body (should be stringified JSON)
      let envelope;
      if (typeof req.body === 'string') {
        envelope = JSON.parse(req.body);
      } else {
        envelope = req.body;
      }

      // Validate envelope structure
      if (!envelope || typeof envelope !== 'object') {
        return res.status(400).send(JSON.stringify({
          success: false,
          data: {
            error: 'Invalid request format. Expected envelope with requester_service, payload, and response fields.'
          }
        }));
      }

      const { requester_service, payload, response } = envelope;

      // Validate required fields
      if (!requester_service || typeof requester_service !== 'string') {
        return res.status(400).send(JSON.stringify({
          success: false,
          data: {
            error: 'Missing or invalid requester_service field'
          }
        }));
      }

      if (!payload || typeof payload !== 'object') {
        return res.status(400).send(JSON.stringify({
          success: false,
          data: {
            error: 'Missing or invalid payload field'
          }
        }));
      }

      if (!response || typeof response !== 'object') {
        return res.status(400).send(JSON.stringify({
          success: false,
          data: {
            error: 'Missing or invalid response template field'
          }
        }));
      }

      console.log('[UniversalEndpointController] Received request from:', requester_service);
      console.log('[UniversalEndpointController] Payload:', JSON.stringify(payload));
      console.log('[UniversalEndpointController] Response template:', JSON.stringify(response));

      // Extract action from payload if present (for Coordinator routing)
      const action = payload?.action;
      if (action) {
        console.log('[UniversalEndpointController] Action:', action);
      }

      // Execute use case to fill response
      // Pass the FULL envelope so we can return it with filled response
      const filledEnvelope = await this.fillContentMetricsUseCase.execute(
        envelope // Pass full envelope, not just payload/response
      );

      // Return the FULL request object (original payload + filled response)
      // This matches Coordinator's expected format: same structure as received
      // Format: { requester_service, payload, response }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(filledEnvelope));

    } catch (error) {
      console.error('[UniversalEndpointController] Error:', error);

      // Return error in Coordinator's expected format
      const errorResponse = {
        success: false,
        data: {
          error: error.message || 'An error occurred while processing the request'
        }
      };

      res.status(500).send(JSON.stringify(errorResponse));
    }
  }
}

module.exports = UniversalEndpointController;

