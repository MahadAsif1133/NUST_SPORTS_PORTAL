import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { CreditCard, X, User } from 'lucide-react';

const statusBadge = (s) => {
  const map = { ACTIVE: 'badge-active', PENDING_PAYMENT: 'badge-pending', OVERDUE: 'badge-overdue', FROZEN: 'badge-frozen', CANCELLED: 'badge-cancelled' };
  return <span className={`badge ${map[s] || ''}`}>{s?.replace(/_/g, ' ')}</span>;
};

export default function MembershipsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.getMyMemberships().then(d => { setMemberships(d.memberships || []); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const cancel = async (m) => {
    const personName = m.family_member_name ? `${m.family_member_name} (${m.family_member_relation})` : (user?.fullName ? `${user.fullName} (Self)` : 'Self');
    if (!confirm(`Are you sure you want to cancel the membership for ${personName}? This action cannot be undone.`)) return;
    try { 
      await api.cancelMembership(m.id, `Self-cancelled for ${personName}`); 
      toast.success(`Membership for ${personName} cancelled successfully.`); 
      load(); 
    } catch (err) { 
      toast.error(err.message); 
    }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-5" />
      </div>
      <div className="grid grid-2">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">My Memberships</h1>
        <p className="page-subtitle">Manage and track sports facility memberships for yourself and your family</p>
      </div>

      {memberships.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CreditCard size={28} color="var(--text-muted)" />
          </div>
          <h3>No memberships registered</h3>
          <p>Register your sports card to access the gymnasium, swimming pool, or saddle club.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {memberships.map(m => {
            const isChild = Boolean(m.family_member_name);
            const personName = isChild ? `👶 ${m.family_member_name} (${m.family_member_relation})` : `👤 ${user?.fullName || 'Self'}`;
            const activeSubs = (m.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility);

            return (
              <div key={m.id} className="card" style={{ borderTop: isChild ? '3px solid var(--brass)' : '3px solid var(--navy)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                      {personName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', fontFamily: 'var(--font-mono)' }}>
                      Category: {m.category_label || m.category_code?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  {statusBadge(m.status)}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0.75rem 0', borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', marginBottom: '1rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Registration:</span> <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Rs {m.registration_fee?.toLocaleString() || '2,000'}</strong></div>
                  {m.start_date && <div><span style={{ color: 'var(--text-muted)' }}>Started:</span> <strong style={{ color: 'var(--text-primary)' }}>{new Date(m.start_date).toLocaleDateString()}</strong></div>}
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Active Subscriptions:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {activeSubs.length > 0 ? activeSubs.join(' · ') : 'No active facility subscriptions'}
                  </strong>
                </div>

                {!['CANCELLED'].includes(m.status) && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {m.status === 'PENDING_PAYMENT' && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => window.location.href = '/payments'}
                        style={{ marginRight: 'auto' }}
                      >
                        Pay Card Fee
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => cancel(m)}>
                      <X size={14} /> Cancel Membership
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
