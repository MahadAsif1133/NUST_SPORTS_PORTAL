import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import {
  CheckCircle, XCircle, ShieldCheck, Dumbbell, Waves,
  User, Clock, Hash, AlertCircle
} from 'lucide-react';

// ─── Shared status colour helper ─────────────────────────────────────────────
const facilityColor = (status) => {
  switch (status) {
    case 'ACTIVE':         return { bg: 'rgba(47,158,68,0.08)',  text: 'var(--status-active)',  border: 'rgba(47,158,68,0.22)' };
    case 'FROZEN':         return { bg: 'rgba(107,114,128,0.08)', text: 'var(--status-gray)',   border: 'rgba(107,114,128,0.22)' };
    case 'OVERDUE':        return { bg: 'rgba(214,69,69,0.08)',  text: 'var(--status-danger)', border: 'rgba(214,69,69,0.22)' };
    case 'NOT_SUBSCRIBED': return { bg: 'var(--bg-card-hover)',  text: 'var(--text-muted)',    border: 'var(--border)' };
    default:               return { bg: 'var(--bg-page)',         text: 'var(--text-secondary)',border: 'var(--border)' };
  }
};

const facilityLabel = (code) => (
  code === 'GYM' ? '🏋️ Gymnasium' : code === 'SWIMMING' ? '🏊 Swimming Pool' : '🐎 Saddle Club'
);

const facilityIcon = (code) => (
  code === 'GYM' ? <Dumbbell size={18} /> : code === 'SWIMMING' ? <Waves size={18} /> : <ShieldCheck size={18} />
);

// ─── Result renderer ────────────────────────────────────────────────────────
function ResultPanel({ result, onClear }) {
  if (!result) return null;

  const isGranted = result.status === 'SUCCESS';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Big GRANTED / DENIED banner */}
      <div className={`scan-result-banner ${isGranted ? 'granted' : 'denied'}`}>
        <div className="scan-result-icon">
          {isGranted ? <CheckCircle size={34} color="white" /> : <XCircle size={34} color="white" />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="scan-result-label">{isGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</div>
          <div className="scan-result-sub">
            {isGranted
              ? 'Card number verified — member active'
              : result.reason || 'Verification failed'}
          </div>
        </div>
        <button
          onClick={onClear}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--radius-md)', color: 'white', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
        >
          Clear
        </button>
      </div>

      {/* Member profile */}
      {result.member && (
        <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          {/* Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 80, height: 96, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-medium)', background: 'var(--bg-page)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {result.member.photo_url
                ? <img src={result.member.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={32} color="var(--text-muted)" />}
            </div>
            <span className="badge badge-brass" style={{ fontSize: '0.55rem' }}>Verify Photo</span>
          </div>
          {/* Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {result.member.full_name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {result.member.parent_name && (
                <>
                  <strong>Parent:</strong> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.member.parent_name}</span>
                </>
              )}
              <strong>Role:</strong>       <span>{result.member.role}</span>
              {result.member.registration_number && <>
                <strong>Reg No:</strong>  <span style={{ fontFamily: 'var(--font-mono)' }}>{result.member.registration_number}</span>
              </>}
              <strong>Card No:</strong>   <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{result.card?.card_number}</span>
              <strong>Membership:</strong><span className={`badge ${result.membership?.status === 'ACTIVE' ? 'badge-active' : 'badge-failed'}`} style={{ width: 'fit-content', fontSize: '0.6rem' }}>{result.membership?.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Per-facility status strips */}
      {result.membership?.facilities && (
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.875rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Live Facility Permit Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(result.membership.facilities).map(([code, status]) => {
              const c = facilityColor(status);
              return (
                <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: c.bg, border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: c.text }}>{facilityIcon(code)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{facilityLabel(code)}</div>
                      <div style={{ fontSize: '0.6875rem', color: c.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{status.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main TrainerPage ─────────────────────────────────────────────────────────
export default function TrainerPage() {
  const toast = useToast();

  // Manual lookup state
  const [cardInput,     setCardInput]     = useState('');
  const [cardLooking,   setCardLooking]   = useState(false);
  const [cardResult,    setCardResult]    = useState(null);
  const [cardError,     setCardError]     = useState(null);
  const [cardInputError,setCardInputError]= useState('');

  // Shared: recent scans
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    api.trainerGetAttendance({}).then(d => setRecentScans(d.attendanceLogs || [])).catch(() => {});
  }, []);

  // ── Manual card lookup ────────────────────────────────────────────────────
  const CARD_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-]{2,}$/;

  const handleCardLookup = async (e) => {
    if (e) e.preventDefault();
    setCardInputError('');
    const val = cardInput.trim();
    if (!val) { setCardInputError('Please enter a card number'); return; }
    if (!CARD_PATTERN.test(val)) { setCardInputError('Card numbers contain letters, digits and hyphens (e.g. NSP-10001)'); return; }

    setCardLooking(true);
    setCardResult(null); setCardError(null);
    try {
      const result = await api.trainerLookupCard(val);
      setCardResult(result);
      toast.success(`Status retrieved for ${result.member?.full_name}`);
    } catch (err) {
      setCardError({ message: err.message });
      toast.error(err.message);
    } finally {
      setCardLooking(false);
    }
  };

  const clearAll = () => {
    setCardResult(null); setCardError(null);
    setCardInputError('');
  };

  const displayResult = cardResult || (cardError ? { status: 'DENIED', reason: cardError?.message } : null);

  return (
    <div className="page container fade-in" style={{ maxWidth: 1240 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={26} color="var(--navy)" />
            Gate Access Control
          </h1>
          <p className="page-subtitle">Verify membership cards by entering card number</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Gate System</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '2rem', alignItems: 'start' }}>

        {/* ── LEFT COLUMN: Card Lookup & History ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Card Number Lookup */}
          <div className="card" style={{ borderTop: '3px solid var(--brass)' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Hash size={17} color="var(--brass)" />
              Card Number Verification
            </h2>
            <form onSubmit={handleCardLookup}>
              <div className="form-group">
                <label className="form-label">Card Number</label>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      className={`form-input ${cardInputError ? 'error' : ''}`}
                      type="text"
                      value={cardInput}
                      onChange={e => { setCardInput(e.target.value); if (cardInputError) setCardInputError(''); }}
                      placeholder="e.g. NSP-10001"
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      spellCheck={false}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-brass" disabled={cardLooking} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {cardLooking
                      ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'var(--navy)', borderTopColor: 'transparent' }} /> Checking…</>
                      : 'Check Status'}
                  </button>
                </div>
                {cardInputError && (
                  <div className="form-error">
                    <AlertCircle size={12} /> {cardInputError}
                  </div>
                )}
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  Card number is printed on the physical or digital sports card. Case-insensitive.
                </span>
              </div>
            </form>
          </div>

          {/* Recent Entry Logs */}
          <div className="card">
            <h2 style={{ fontSize: '1.0rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Clock size={16} color="var(--text-secondary)" />
              Recent Verification Logs
            </h2>
            {recentScans.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>No entries recorded yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 260, overflowY: 'auto' }}>
                {recentScans.slice(0, 10).map(s => (
                  <div key={s.id} style={{ padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{s.member_name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                        {s.facility_name} · {new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`badge ${s.status === 'SUCCESS' ? 'badge-active' : 'badge-failed'}`} style={{ fontSize: '0.6rem' }}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: result panel ───────────────────────────────────── */}
        <div>
          {!displayResult ? (
            // Idle placeholder
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, border: '2px dashed var(--border-medium)', background: 'var(--bg-card)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                <Hash size={28} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Awaiting card verification
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 260, lineHeight: 1.55 }}>
                Enter a member's card number on the left to inspect their member photo, parent details, and live facility permits.
              </p>
            </div>
          ) : (
            <ResultPanel
              result={displayResult}
              onClear={clearAll}
            />
          )}
        </div>

      </div>
    </div>
  );
}
