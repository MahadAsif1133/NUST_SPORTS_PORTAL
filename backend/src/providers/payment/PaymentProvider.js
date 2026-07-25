/**
 * PaymentProvider Interface
 * 
 * Abstract base class for payment gateway integrations.
 * Implementations: MockJazzCashSandboxProvider (development), RealPaymentProvider (production).
 */
class PaymentProvider {
  /**
   * Initiate a payment — returns a checkout URL or session token.
   * @param {Object} params
   * @param {string} params.paymentId - Internal payment record ID
   * @param {number} params.amount - Amount in PKR
   * @param {string} params.description - Payment description
   * @param {string} params.customerEmail - Customer email
   * @param {string} params.callbackUrl - Server callback URL for payment confirmation
   * @param {string} params.idempotencyKey - Idempotency key
   * @returns {Promise<Object>} { checkoutUrl, transactionId }
   */
  async initiatePayment(params) {
    throw new Error('PaymentProvider.initiatePayment() must be implemented');
  }

  /**
   * Verify a payment server-side (never trust client-side success alone).
   * @param {string} transactionId - Gateway transaction ID
   * @returns {Promise<Object>} { verified: boolean, amount: number, status: string, rawResponse: Object }
   */
  async verifyPayment(transactionId) {
    throw new Error('PaymentProvider.verifyPayment() must be implemented');
  }

  /**
   * Process a webhook/callback from the payment gateway.
   * @param {Object} payload - Raw webhook payload
   * @returns {Promise<Object>} { transactionId, status, amount, verified: boolean }
   */
  async processCallback(payload) {
    throw new Error('PaymentProvider.processCallback() must be implemented');
  }
}

module.exports = PaymentProvider;
