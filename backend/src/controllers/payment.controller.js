const paymentService = require('../services/payment.service');
const MockJazzCashSandboxProvider = require('../providers/payment/MockJazzCashSandboxProvider');

const initiate = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'];
    const result = await paymentService.initiatePayment({
      ...req.body,
      userId: req.user.id,
      idempotencyKey,
    }, req.ip);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const gatewayCallback = async (req, res, next) => {
  try {
    const result = await paymentService.handleGatewayCallback(req.body);
    res.json(result);
  } catch (err) { next(err); }
};

const uploadBankSlip = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'NoFile', message: 'Bank slip image is required' });
    }
    const result = await paymentService.uploadBankSlip({
      ...req.body,
      userId: req.user.id,
      slipPath: req.file.path,
    }, req.ip);
    res.status(201).json({ payment: result });
  } catch (err) { next(err); }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getUserPayments(req.user.id);
    res.json({ payments });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id, req.user.role === 'ADMIN' ? null : req.user.id);
    res.json({ payment });
  } catch (err) { next(err); }
};

/**
 * Mock checkout endpoint — simulates a payment gateway UI.
 * Only available in development.
 */
const mockCheckout = async (req, res) => {
  const { txn, amount } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Mock Payment Gateway</title>
    <style>
      body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 400px; width: 100%; }
      h2 { color: #34d399; } button { padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; margin: 0.25rem; }
      .pay { background: #059669; color: white; } .cancel { background: #dc2626; color: white; }
    </style></head>
    <body>
      <div class="card">
        <h2>🏦 Mock JazzCash</h2>
        <p>Transaction: <strong>${txn}</strong></p>
        <p>Amount: <strong>Rs ${amount}</strong></p>
        <hr style="border-color:#334155"/>
        <p>This is a simulated payment gateway.</p>
        <button class="pay" onclick="complete('success')">✓ Pay Now</button>
        <button class="cancel" onclick="complete('failed')">✗ Cancel</button>
      </div>
      <script>
        function complete(status) {
          fetch('/api/v1/payments/gateway/callback', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: '${txn}', status })
          }).then(r => r.json()).then(d => {
            alert(status === 'success' ? 'Payment Successful!' : 'Payment Cancelled');
            window.close();
          });
        }
      </script>
    </body></html>
  `);
};

module.exports = { initiate, gatewayCallback, uploadBankSlip, getMyPayments, getById, mockCheckout };
