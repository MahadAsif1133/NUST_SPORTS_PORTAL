import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { QrCode, Download, AlertTriangle } from 'lucide-react';

// Facility icon SVGs as inline components
const GymIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v16M18 4v16M3 12h18M6 8H3M6 16H3M21 8h-3M21 16h-3"/>
  </svg>
);
const SwimIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
    <path d="M2 18 c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
    <circle cx="12" cy="6" r="2"/>
    <path d="M12 8v4"/>
  </svg>
);
const SaddleIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4c2 0 4 2 8 2s6-2 8-2"/>
    <path d="M4 4v6a8 8 0 0 0 16 0V4"/>
  </svg>
);

const FACILITY_META = {
  GYM:      { label: 'Gym',      Icon: GymIcon   },
  SWIMMING: { label: 'Pool',     Icon: SwimIcon  },
  SADDLE:   { label: 'Saddle',   Icon: SaddleIcon },
};

// 3D tilt interaction hook
function useTilt(ref) {
  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -8;
    const rotY = ((x - cx) / cx) * 10;
    ref.current.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
  }, [ref]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => { if (ref.current) ref.current.style.transition = ''; }, 500);
  }, [ref]);

  return { handleMouseMove, handleMouseLeave };
}

function MembershipCard({ card, user }) {
  const cardRef = useRef(null);
  const { handleMouseMove, handleMouseLeave } = useTilt(cardRef);

  const activeSubs = (card.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility);
  const isChildCard = Boolean(card.family_member_name);
  const displayName = isChildCard ? `${card.family_member_name} (${card.family_member_relation})` : user?.fullName;
  const displayPhoto = isChildCard ? card.family_member_photo : user?.photoUrl;
  const displayRole = isChildCard ? `Dependent of ${user?.fullName}` : user?.role;

  return (
    <div
      ref={cardRef}
      className="membership-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.08s ease-out, box-shadow 0.15s ease' }}
    >
      {/* Watermark Shield */}
      <svg className="membership-card-watermark" viewBox="0 0 100 100" fill="none">
        <path d="M50 5 L90 20 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 20 Z" fill="white"/>
      </svg>

      {/* Header Bar */}
      <div className="membership-card-header">
        <div className="membership-card-title">NUST Sports Portal</div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {activeSubs.length === 0 ? (
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>No active subs</span>
          ) : (
            activeSubs.map(fac => {
              const meta = FACILITY_META[fac];
              if (!meta) return null;
              return (
                <span key={fac} className="facility-badge">
                  <meta.Icon />
                  {meta.label}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Body */}
      <div className="membership-card-body">
        {/* Photo */}
        <div className="membership-card-photo">
          {displayPhoto ? (
            <img src={displayPhoto} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem', filter: 'grayscale(0.3)' }}>👤</span>
          )}
        </div>

        {/* Info */}
        <div className="membership-card-details">
          <div className="membership-card-name">{displayName}</div>
          <div className="membership-card-number">Card No: {card.card_number}</div>
          <div className="membership-card-meta">
            <strong>Role:</strong> {displayRole}<br />
            {!isChildCard && user?.registrationNumber && <><strong>Reg No:</strong> {user.registrationNumber}<br /></>}
            <strong>Category:</strong> {card.category_code?.replace(/_/g, ' ')}<br />
            <strong>Member Since:</strong> {new Date(card.created_at).toLocaleDateString()}
          </div>

          {/* Facility Badges */}
          {activeSubs.length > 0 && (
            <div className="facility-badges" style={{ marginTop: '0.5rem' }}>
              {activeSubs.map(fac => {
                const meta = FACILITY_META[fac];
                if (!meta) return null;
                return (
                  <span key={fac} className="facility-badge">
                    <meta.Icon /> {meta.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="membership-card-footer">
        This e-card is property of NUST. Misuse will result in immediate cancellation.
      </div>
    </div>
  );
}

export default function CardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyCards().then(d => { setCards(d.cards || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const downloadECard = async (cardId) => {
    try {
      const res = await api.getECard(cardId);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecard-${cardId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('E-Card downloaded to your device.');
    } catch (err) {
      toast.error(err.message || 'Failed to download e-card');
    }
  };

  const reportLost = async (cardId) => {
    if (!confirm('Report this card as lost? A new card will be issued and a duplicate card fee will apply.')) return;
    try {
      await api.reportLost(cardId);
      toast.success('Card reported lost — a replacement will be issued.');
      api.getMyCards().then(d => setCards(d.cards || []));
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return (
    <div className="page container fade-in">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ marginBottom: '0.5rem' }} />
        <div className="skeleton skeleton-text w-5" />
      </div>
      <div className="grid grid-2">
        {[0, 1].map(i => (
          <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="page container fade-in">
      <div className="page-header">
        <h1 className="page-title">My Card</h1>
        <p className="page-subtitle">Your digital NUST Sports membership card — hover to interact</p>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Download size={28} color="var(--text-muted)" />
          </div>
          <h3>No card issued yet</h3>
          <p>Your membership card will appear here once your first payment has been verified by admin.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {cards.map(c => (
            <div key={c.id}>
              {/* The premium card visual */}
              <div style={{ maxWidth: 460, marginBottom: '1.25rem' }}>
                <MembershipCard
                  card={c}
                  user={user}
                />
              </div>

              {/* Card status + actions */}
              <div className="card" style={{ maxWidth: 460 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Membership Status</div>
                    <span className={`badge ${c.membership_status === 'ACTIVE' ? 'badge-active' : 'badge-cancelled'}`}>
                      {c.membership_status}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Card Number</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {c.card_number}
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => downloadECard(c.id)}>
                    <Download size={14} /> Download E-Card PDF
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => reportLost(c.id)} title="Report as lost">
                    <AlertTriangle size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
