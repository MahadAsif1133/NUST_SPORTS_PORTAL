import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronDown, ChevronUp, ShieldCheck, CheckCircle, AlertCircle, Sparkles, User, Users } from 'lucide-react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FACILITY_DISPLAY = {
  GYM:      { icon: '🏋️', label: 'Gymnasium Access',    price: 'Rs 1,000 / month' },
  SWIMMING: { icon: '🏊', label: 'Swimming Pool Access', price: 'Rs 1,000 / month' },
  SADDLE:   { icon: '🐎', label: 'Saddle Club Access',   price: 'Rs 1,000 / month (separate)' },
};

export default function FacilitiesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const [facilities, setFacilities] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [children, setChildren] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [rates, setRates] = useState({});
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Persons list for "Who is this for?" selector
  const [eligiblePersons, setEligiblePersons] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const [selectedSubs, setSelectedSubs] = useState([]);
  const [priceSummary, setPriceSummary] = useState({ totalFee: 0, breakdown: [] });
  const [updatingSubs, setUpdatingSubs] = useState(false);
  const [priceHighlight, setPriceHighlight] = useState(false);
  const prevComboRef = useRef(false);

  // Parse URL query parameter membershipId
  const queryParams = new URLSearchParams(location.search);
  const urlMembershipId = queryParams.get('membershipId');

  const loadData = () => {
    const POOL_ID = 'a1000000-0000-0000-0000-000000000001';
    const GYM_ID  = 'a1000000-0000-0000-0000-000000000002';
    Promise.all([
      api.getFacilities(),
      api.getFacilityRates(POOL_ID).catch(() => ({ rates: [] })),
      api.getFacilityRates(GYM_ID).catch(() => ({ rates: [] })),
      api.getMyMemberships().catch(() => ({ memberships: [] })),
      user?.role === 'FACULTY' ? api.getMyFamilyMembers().catch(() => ({ familyMembers: [] })) : Promise.resolve({ familyMembers: [] }),
    ]).then(([fd, poolRates, gymRates, md, famData]) => {
      setFacilities(fd.facilities || []);
      const userMemberships = md.memberships || [];
      const famList = famData.familyMembers || [];
      setMemberships(userMemberships);
      setChildren(famList);

      setRates(prev => ({
        ...prev,
        [POOL_ID]: poolRates.rates || [],
        [GYM_ID]:  gymRates.rates  || [],
      }));

      // Build list of eligible persons with active memberships
      const persons = [];

      // 1. Faculty Self or normal user
      const selfActiveCard = userMemberships.find(m => m.status === 'ACTIVE' && !m.family_member_id);
      if (selfActiveCard) {
        persons.push({
          id: selfActiveCard.id,
          name: `${user?.fullName || 'Self'} (Self)`,
          role: user?.role,
          subscriptions: selfActiveCard.subscriptions || [],
          isChild: false,
        });
      }

      // 2. Active children (status === 'ACTIVE')
      famList.forEach(child => {
        if (child.status === 'ACTIVE' && child.child_membership_id) {
          persons.push({
            id: child.child_membership_id,
            familyMemberId: child.id,
            name: `${child.full_name} (${child.relation})`,
            role: 'Dependent Child',
            subscriptions: child.subscriptions || [],
            isChild: true,
          });
        }
      });

      setEligiblePersons(persons);

      // Select person: from URL parameter or default to first eligible person
      let targetPerson = persons.find(p => p.id === urlMembershipId) || persons[0];
      if (targetPerson) {
        setSelectedPersonId(targetPerson.id);
        const subs = (targetPerson.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility);
        setSelectedSubs(subs);
        api.calculateSubscriptionFee(subs).then(setPriceSummary).catch(() => {});
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user, location.search]);

  const handleSelectPerson = (person) => {
    setSelectedPersonId(person.id);
    const subs = (person.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility);
    setSelectedSubs(subs);
    api.calculateSubscriptionFee(subs).then(setPriceSummary).catch(() => {});
  };

  const toggle = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!rates[id] || !schedules[id]) {
      const [r, s] = await Promise.all([
        rates[id] ? Promise.resolve({ rates: rates[id] }) : api.getFacilityRates(id).catch(() => ({ rates: [] })),
        schedules[id] ? Promise.resolve({ schedule: schedules[id] }) : api.getFacilitySchedule(id).catch(() => ({ schedule: {} })),
      ]);
      setRates(prev => ({ ...prev, [id]: r.rates }));
      setSchedules(prev => ({ ...prev, [id]: s.schedule }));
    }
  };

  const handleRegisterCard = async () => {
    setApplying(true);
    try {
      await api.applyMembership({ categoryCode: user.role });
      toast.success('Membership card registered! Go to Payments to complete your one-time registration fee.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to register membership card');
    } finally {
      setApplying(false);
    }
  };

  const handleToggleSub = async (facilityCode) => {
    const updated = selectedSubs.includes(facilityCode)
      ? selectedSubs.filter(x => x !== facilityCode)
      : [...selectedSubs, facilityCode];
    setSelectedSubs(updated);
    try {
      const pricing = await api.calculateSubscriptionFee(updated);
      const isComboNow = updated.includes('GYM') && updated.includes('SWIMMING');
      if (isComboNow && !prevComboRef.current) {
        setPriceHighlight(true);
        setTimeout(() => setPriceHighlight(false), 1500);
      }
      prevComboRef.current = isComboNow;
      setPriceSummary(pricing);
    } catch {
      toast.error('Failed to calculate pricing summary');
    }
  };

  const handleSaveSubscriptions = async () => {
    if (!selectedPersonId) {
      toast.error('Please select a person first.');
      return;
    }
    setUpdatingSubs(true);
    try {
      await api.updateSubscriptions(selectedPersonId, selectedSubs);
      toast.success('Facility subscriptions updated — changes apply at the next billing cycle.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update subscriptions');
    } finally {
      setUpdatingSubs(false);
    }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-7" />
      </div>
      <div className="skeleton skeleton-card" style={{ height: 260, marginBottom: '2rem' }} />
      <div className="skeleton skeleton-card" style={{ height: 80 }} />
    </div>
  );

  const currentMembership = memberships.find(m => m.status !== 'CANCELLED' && !m.family_member_id);
  const userRegFee = rates['a1000000-0000-0000-0000-000000000001']?.find(r => r.applies_to_roles?.includes(user?.role))?.registration_fee || 2000;
  const isCombo = selectedSubs.includes('GYM') && selectedSubs.includes('SWIMMING');
  const selectedPerson = eligiblePersons.find(p => p.id === selectedPersonId);

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">Facilities & Subscriptions</h1>
        <p className="page-subtitle">Register membership cards and manage monthly facility access</p>
      </div>

      {/* STEP 1: "WHO IS THIS FACILITY SUBSCRIPTION FOR?" SELECTOR */}
      {eligiblePersons.length > 0 && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem', borderTop: '3px solid var(--brass)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Users size={18} color="var(--brass)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Who is this facility subscription for?
            </h2>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Select the specific member (yourself or one of your active approved children) to manage facility access for them:
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {eligiblePersons.map(person => {
              const isSelected = person.id === selectedPersonId;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelectPerson(person)}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  <User size={15} />
                  <span>{person.name}</span>
                  {isSelected && <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CASE 1: No self membership exists */}
      {!currentMembership && eligiblePersons.length === 0 && (
        <div className="card slide-up" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 560, margin: '0 auto 2.5rem', borderTop: '3px solid var(--brass)' }}>
          <div style={{ width: 64, height: 64, background: 'var(--brass-dim)', border: '1.5px solid var(--border-brass)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>
            🏅
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>
            Get Your NUST Sports Card
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 1.75rem' }}>
            To access any NUST sports facility, you must first register your sports membership card. This is a one-time process — after registration you can choose which facilities you want monthly access to.
          </p>

          <div style={{ background: 'var(--bg-page)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>One-time Card Registration Fee:</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Rs {userRegFee.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Your Membership Category:</span>
              <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{user?.role?.toLowerCase()}</strong>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleRegisterCard} disabled={applying}>
            {applying ? 'Registering…' : <><ShieldCheck size={17} /> Register & Pay Card Fee →</>}
          </button>
        </div>
      )}

      {/* CASE 2: Card pending payment */}
      {currentMembership?.status === 'PENDING_PAYMENT' && !selectedPerson && (
        <div className="status-banner status-banner-amber" style={{ maxWidth: 560, margin: '0 auto 2.5rem' }}>
          <AlertCircle size={24} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem' }}>Card Payment Pending</div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.55, marginBottom: '0.75rem' }}>
              Your card registration is awaiting payment. Please pay the one-time fee on the Payments page to activate your card and start managing facility subscriptions.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/payments'}>
              Go to Payments →
            </button>
          </div>
        </div>
      )}

      {/* CASE 3: Active person selected — Subscription Manager */}
      {selectedPerson && (
        <div className="card slide-up" style={{ marginBottom: '2.5rem', borderTop: '3px solid var(--navy)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} color="var(--status-active)" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Manage Facilities for: <span style={{ color: 'var(--brass)' }}>{selectedPerson.name}</span>
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Select the facilities you want monthly access for <strong>{selectedPerson.name}</strong>. Subscriptions are billed monthly per person.
            Gym + Swimming Pool together qualify for a discounted <strong>combo rate of Rs 1,500/month</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
            {(['GYM', 'SWIMMING', 'SADDLE']).map(code => {
              const meta = FACILITY_DISPLAY[code];
              const selected = selectedSubs.includes(code);
              return (
                <div
                  key={code}
                  className={`facility-toggle ${selected ? 'selected' : ''}`}
                  onClick={() => handleToggleSub(code)}
                >
                  <input type="checkbox" checked={selected} readOnly />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {meta.icon} {meta.label}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', display: 'block' }}>
                      {meta.price}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Summary */}
          {selectedSubs.length > 0 && (
            <div className={priceHighlight ? 'price-highlight' : ''} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', transition: 'all 0.3s ease' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Subscription Bill Breakdown ({selectedPerson.name})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {priceSummary.breakdown.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.facility === 'GYM' ? '🏋️ Gym Access' : item.facility === 'SWIMMING' ? '🏊 Swimming Access' : '🐎 Saddle Club'}
                      {item.is_part_of_combo && (
                        <span style={{ marginLeft: '0.5rem', background: 'var(--brass-dim)', color: 'var(--brass)', border: '1px solid var(--border-brass)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Combo ↓
                        </span>
                      )}
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                      Rs {item.monthly_fee.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Monthly Dues</span>
                  {isCombo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                      <Sparkles size={11} color="var(--brass)" />
                      <span style={{ fontSize: '0.7rem', color: 'var(--brass)', fontWeight: 600 }}>Gym + Pool combo discount applied</span>
                    </div>
                  )}
                </div>
                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.375rem', color: 'var(--text-primary)' }}>
                  Rs {priceSummary.totalFee.toLocaleString()}<span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
                </strong>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleSaveSubscriptions}
            disabled={updatingSubs}
          >
            {updatingSubs ? 'Saving subscriptions…' : `Save Subscriptions for ${selectedPerson.name}`}
          </button>
        </div>
      )}

      {/* Facility Details & Schedules */}
      <div className="section-header" style={{ marginTop: '1rem' }}>
        <h2 className="section-title">Facility Details & Schedules</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {facilities.map(f => (
          <div key={f.id} className="card" style={{ cursor: 'pointer', padding: '1.25rem' }}>
            <div onClick={() => toggle(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, background: 'var(--brass-dim)', border: '1px solid var(--border-brass)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                  {f.code === 'POOL' ? '🏊' : f.code === 'GYM' ? '🏋️' : '🐎'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{f.description}</div>
                  {f.closed_day && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-danger)', marginTop: '0.25rem', fontWeight: 500 }}>
                      Closed on {f.closed_day}s
                    </div>
                  )}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {expandedId === f.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {expandedId === f.id && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Clock size={15} color="var(--brass)" /> Weekly Schedule
                </h3>
                {schedules[f.id] && Object.keys(schedules[f.id]).length > 0 ? (
                  <div className="grid grid-3">
                    {dayNames.map(day => schedules[f.id][day] && (
                      <div key={day} style={{ background: 'var(--bg-page)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{day}</div>
                        {schedules[f.id][day].map((s, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {s.start_time?.substring(0, 5)} – {s.end_time?.substring(0, 5)}
                            {s.gender && <span className="badge badge-info" style={{ marginLeft: '0.375rem', fontSize: '0.5rem' }}>{s.gender}</span>}
                            {s.label && <span style={{ color: 'var(--text-muted)' }}> · {s.label}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No schedule data available.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
