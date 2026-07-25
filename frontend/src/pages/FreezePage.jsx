import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Snowflake, Calendar, Clock, User } from 'lucide-react';

const statusBadge = (s) => {
  const map = { PENDING: 'badge-pending', APPROVED: 'badge-active', REJECTED: 'badge-failed', VIOLATED: 'badge-overdue' };
  return <span className={`badge ${map[s] || ''}`}>{s}</span>;
};

export default function FreezePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [freezes, setFreezes] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ membershipId: '', freezeStart: '', durationMonths: 1, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getMyFreezeRequests().catch(() => ({ freezeRequests: [] })),
      api.getMyMemberships().catch(() => ({ memberships: [] })),
    ]).then(([f, m]) => {
      const active = (m.memberships || []).filter(x => x.status === 'ACTIVE');
      setMemberships(active);
      setFreezes(f.freezeRequests || []);
      if (active.length > 0) {
        setForm(prev => ({ ...prev, membershipId: active[0].id }));
      }
      setLoading(false);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.membershipId) {
      toast.error('Please select a membership card to freeze.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (form.freezeStart && form.freezeStart < todayStr) {
      toast.error('Freeze start date must be from today onwards.');
      return;
    }
    setSubmitting(true);
    try {
      await api.requestFreeze(form);
      toast.success('Freeze request submitted — awaiting admin approval.');
      const data = await api.getMyFreezeRequests();
      setFreezes(data.freezeRequests || []);
      setForm(prev => ({ membershipId: prev.membershipId, freezeStart: '', durationMonths: 1, reason: '' }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-7" />
      </div>
      <div className="grid grid-2">
        <div className="skeleton skeleton-card" style={{ height: 320 }} />
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      </div>
    </div>
  );

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">Freeze Membership</h1>
        <p className="page-subtitle">Temporarily pause your membership — 1 to 3 months, maximum 2 per calendar year</p>
      </div>

      <div className="grid grid-2">
        {/* Request Form */}
        <div className="card" style={{ borderTop: '3px solid var(--navy)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
            <Snowflake size={18} color="var(--status-gray)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Request Freeze
            </h2>
          </div>

          {memberships.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">
                <Snowflake size={24} color="var(--text-muted)" />
              </div>
              <h3>No active memberships</h3>
              <p>You need an active membership to submit a freeze request.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {/* Membership Card Selector */}
              <div className="form-group">
                <label className="form-label">Select Membership Card to Freeze</label>
                <select
                  className="form-input form-select"
                  value={form.membershipId}
                  onChange={e => setForm({ ...form, membershipId: e.target.value })}
                  required
                >
                  {memberships.map(m => {
                    const isChild = Boolean(m.family_member_name);
                    const ownerLabel = isChild
                      ? `👶 ${m.family_member_name} (${m.family_member_relation})`
                      : `👤 ${user?.fullName || 'Self'}`;
                    const categoryText = m.is_master_card ? 'Sports Master Card' : (m.category_label || m.category_code?.replace(/_/g, ' '));
                    return (
                      <option key={m.id} value={m.id}>
                        {ownerLabel} — {categoryText}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                  Freeze Start Date (Today Onwards)
                </label>
                <input
                  className="form-input"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.freezeStart}
                  onChange={e => setForm({ ...form, freezeStart: e.target.value })}
                  style={{ colorScheme: 'dark light' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  className="form-input form-select"
                  value={form.durationMonths}
                  onChange={e => setForm({ ...form, durationMonths: parseInt(e.target.value) })}
                >
                  <option value={1}>1 month</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-input form-textarea"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g., Travelling for work, medical leave…"
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Submitting…' : <><Snowflake size={16} /> Submit Freeze Request</>}
              </button>
            </form>
          )}
        </div>

        {/* Freeze History */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Your Freeze Requests
          </h2>
          {freezes.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">
                <Clock size={24} color="var(--text-muted)" />
              </div>
              <h3>No requests yet</h3>
              <p>Any freeze requests you submit will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {freezes.map(f => {
                const ownerName = f.family_member_name
                  ? `👶 ${f.family_member_name} (${f.family_member_relation})`
                  : `👤 ${user?.fullName || 'Self'}`;
                return (
                  <div key={f.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {ownerName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {f.facility_name || 'NUST Sports Master Card'}
                        </div>
                      </div>
                      {statusBadge(f.status)}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                      <Calendar size={12} />
                      {new Date(f.freeze_start).toLocaleDateString()} → {new Date(f.freeze_end).toLocaleDateString()}
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>({f.duration_months} month{f.duration_months > 1 ? 's' : ''})</span>
                    </div>
                    {f.reason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem', borderTop: '1px solid var(--border)', paddingTop: '0.375rem' }}>
                        {f.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
