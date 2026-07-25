import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import { CreditCard, Receipt, QrCode, Snowflake, Dumbbell, ChevronRight, AlertCircle, Plus, Users, CheckCircle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    ACTIVE: 'badge-active', PENDING_PAYMENT: 'badge-pending', OVERDUE: 'badge-overdue',
    FROZEN: 'badge-frozen', CANCELLED: 'badge-cancelled', PENDING_APPROVAL: 'badge-pending', REJECTED: 'badge-failed',
  };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status?.replace(/_/g, ' ')}</span>;
};

function SkeletonDashboard() {
  return (
    <div className="page container fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-5" />
      </div>
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-stat" />)}
      </div>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
      </div>
      <div className="skeleton skeleton-card" style={{ height: 200 }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Child form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childRelation, setChildRelation] = useState('Son');
  const [childAge, setChildAge] = useState('');
  const [childPhoto, setChildPhoto] = useState(null);
  const [childDoc, setChildDoc] = useState(null);
  const [submittingChild, setSubmittingChild] = useState(false);

  // Resubmit Child state
  const [resubmitChildId, setResubmitChildId] = useState(null);
  const [reName, setReName] = useState('');
  const [reRelation, setReRelation] = useState('Son');
  const [reAge, setReAge] = useState('');
  const [rePhoto, setRePhoto] = useState(null);
  const [reDoc, setReDoc] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  // Paying child registration fee state
  const [payingChildId, setPayingChildId] = useState(null);

  const loadData = async () => {
    try {
      const [m, p, f] = await Promise.all([
        api.getMyMemberships().catch(() => ({ memberships: [] })),
        api.getMyPayments().catch(() => ({ payments: [] })),
        user?.role === 'FACULTY' ? api.getMyFamilyMembers().catch(() => ({ familyMembers: [] })) : Promise.resolve({ familyMembers: [] }),
      ]);
      setMemberships(m.memberships || []);
      setPayments(p.payments || []);
      setChildren(f.familyMembers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    if (!childName.trim()) { toast.error('Child name is required'); return; }
    setSubmittingChild(true);

    try {
      const formData = new FormData();
      formData.append('fullName', childName.trim());
      formData.append('relation', childRelation);
      if (childAge) formData.append('age', childAge);
      if (childPhoto) formData.append('photo', childPhoto);
      if (childDoc) formData.append('medicalClearance', childDoc);

      await api.addFamilyMember(formData);
      toast.success('Child registered! Pending Sports Branch Admin approval.');
      setChildName('');
      setChildAge('');
      setChildPhoto(null);
      setChildDoc(null);
      setShowAddChild(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to add child');
    } finally {
      setSubmittingChild(false);
    }
  };

  const handleOpenResubmit = (child) => {
    setResubmitChildId(child.id);
    setReName(child.full_name || '');
    setReRelation(child.relation || 'Son');
    setReAge(child.age ? String(child.age) : '');
    setRePhoto(null);
    setReDoc(null);
  };

  const handleResubmitSubmit = async (e, childId) => {
    e.preventDefault();
    setResubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullName', reName.trim());
      formData.append('relation', reRelation);
      if (reAge) formData.append('age', reAge);
      if (rePhoto) formData.append('photo', rePhoto);
      if (reDoc) formData.append('medicalClearance', reDoc);

      await api.resubmitFamilyMember(childId, formData);
      toast.success('Resubmitted info & documents! Pending Admin approval.');
      setResubmitChildId(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to resubmit info');
    } finally {
      setResubmitting(false);
    }
  };

  const handlePayChildRegistration = async (child) => {
    if (!child.child_membership_id) {
      toast.error('Child membership record missing');
      return;
    }
    setPayingChildId(child.id);
    try {
      const res = await api.initiatePayment({
        membershipId: child.child_membership_id,
        paymentType: 'REGISTRATION',
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.success('Registration payment initiated.');
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate child registration payment');
    } finally {
      setPayingChildId(null);
    }
  };

  const handlePayMonthlyDues = async (membershipId) => {
    setPayingChildId(`MON-${membershipId}`);
    try {
      const res = await api.initiatePayment({
        membershipId,
        paymentType: 'MONTHLY',
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.success('Monthly dues payment initiated.');
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate monthly payment');
    } finally {
      setPayingChildId(null);
    }
  };

  if (loading) return <SkeletonDashboard />;

  const active  = memberships.filter(m => m.status === 'ACTIVE');
  const pending = memberships.filter(m => m.status === 'PENDING_PAYMENT');
  const overdue = memberships.filter(m => m.status === 'OVERDUE');
  const frozen  = memberships.filter(m => m.status === 'FROZEN');
  const recentPayments = payments.slice(0, 5);
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  const selfMembership = memberships.find(m => !m.family_member_id);
  const selfPendingSubs = (selfMembership?.subscriptions || []).filter(s => s.status === 'PENDING_PAYMENT' || s.status === 'OVERDUE');
  const selfPendingTotal = selfPendingSubs.reduce((sum, s) => sum + parseInt(s.monthly_fee || 0), 0);

  const stats = [
    { label: 'Active Memberships', value: active.length, color: 'var(--status-active)', iconBg: 'var(--status-active-dim)', icon: <CreditCard size={20} color="var(--status-active)" /> },
    { label: 'Pending Payments',   value: pending.length, color: 'var(--status-amber)',  iconBg: 'var(--status-amber-dim)',  icon: <Receipt size={20} color="var(--status-amber)" /> },
    { label: 'Overdue',            value: overdue.length, color: 'var(--status-danger)', iconBg: 'var(--status-danger-dim)', icon: <AlertCircle size={20} color="var(--status-danger)" /> },
    { label: 'Frozen',             value: frozen.length,  color: 'var(--status-gray)',   iconBg: 'var(--status-gray-dim)',   icon: <Snowflake size={20} color="var(--status-gray)" /> },
  ];

  const quickActions = [
    {
      to: '/facilities', icon: <Dumbbell size={22} color="white" />,
      iconBg: 'var(--navy)', title: 'Apply for Membership', sub: 'Browse facilities & rates'
    },
    {
      to: '/card', icon: <QrCode size={22} color="white" />,
      iconBg: 'var(--slate)', title: 'View My Card & QR', sub: 'Show at facility gate'
    },
    {
      to: '/freeze', icon: <Snowflake size={22} color="white" />,
      iconBg: 'var(--status-gray)', title: 'Freeze Membership', sub: 'Pause for up to 3 months'
    },
  ];

  return (
    <div className="page container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Welcome back, {firstName}</h1>
        <p className="page-subtitle">Here's your sports membership overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.iconBg }}>
              {s.icon}
            </div>
            <div className="stat-card-value" style={{ color: s.value > 0 ? s.color : 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {quickActions.map(a => (
          <Link
            key={a.to}
            to={a.to}
            style={{ textDecoration: 'none' }}
          >
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all var(--transition-fast)', borderLeft: '3px solid var(--navy)' }}>
              <div style={{ width: 44, height: 44, background: a.iconBg, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{a.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{a.sub}</div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </div>

      {/* PER-PERSON MEMBERSHIPS BREAKDOWN SECTION */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">Memberships & Subscriptions (Per-Person Breakdown)</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Independent cards, registration status, and facility subscriptions for yourself and each registered child.
            </p>
          </div>
          {user?.role === 'FACULTY' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddChild(!showAddChild)}>
              <Plus size={15} /> {showAddChild ? 'Cancel' : 'Add Family Member'}
            </button>
          )}
        </div>

        {/* Add Child Form (Faculty Only) */}
        {user?.role === 'FACULTY' && showAddChild && (
          <form onSubmit={handleAddChildSubmit} className="card fade-in" style={{ marginBottom: '1.5rem', borderTop: '3px solid var(--brass)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Register Child Dependent
            </h3>
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Child Full Name *</label>
                <input
                  type="text"
                  className="input"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Ali Ahmed"
                  required
                />
              </div>
              <div>
                <label className="form-label">Relation *</label>
                <select className="input" value={childRelation} onChange={(e) => setChildRelation(e.target.value)}>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Child">Child</option>
                </select>
              </div>
              <div>
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="input"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="e.g. 12"
                  min="1"
                  max="25"
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label">Child Photo (JPEG / PNG)</label>
                <input
                  type="file"
                  className="input"
                  accept="image/*"
                  onChange={(e) => setChildPhoto(e.target.files[0] || null)}
                />
              </div>
              <div>
                <label className="form-label">Medical Clearance Document (PDF / Image)</label>
                <input
                  type="file"
                  className="input"
                  accept="image/*,application/pdf"
                  onChange={(e) => setChildDoc(e.target.files[0] || null)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddChild(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submittingChild}>
                {submittingChild ? 'Submitting...' : 'Submit for Admin Approval'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-2">
          {/* 1. FACULTY MEMBER (SELF) CARD */}
          {selfMembership && (
            <div className="card fade-in" style={{ borderTop: '3px solid var(--navy)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.125rem' }}>
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                      {user?.fullName} (Self)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Role: {user?.role}
                    </div>
                  </div>
                </div>
                {statusBadge(selfMembership.status)}
              </div>

              {/* Self Active & Pending Facilities */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Active Subscriptions:
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  {selfMembership.subscriptions && selfMembership.subscriptions.filter(s => s.status === 'ACTIVE').length > 0
                    ? selfMembership.subscriptions.filter(s => s.status === 'ACTIVE').map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility).join(' · ')
                    : 'No active facility subscriptions'}
                </div>

                {selfPendingTotal > 0 && (
                  <div style={{ marginBottom: '1rem', background: 'rgba(224,166,43,0.08)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(224,166,43,0.3)' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#B07D0C', fontWeight: 700, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <AlertCircle size={15} />
                      Pending Dues: {selfPendingSubs.map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility).join(' + ')} (Rs {selfPendingTotal.toLocaleString()})
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: '0.25rem' }}
                      onClick={() => handlePayMonthlyDues(selfMembership.id)}
                      disabled={payingChildId === `MON-${selfMembership.id}`}
                    >
                      {payingChildId === `MON-${selfMembership.id}` ? 'Initiating payment...' : <><Receipt size={14} /> Pay Monthly Dues (Rs {selfPendingTotal.toLocaleString()}) →</>}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/facilities?membershipId=${selfMembership.id}`)}
                  >
                    <Dumbbell size={14} /> Manage Facilities →
                  </button>
                  <Link to="/card" className="btn btn-ghost btn-sm">
                    <QrCode size={14} /> View E-Card
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 2. REGISTERED CHILDREN CARDS */}
          {user?.role === 'FACULTY' && children.map(child => {
            const isResubmitting = resubmitChildId === child.id;
            const isApprovedActive = child.status === 'ACTIVE';
            const isPendingPayment = child.status === 'PENDING_PAYMENT';
            const isPendingApproval = child.status === 'PENDING_APPROVAL';
            const isRejected = child.status === 'REJECTED';

            const childPendingSubs = (child.subscriptions || []).filter(s => s.status === 'PENDING_PAYMENT' || s.status === 'OVERDUE');
            const childPendingTotal = childPendingSubs.reduce((sum, s) => sum + parseInt(s.monthly_fee || 0), 0);

            return (
              <div key={child.id} className="card fade-in" style={{ borderTop: isApprovedActive ? '3px solid var(--status-active)' : isRejected ? '3px solid var(--status-danger)' : '3px solid var(--status-amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--slate)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      {child.photo_url ? (
                        <img src={child.photo_url} alt={child.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                        {child.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {child.relation} · {child.age ? `${child.age} yrs` : 'Age not specified'}
                      </div>
                    </div>
                  </div>
                  {statusBadge(child.status)}
                </div>

                {/* State A: PENDING_APPROVAL */}
                {isPendingApproval && (
                  <div className="status-banner status-banner-amber" style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <div>Submitted & awaiting Sports Branch Admin approval.</div>
                  </div>
                )}

                {/* State B: PENDING_PAYMENT (Admin approved, needs registration fee payment) */}
                {isPendingPayment && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="status-banner status-banner-amber" style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                      <CheckCircle size={16} color="var(--status-active)" />
                      <div>
                        <strong>Approved by Admin!</strong> Please pay the one-time registration membership fee (<strong>Rs 2,000</strong>) to activate this child's card.
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => handlePayChildRegistration(child)}
                      disabled={payingChildId === child.id}
                    >
                      {payingChildId === child.id ? 'Initiating payment...' : <><Receipt size={14} /> Pay Child Registration Fee (Rs 2,000) →</>}
                    </button>
                  </div>
                )}

                {/* State C: REJECTED */}
                {isRejected && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="status-banner status-banner-danger" style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                      <XCircle size={16} />
                      <div>
                        <strong>Admin Rejection Reason:</strong> {child.rejection_reason || 'Document or information incomplete.'}
                      </div>
                    </div>

                    {!isResubmitting ? (
                      <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => handleOpenResubmit(child)}>
                        <RefreshCw size={14} /> Resubmit Corrected Info & Docs
                      </button>
                    ) : (
                      <form onSubmit={(e) => handleResubmitSubmit(e, child.id)} style={{ background: 'var(--bg-page)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                          Resubmit Information for {child.full_name}
                        </div>
                        <div className="grid grid-2" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <label className="form-label">Full Name</label>
                            <input type="text" className="input" value={reName} onChange={(e) => setReName(e.target.value)} required />
                          </div>
                          <div>
                            <label className="form-label">Relation</label>
                            <select className="input" value={reRelation} onChange={(e) => setReRelation(e.target.value)}>
                              <option value="Son">Son</option>
                              <option value="Daughter">Daughter</option>
                              <option value="Child">Child</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-2" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <label className="form-label">Update Photo</label>
                            <input type="file" className="input" accept="image/*" onChange={(e) => setRePhoto(e.target.files[0] || null)} />
                          </div>
                          <div>
                            <label className="form-label">Update Medical Doc</label>
                            <input type="file" className="input" accept="image/*,application/pdf" onChange={(e) => setReDoc(e.target.files[0] || null)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResubmitChildId(null)}>Cancel</button>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={resubmitting}>
                            {resubmitting ? 'Submitting...' : 'Submit Resubmission'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* State D: ACTIVE (Approved + Registration Fee Paid) */}
                {isApprovedActive && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                      Active Subscriptions:
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      {child.subscriptions && child.subscriptions.filter(s => s.status === 'ACTIVE').length > 0
                        ? child.subscriptions.filter(s => s.status === 'ACTIVE').map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility).join(' · ')
                        : 'No active facility subscriptions'}
                    </div>

                    {childPendingTotal > 0 && (
                      <div style={{ marginBottom: '1rem', background: 'rgba(224,166,43,0.08)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(224,166,43,0.3)' }}>
                        <div style={{ fontSize: '0.8125rem', color: '#B07D0C', fontWeight: 700, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <AlertCircle size={15} />
                          Pending Dues: {childPendingSubs.map(s => s.facility === 'SADDLE' ? 'Saddle Club' : s.facility).join(' + ')} (Rs {childPendingTotal.toLocaleString()})
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', marginTop: '0.25rem' }}
                          onClick={() => handlePayMonthlyDues(child.child_membership_id)}
                          disabled={payingChildId === `MON-${child.child_membership_id}`}
                        >
                          {payingChildId === `MON-${child.child_membership_id}` ? 'Initiating payment...' : <><Receipt size={14} /> Pay Child Monthly Dues (Rs {childPendingTotal.toLocaleString()}) →</>}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/facilities?membershipId=${child.child_membership_id}`)}
                      >
                        <Dumbbell size={14} /> Manage Facilities →
                      </button>
                      <Link to="/card" className="btn btn-ghost btn-sm">
                        <QrCode size={14} /> View Child E-Card
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">Recent Payments</h2>
            <Link to="/payments" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>{p.payment_type?.replace(/_/g, ' ')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      Rs {p.amount?.toLocaleString()}
                    </td>
                    <td>{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {memberships.length === 0 && user?.role !== 'FACULTY' && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Dumbbell size={28} color="var(--text-muted)" />
          </div>
          <h3>No memberships yet</h3>
          <p>Start by browsing our sports facilities and registering for a membership card.</p>
          <Link to="/facilities" className="btn btn-primary">
            <Dumbbell size={16} /> Browse Facilities
          </Link>
        </div>
      )}
    </div>
  );
}
