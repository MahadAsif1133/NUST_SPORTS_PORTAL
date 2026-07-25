import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * MockCheckout — simulates a JazzCash payment page.
 * In production this entire page is replaced by the real gateway's hosted checkout.
 */
export default function MockCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const txn = params.get('txn');
  const amount = params.get('amount');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const pay = async (success) => {
    setProcessing(true);
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 2000));

    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api/v1'
      : `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;

    try {
      const res = await fetch(`${apiBase}/payments/gateway/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txn,
          status: success ? 'success' : 'failed',
        }),
      });
      const data = await res.json();
      if (data.status === 'VERIFIED') {
        setDone(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setProcessing(false);
    }
  };

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '1rem' }}>
      <div className="card slide-up" style={{ maxWidth: 420, width: '100%', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '1.25rem' }}>🏅</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-active)', marginBottom: '0.625rem' }}>
          Payment Successful!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Your payment of <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Rs {parseInt(amount).toLocaleString()}</strong> has been verified. Your NUST sports membership is now active.
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => { navigate('/card'); }}>
          Go to My Card →
        </button>
      </div>
    </div>
  );

  if (failed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '1rem' }}>
      <div className="card slide-up" style={{ maxWidth: 420, width: '100%', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '1.25rem' }}>❌</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-danger)', marginBottom: '0.625rem' }}>
          Transaction Failed
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Your payment transaction could not be processed. Please return to the portal and try again.
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/payments')}>Back to Payments</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '1rem' }}>
      <div className="card slide-up" style={{ maxWidth: 460, width: '100%', padding: '0', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Gateway Header */}
        <div style={{ background: 'var(--gradient-navy)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2.5px solid var(--brass)' }}>
          <div style={{ fontSize: '1.5rem' }}>💳</div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>NUST Sports Portal Payment Gateway</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Institutional Gateway Simulation (Test Environment)</div>
          </div>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {/* Order Summary */}
          <div style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Order Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sports Membership Registration / Subscription Dues</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Rs {parseInt(amount).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>Transaction ID: {txn}</div>
          </div>

          {/* Card Info Details */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Dummy Card Number</label>
              <input className="form-input" defaultValue="4111 1111 1111 1111" readOnly style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Expiry</label>
                <input className="form-input" defaultValue="12/28" readOnly style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label className="form-label">CVV</label>
                <input className="form-input" defaultValue="***" readOnly style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn btn-brass btn-lg"
              style={{ width: '100%' }}
              onClick={() => pay(true)}
              disabled={processing}
            >
              {processing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Simulating Transaction…
                </span>
              ) : `Approve & Pay Rs ${parseInt(amount).toLocaleString()}`}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', color: 'var(--status-danger)' }}
              onClick={() => pay(false)}
              disabled={processing}
            >
              Simulate Transaction Failure
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1.25rem', lineHeight: 1.4 }}>
            🔒 Secured with institutional standard SSL encryption • Sandbox environment only
          </p>
        </div>
      </div>
    </div>
  );
}
