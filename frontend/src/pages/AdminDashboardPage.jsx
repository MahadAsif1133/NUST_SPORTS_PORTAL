import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { Users, CreditCard, Receipt, Snowflake, CheckCircle, XCircle, TrendingUp, FileText, UserCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [pendingSlips, setPendingSlips] = useState([]);
  const [pendingFreezes, setPendingFreezes] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingChildren, setPendingChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [activeMembers, setActiveMembers] = useState([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  // Rejection modal state
  const [rejectingChildId, setRejectingChildId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleFacilityClick = async (code) => {
    if (selectedFacility === code) { setSelectedFacility(null); setActiveMembers([]); return; }
    setSelectedFacility(code);
    setFetchingMembers(true);
    try {
      const res = await api.adminGetFacilityMembers(code);
      setActiveMembers(res.members || []);
    } catch (err) { toast.error(err.message); }
    finally { setFetchingMembers(false); }
  };

  const load = async () => {
    try {
      const [s, slips, freezes, users, children] = await Promise.all([
        api.adminGetStats(),
        api.adminGetPendingSlips().catch(() => ({ pendingSlips: [] })),
        api.adminGetPendingFreezes().catch(() => ({ pendingFreezeRequests: [] })),
        api.adminGetUsers({ isVerified: false, isActive: true }).catch(() => ({ data: [] })),
        api.adminGetPendingFamilyMembers().catch(() => ({ pendingFamilyMembers: [] })),
      ]);
      setStats(s.stats);
      setPendingSlips(slips.pendingSlips || []);
      setPendingFreezes(freezes.pendingFreezeRequests || []);
      setPendingUsers(users.data || []);
      setPendingChildren(children.pendingFamilyMembers || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const verifySlip = async (id, approved) => {
    try {
      await api.adminVerifySlip(id, { approved, reason: approved ? 'Approved' : 'Rejected by admin' });
      toast.success(approved ? 'Payment slip verified and approved.' : 'Payment slip rejected.');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const decideFreeze = async (id, approved) => {
    try {
      await api.adminDecideFreeze(id, { approved });
      toast.success(approved ? 'Freeze request approved.' : 'Freeze request rejected.');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const verifyUser = async (id, approved) => {
    try {
      await api.adminVerifyUser(id, { approved });
      toast.success(approved ? 'User account approved and activated.' : 'User account rejected.');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const decideChild = async (id, approved, reason = '') => {
    try {
      await api.adminDecideFamilyMember(id, { approved, reason });
      toast.success(approved ? 'Child family member approved & member card issued.' : 'Child family member request rejected.');
      setRejectingChildId(null);
      setRejectReason('');
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-5" />
      </div>
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-stat" />)}
      </div>
      <div className="skeleton skeleton-card" style={{ height: 200 }} />
    </div>
  );

  const adminStats = [
    { label: 'Total Revenue', value: `Rs ${(stats?.totalRevenue || 0).toLocaleString()}`, iconBg: 'rgba(47,158,68,0.12)', icon: <TrendingUp size={20} color="var(--status-active)" />, valueColor: 'var(--status-active)' },
    { label: 'Pending Child Approvals', value: pendingChildren.length || stats?.pendingFamilyMembers || 0, iconBg: 'var(--brass-dim)', icon: <UserCheck size={20} color="var(--brass)" />, valueColor: 'var(--brass)', urgent: (pendingChildren.length || 0) > 0 },
    { label: 'Pending Bank Slips', value: stats?.pendingBankSlips || 0, iconBg: 'var(--status-amber-dim)', icon: <Receipt size={20} color="var(--status-amber)" />, valueColor: 'var(--status-amber)' },
    { label: 'Pending Verifications', value: stats?.pendingUserVerifications || 0, iconBg: 'var(--status-info-dim)', icon: <Users size={20} color="var(--status-info)" />, valueColor: 'var(--status-info)' },
  ];

  const SectionHeader = ({ children, count }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</h2>
      {count > 0 && <span className="badge badge-pending">{count} pending</span>}
    </div>
  );

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview and pending administrative actions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {adminStats.map(s => (
          <div key={s.label} className={`stat-card ${s.urgent ? '' : ''}`} style={s.urgent ? { borderTop: '2px solid var(--brass)' } : {}}>
            <div className="stat-card-icon" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="stat-card-value" style={{ color: s.valueColor, fontFamily: typeof s.value === 'string' ? 'var(--font-mono)' : 'var(--font-heading)', fontSize: typeof s.value === 'string' ? '1.25rem' : '2rem' }}>
              {s.value}
            </div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Child Memberships Queue */}
      {pendingChildren.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <SectionHeader count={pendingChildren.length}>Pending Child Memberships</SectionHeader>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Child Name</th>
                  <th>Relation / Age</th>
                  <th>Faculty Parent</th>
                  <th>Documents</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingChildren.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.full_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>👤</div>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.full_name}</span>
                      </div>
                    </td>
                    <td>{c.relation} · {c.age ? `${c.age} yrs` : 'N/A'}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.parent_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.parent_email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {c.photo_url ? (
                          <a href={c.photo_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                            🖼 Photo
                          </a>
                        ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Photo</span>}
                        {c.medical_clearance_path ? (
                          <a href={c.medical_clearance_path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                            📄 Medical Doc
                          </a>
                        ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Doc</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      {rejectingChildId === c.id ? (
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="input"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 140 }}
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => decideChild(c.id, false, rejectReason)}>Confirm</button>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => setRejectingChildId(null)}>X</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => decideChild(c.id, true)}>
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectingChildId(c.id)}>
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Facility Overview */}
      {stats?.facilityStats?.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.875rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Facility Overview</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Click a facility card to view its active member list</p>
          </div>
          <div className="grid grid-3">
            {stats.facilityStats.map(f => {
              const isSelected = selectedFacility === f.code;
              return (
                <div
                  key={f.code}
                  className="stat-card"
                  style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderTop: isSelected ? '2px solid var(--brass)' : '2px solid transparent',
                    background: isSelected ? 'var(--brass-dim)' : 'var(--bg-card)',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => handleFacilityClick(f.code)}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.625rem' }}>
                    {f.code === 'POOL' ? '🏊' : f.code === 'GYM' ? '🏋️' : '🐎'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.875rem', color: 'var(--text-primary)' }}>{f.active_members}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{f.name} — Active Members</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Facility Members Drilldown */}
      {selectedFacility && (
        <div className="card fade-in" style={{ marginBottom: '2rem', borderTop: '2px solid var(--brass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Members: {selectedFacility === 'POOL' ? 'Swimming Pool' : selectedFacility === 'GYM' ? 'Gymnasium' : 'Saddle Club'}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedFacility(null); setActiveMembers([]); }}>Close</button>
          </div>
          {fetchingMembers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon"><Users size={24} color="var(--text-muted)" /></div>
              <h3>No active members</h3>
              <p>No members are currently subscribed to this facility.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Reg. No.</th><th>Role</th><th>Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMembers.map(m => (
                    <tr key={m.subscription_id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}</td>
                      <td>{m.email}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{m.registration_number || '—'}</td>
                      <td><span className="badge badge-info">{m.role}</span></td>
                      <td>{new Date(m.subscribed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Bank Slips */}
      {pendingSlips.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <SectionHeader count={pendingSlips.length}>Pending Bank Slips</SectionHeader>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Member</th><th>Facility</th><th>Amount</th><th>Type</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingSlips.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.user_name}</td>
                    <td>{s.facility_name || 'Master Card'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rs {s.amount?.toLocaleString()}</td>
                    <td>{s.payment_type?.replace(/_/g, ' ')}</td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => verifySlip(s.id, true)}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => verifySlip(s.id, false)}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Freeze Requests */}
      {pendingFreezes.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <SectionHeader count={pendingFreezes.length}>Pending Freeze Requests</SectionHeader>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Member</th><th>Facility</th><th>Duration</th><th>Period</th><th>Reason</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingFreezes.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.user_name}</td>
                    <td>{f.facility_name || 'Master Card'}</td>
                    <td>{f.duration_months} month{f.duration_months > 1 ? 's' : ''}</td>
                    <td style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                      {new Date(f.freeze_start).toLocaleDateString()} → {new Date(f.freeze_end).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.8125rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.reason || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => decideFreeze(f.id, true)}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => decideFreeze(f.id, false)}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending User Verifications */}
      {pendingUsers.length > 0 && (
        <div>
          <SectionHeader count={pendingUsers.length}>Pending User Verifications</SectionHeader>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-info">{u.role}</span></td>
                    <td>{u.department || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => verifyUser(u.id, true)}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => verifyUser(u.id, false)}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All-clear state */}
      {pendingChildren.length === 0 && pendingSlips.length === 0 && pendingFreezes.length === 0 && pendingUsers.length === 0 && (
        <div className="empty-state" style={{ marginTop: '1.5rem' }}>
          <div className="empty-state-icon">
            <CheckCircle size={28} color="var(--status-active)" />
          </div>
          <h3>All clear!</h3>
          <p>No pending child requests, bank slips, freeze requests, or user verifications at this time.</p>
        </div>
      )}
    </div>
  );
}
