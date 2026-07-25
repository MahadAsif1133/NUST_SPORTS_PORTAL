import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, GraduationCap, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('student');
  const [form, setForm] = useState({ registrationNumber: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const validate = () => {
    const errs = {};
    if (mode === 'student' && !form.registrationNumber.trim()) errs.registrationNumber = 'Registration number is required';
    if (mode === 'email' && !form.email.trim()) errs.email = 'Email address is required';
    if (mode === 'email' && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const creds = mode === 'student'
        ? { registrationNumber: form.registrationNumber, password: form.password }
        : { email: form.email, password: form.password };
      await login(creds);
      toast.success('Welcome back! Signed in successfully.');
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get('redirectTo');
      navigate(redirectTo ? decodeURIComponent(redirectTo) : '/dashboard');
    } catch (err) {
      if (err.status === 429) {
        setCooldown(30);
        const timer = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
      toast.error(err.message || 'Sign-in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="auth-page">
      {/* Left Branding Panel */}
      <div className="auth-panel-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #C9A227, #E8C04A)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(201,162,39,0.35)'
            }}>🏅</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>NUST Sports</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Facility Portal</div>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.25rem', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: '1rem' }}>
            Access your sports facilities
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, maxWidth: 300 }}>
            Manage memberships, track payments, and access your digital ID card — all in one place.
          </p>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🏋️', label: 'Gymnasium', sub: 'Full access membership' },
              { icon: '🏊', label: 'Swimming Pool', sub: 'Lane & open swim sessions' },
              { icon: '🐎', label: 'Saddle Club', sub: 'Equestrian programmes' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, background: 'rgba(201,162,39,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(201,162,39,0.25)' }}>
                  <span style={{ fontSize: '1rem' }}>{f.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{f.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em' }}>
            © National University of Sciences and Technology
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-panel-right">
        <div className="auth-form-card slide-up">
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ fontWeight: 600 }}>Register here</Link>
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              type="button"
              id="mode-student"
              className={`mode-toggle-btn ${mode === 'student' ? 'active' : ''}`}
              onClick={() => { setMode('student'); setErrors({}); }}
            >
              <GraduationCap size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Student
            </button>
            <button
              type="button"
              id="mode-staff"
              className={`mode-toggle-btn ${mode === 'email' ? 'active' : ''}`}
              onClick={() => { setMode('email'); setErrors({}); }}
            >
              <Briefcase size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Staff / Other
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'student' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="reg-number">Registration Number</label>
                <input
                  id="reg-number"
                  className={`form-input ${errors.registrationNumber ? 'error' : ''}`}
                  type="text"
                  placeholder="e.g. 412001"
                  value={form.registrationNumber}
                  onChange={e => handleChange('registrationNumber', e.target.value)}
                  autoFocus
                />
                {errors.registrationNumber && <div className="form-error">{errors.registrationNumber}</div>}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  type="email"
                  placeholder="you@nust.edu.pk"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  autoFocus
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <button
              id="login-submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'white' }} />
              ) : cooldown > 0 ? (
                `Too many attempts — wait ${cooldown}s`
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
