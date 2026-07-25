import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { 
  CheckCircle, XCircle, ShieldCheck, Dumbbell, Waves, User, Check, X, ArrowLeft,
  AlertCircle, Hash
} from 'lucide-react';

export default function VerifyCardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loggingCheckIn, setLoggingCheckIn] = useState({});

  // Manual lookup state on this page
  const [cardInput, setCardInput] = useState('');
  const [cardLooking, setCardLooking] = useState(false);
  const [cardInputError, setCardInputError] = useState('');

  useEffect(() => {
    // Load facilities for id mapping
    api.getFacilities().then(d => setFacilities(d.facilities || [])).catch(() => {});
  }, []);

  const triggerQRVerify = (qrToken) => {
    setLoading(true);
    setErrorResult(null);
    setScanResult(null);

    api.trainerVerifyCard({ qrToken })
      .then(result => {
        setScanResult({
          ...result,
          token: qrToken // store original token for check-in
        });
        toast.success(`Card verified for ${result.member?.full_name}`);
        setLoading(false);
      })
      .catch(err => {
        console.error('Verification error details:', err);
        setErrorResult({
          message: err.message || 'Verification failed',
          details: err.data?.message || err.message
        });
        toast.error(`Verification Failed: ${err.message}`);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!token) {
      setErrorResult({
        message: 'No QR token provided',
        details: 'Use the manual lookup below or scan a valid member QR code.'
      });
      setLoading(false);
      return;
    }
    triggerQRVerify(token);
  }, [token, toast]);

  const getFacilityId = (code) => {
    const matched = facilities.find(f => {
      const name = f.name.toUpperCase();
      if (code === 'GYM' && name.includes('GYM')) return true;
      if (code === 'SWIMMING' && (name.includes('SWIM') || name.includes('POOL'))) return true;
      if (code === 'SADDLE' && (name.includes('SADDLE') || name.includes('HORSE'))) return true;
      return false;
    });
    return matched ? matched.id : null;
  };

  const handleLogCheckIn = async (facilityCode) => {
    const fid = getFacilityId(facilityCode);
    if (!fid) {
      toast.error(`Could not locate facility ID for ${facilityCode}`);
      return;
    }
    if (!scanResult || !scanResult.token) return;

    setLoggingCheckIn(prev => ({ ...prev, [facilityCode]: true }));
    try {
      const result = await api.trainerScan({ 
        qrToken: scanResult.token, 
        facilityId: fid 
      });

      if (result.status === 'SUCCESS') {
        toast.success(`Check-in recorded for ${facilityCode}`);
      } else {
        toast.error(`Check-in Denied: ${result.reason}`);
      }
    } catch (err) {
      toast.error('Check-in failed: ' + err.message);
    } finally {
      setLoggingCheckIn(prev => ({ ...prev, [facilityCode]: false }));
    }
  };

  // Manual card lookup
  const CARD_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-]{2,}$/;

  const handleCardLookup = async (e) => {
    if (e) e.preventDefault();
    setCardInputError('');
    const val = cardInput.trim();
    if (!val) { setCardInputError('Please enter a card number'); return; }
    if (!CARD_PATTERN.test(val)) { setCardInputError('Card numbers contain letters, digits and hyphens (e.g. SP-2026-00417)'); return; }

    setLoading(true);
    setScanResult(null);
    setErrorResult(null);
    setCardLooking(true);
    try {
      const result = await api.trainerLookupCard(val);
      setScanResult({
        ...result,
        method: 'MANUAL_LOOKUP'
      });
      toast.success(`Status retrieved for ${result.member?.full_name}`);
    } catch (err) {
      setErrorResult({
        message: err.message || 'Lookup failed',
        details: err.data?.message || err.message
      });
      toast.error(`Lookup Failed: ${err.message}`);
    } finally {
      setCardLooking(false);
      setLoading(false);
    }
  };

  const getFacilityIcon = (code) => {
    switch (code) {
      case 'GYM': return <Dumbbell size={20} />;
      case 'SWIMMING': return <Waves size={20} />;
      default: return <ShieldCheck size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'rgba(47, 158, 68, 0.08)', text: 'var(--status-active)', border: 'rgba(47, 158, 68, 0.2)' };
      case 'FROZEN': return { bg: 'rgba(107, 114, 128, 0.08)', text: 'var(--status-gray)', border: 'rgba(107, 114, 128, 0.2)' };
      case 'OVERDUE': return { bg: 'rgba(214, 69, 69, 0.08)', text: 'var(--status-danger)', border: 'rgba(214, 69, 69, 0.2)' };
      default: return { bg: 'var(--bg-page)', text: 'var(--text-secondary)', border: 'var(--border)' };
    }
  };

  const isManual = scanResult?.method === 'MANUAL_LOOKUP';

  return (
    <div className="page container fade-in" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/trainer')} 
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <ArrowLeft size={14} /> Back to Gate Scanner
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={26} style={{ color: 'var(--text-primary)' }} />
          Card Verification Lookup
        </h1>
        <p className="page-subtitle">Verify member details and active subscription status</p>
      </div>

      {loading && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', marginBottom: '2rem' }}>
          <span className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--navy)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
          <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {cardLooking ? 'Retrieving Card Details...' : 'Verifying QR Code Signature...'}
          </p>
        </div>
      )}

      {!loading && errorResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', animation: 'fadeIn var(--transition-normal)' }}>
          <div className="scan-result-banner denied">
            <div className="scan-result-icon">
              <XCircle size={36} color="white" />
            </div>
            <div>
              <div className="scan-result-label">ACCESS DENIED</div>
              <div className="scan-result-sub">Verification failed / invalid card signature</div>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--status-danger)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--status-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Error Message
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.5, background: 'var(--bg-page)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {errorResult.details || errorResult.message}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.4 }}>
              If using QR scan, make sure that the link has not expired. Standard QR codes are only valid for 60 seconds from generation. Ask the member to refresh their app screen.
            </p>
          </div>
        </div>
      )}

      {!loading && scanResult && scanResult.status === 'SUCCESS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', animation: 'fadeIn var(--transition-normal)' }}>
          
          <div className="scan-result-banner granted">
            <div className="scan-result-icon">
              <CheckCircle size={36} color="white" />
            </div>
            <div>
              <div className="scan-result-label">ACCESS GRANTED</div>
              <div className="scan-result-sub">
                {isManual ? 'Manual card lookup — identity verified' : 'Signature matches student database records'}
              </div>
            </div>
          </div>

          {/* Member Profile */}
          <div className="card">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 90,
                  height: 110,
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-medium)',
                  background: 'var(--bg-page)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {scanResult.member.photo_url ? (
                    <img 
                      src={scanResult.member.photo_url} 
                      alt="Profile Visual" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>👤</span>
                  )}
                </div>
                <span className="badge badge-brass" style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}>Visual Match</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  {scanResult.member.full_name}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {scanResult.member.parent_name && (
                    <>
                      <strong>Parent:</strong> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{scanResult.member.parent_name}</span>
                    </>
                  )}
                  <strong>Role:</strong> <span>{scanResult.member.role}</span>
                  {scanResult.member.registration_number && (
                    <>
                      <strong>Reg No:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{scanResult.member.registration_number}</span>
                    </>
                  )}
                  <strong>Card No:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{scanResult.card.card_number}</span>
                  <strong>Card Status:</strong> 
                  <span className={`badge ${
                    scanResult.membership.status === 'ACTIVE' ? 'badge-active' : 'badge-failed'
                  }`} style={{ width: 'fit-content', fontSize: '0.6rem' }}>
                    {scanResult.membership.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Live Facility Subscription Permits
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {Object.entries(scanResult.membership.facilities).map(([facilityCode, status]) => {
                const styling = getStatusColor(status);
                const isCheckinLoading = loggingCheckIn[facilityCode];
                
                return (
                  <div 
                    key={facilityCode}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: styling.bg,
                      border: `1px solid ${styling.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ color: styling.text }}>
                        {getFacilityIcon(facilityCode)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {facilityCode === 'SWIMMING' ? 'Swimming Pool' : facilityCode === 'GYM' ? 'Gymnasium' : 'Saddle Club'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: styling.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Status: {status}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {status === 'ACTIVE' && !isManual ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleLogCheckIn(facilityCode)}
                          disabled={isCheckinLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--status-active)', borderColor: 'var(--status-active)', boxShadow: 'none' }}
                        >
                          {isCheckinLoading ? (
                            'Logging...'
                          ) : (
                            <>
                              <Check size={14} /> Log Entry
                            </>
                          )}
                        </button>
                      ) : status === 'ACTIVE' && isManual ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={14} /> Valid Access
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                          <X size={14} /> No Access
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {isManual && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px dashed var(--border)' }}>
                Manual lookups show live status only — use the QR scan to log a gate entry.
              </p>
            )}
          </div>

        </div>
      )}

      {/* Manual lookup input field at the bottom */}
      {!loading && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              Manual Card Lookup
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div className="card" style={{ borderTop: '3px solid var(--brass)' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Hash size={17} color="var(--brass)" />
              Look Up Card Number
            </h2>
            <form onSubmit={handleCardLookup}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Card Number</label>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      className={`form-input ${cardInputError ? 'error' : ''}`}
                      type="text"
                      value={cardInput}
                      onChange={e => { setCardInput(e.target.value); if (cardInputError) setCardInputError(''); }}
                      placeholder="e.g. SP-2026-00417"
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <button type="submit" className="btn btn-brass" disabled={cardLooking} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {cardLooking ? 'Checking...' : 'Check Status'}
                  </button>
                </div>
                {cardInputError && (
                  <div className="form-error">
                    <AlertCircle size={12} /> {cardInputError}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
