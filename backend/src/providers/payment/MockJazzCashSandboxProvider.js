const { v4: uuidv4 } = require('uuid');
const PaymentProvider = require('./PaymentProvider');

/**
 * MockJazzCashSandboxProvider — simulates a JazzCash-style payment gateway.
 * 
 * Implements the full flow: initiate → redirect → callback → server-side verify.
 * Even though it's fake, the server independently "verifies" via a mock verify
 * endpoint — never trusting a frontend "success" message directly.
 * 
 * This mirrors real gateway security so the real provider is a drop-in replacement.
 */

// In-memory mock transaction store (simulates gateway-side records)
const mockTransactions = new Map();

class MockJazzCashSandboxProvider extends PaymentProvider {
  /**
   * Simulate initiating a payment checkout.
   * Returns a fake checkout URL that the frontend will redirect to.
   */
  async initiatePayment({ paymentId, amount, description, customerEmail, callbackUrl, idempotencyKey }) {
    const transactionId = `MOCK-TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Store the transaction in our mock "gateway"
    mockTransactions.set(transactionId, {
      transactionId,
      paymentId,
      amount,
      description,
      customerEmail,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      idempotencyKey,
    });

    // In a real gateway, this would be a redirect URL to their hosted checkout
    // For our mock, the frontend will show a simulated payment form
    const checkoutUrl = `/checkout?txn=${transactionId}&amount=${amount}`;

    console.log(`[MockJazzCash] Payment initiated: ${transactionId} for Rs ${amount}`);

    return {
      checkoutUrl,
      transactionId,
    };
  }

  /**
   * Server-side verification of a transaction.
   * Even in mock mode, we verify independently — never trust the callback alone.
   */
  async verifyPayment(transactionId) {
    const txn = mockTransactions.get(transactionId);

    if (!txn) {
      return {
        verified: false,
        amount: 0,
        status: 'NOT_FOUND',
        rawResponse: { error: 'Transaction not found' },
      };
    }

    return {
      verified: txn.status === 'COMPLETED',
      amount: txn.amount,
      status: txn.status,
      rawResponse: { ...txn },
    };
  }

  /**
   * Process a webhook callback from the "gateway".
   * In the mock, the frontend triggers this after the simulated checkout.
   */
  async processCallback(payload) {
    const { transactionId, status } = payload;
    const txn = mockTransactions.get(transactionId);

    if (!txn) {
      return {
        transactionId,
        status: 'FAILED',
        amount: 0,
        verified: false,
      };
    }

    // Update mock transaction status
    txn.status = status === 'success' ? 'COMPLETED' : 'FAILED';
    mockTransactions.set(transactionId, txn);

    console.log(`[MockJazzCash] Callback received: ${transactionId} → ${txn.status}`);

    // Server independently verifies (even though we just set it)
    const verification = await this.verifyPayment(transactionId);

    return {
      transactionId,
      status: txn.status,
      amount: txn.amount,
      verified: verification.verified,
    };
  }

  /**
   * Simulate completing a payment (called by mock checkout endpoint).
   * This is specific to the mock — real gateways handle this on their end.
   */
  static simulatePaymentCompletion(transactionId, success = true) {
    const txn = mockTransactions.get(transactionId);
    if (txn) {
      txn.status = success ? 'COMPLETED' : 'FAILED';
      mockTransactions.set(transactionId, txn);
      console.log(`[MockJazzCash] Payment ${success ? 'completed' : 'failed'}: ${transactionId}`);
    }
    return txn;
  }
}

module.exports = MockJazzCashSandboxProvider;
