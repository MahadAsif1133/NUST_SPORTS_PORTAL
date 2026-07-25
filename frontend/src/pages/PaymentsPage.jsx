import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Receipt, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const statusBadge = (s) => {
  const map = {
    PENDING: 'badge-pending',
    PENDING_VERIFICATION: 'badge-pending',
    VERIFIED: 'badge-verified',
    FAILED: 'badge-failed',
    REFUNDED: 'badge-info',
  };
  const icons = {
    PENDING: <Clock size={11} />,
    PENDING_VERIFICATION: <Clock size={11} />,
    VERIFIED: <CheckCircle size={11} />,
    FAILED: <XCircle size={11} />,
  };
  return (
    <span className={`badge ${map[s] || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {icons[s]}{s?.replace(/_/g, ' ')}
    </span>
  );
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  const load = () => {
    Promise.all([
      api.getMyPayments().catch(() => ({ payments: [] })),
      api.getMyMemberships().catch(() => ({ memberships: [] })),
    ]).then(([p, m]) => {
      setPayments(p.payments || []);
      setMemberships(m.memberships || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const pendingRegistrationMemberships = memberships.filter(m => m.status === 'PENDING_PAYMENT');

  const pendingMonthlyMemberships = memberships.map(m => {
    const pendingSubs = (m.subscriptions || []).filter(s => s.status === 'PENDING_PAYMENT' || s.status === 'OVERDUE');
    const monthlyTotal = pendingSubs.reduce((sum, s) => sum + parseInt(s.monthly_fee || 0), 0);
    return { ...m, pendingSubs, monthlyTotal };
  }).filter(m => m.monthlyTotal > 0);

  const handlePayNow = async (membership) => {
    setPaying(`REG-${membership.id}`);
    try {
      const data = await api.initiatePayment({ membershipId: membership.id, paymentType: 'REGISTRATION' });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      toast.error(err.message || 'Could not initiate payment');
    } finally {
      setPaying(null);
    }
  };

  const handlePayMonthly = async (membershipId) => {
    setPaying(`MON-${membershipId}`);
    try {
      const data = await api.initiatePayment({ membershipId, paymentType: 'MONTHLY' });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      toast.error(err.message || 'Could not initiate monthly payment');
    } finally {
      setPaying(null);
    }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-5" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="skeleton" style={{ height: 88, borderRadius: 'var(--radius-lg)' }} />
      </div>
      <div className="skeleton skeleton-card" style={{ height: 200 }} />
    </div>
  );

  const hasPendingItems = pendingRegistrationMemberships.length > 0 || pendingMonthlyMemberships.length > 0;

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Pending dues and full payment history</p>
      </div>

      {/* Pending Action Items */}
      {hasPendingItems && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <AlertCircle size={16} color="var(--status-amber)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Action Required — Pending Dues
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* 1. Pending Registration Payments */}
            {pendingRegistrationMemberships.map(m => {
              const isChild = Boolean(m.family_member_name);
              const personName = isChild ? `👶 ${m.family_member_name} (${m.family_member_relation})` : `👤 ${user?.fullName || 'Self'}`;

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.375rem', borderLeft: '3px solid var(--status-amber)' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {personName} — One-Time Registration Fee
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Category: {m.category_label || m.category_code?.replace(/_/g, ' ')} · Registration Card Fee
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        Rs {m.registration_fee?.toLocaleString() || '2,000'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>one-time fee</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePayNow(m)}
                      disabled={paying === `REG-${m.id}`}
                    >
                      {paying === `REG-${m.id}` ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Redirecting…
                        </span>
                      ) : <><CreditCard size={15} /> Pay Registration</>}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 2. Pending Monthly Facility Subscriptions */}
            {pendingMonthlyMemberships.map(m => {
              const isChild = Boolean(m.family_member_name);
              const personName = isChild ? `👶 ${m.family_member_name} (${m.family_member_relation})` : `👤 ${user?.fullName || 'Self'}`;
              const facList = m.pendingSubs.map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility).join(' + ');

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.375rem', borderLeft: '3px solid var(--status-amber)' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {personName} — Monthly Facility Dues
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Pending Subscriptions: {facList}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        Rs {m.monthlyTotal.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>monthly fee</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePayMonthly(m.id)}
                      disabled={paying === `MON-${m.id}`}
                    >
                      {paying === `MON-${m.id}` ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Redirecting…
                        </span>
                      ) : <><CreditCard size={15} /> Pay Monthly Dues</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="section-header">
        <h2 className="section-title">Payment History</h2>
      </div>
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Receipt size={26} color="var(--text-muted)" />
          </div>
          <h3>No payments yet</h3>
          <p>Apply for a membership above to get started. All transactions will appear here.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Facility</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={p.status === 'PENDING' ? { background: 'rgba(224,166,43,0.04)' } : {}}>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>{p.facility_name || 'Master Card'}</td>
                  <td>{p.payment_type?.replace(/_/g, ' ')}</td>
                  <td>{p.payment_method?.replace(/_/g, ' ')}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    Rs {p.amount?.toLocaleString()}
                  </td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    {p.status === 'PENDING' && p.payment_method === 'GATEWAY' && p.gateway_transaction_id && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { window.location.href = `/checkout?txn=${p.gateway_transaction_id}&amount=${p.amount}`; }}
                      >
                        Resume
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
