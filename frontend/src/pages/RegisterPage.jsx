import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../api';
import { UserPlus } from 'lucide-react';

const ROLES = [
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'OFFICER', label: 'Officer / Staff' },
  { value: 'ALUMNI', label: 'Alumni' },
  { value: 'RIC_TENANT', label: 'RIC Tenant' },
  { value: 'NSTP_TENANT', label: 'NSTP Tenant' },
];

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('student');
  const [form, setForm] = useState({
    registrationNumber: '', password: '', confirmPassword: '',
    email: '', role: 'FACULTY', fullName: '', cnic: '', dob: '', contactNumber: '', department: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpUserId, setOtpUserId] = useState(null);
  const [otp, setOtp] = useState('');

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (mode === 'student') {
      if (!form.registrationNumber.trim()) errs.registrationNumber = 'Registration number is required';
    } else {
      if (!form.fullName.trim()) errs.fullName = 'Full name is required';
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    }
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (mode === 'student') {
        const data = await api.registerStudent(form.registrationNumber, form.password);
        api.setTokens(data.accessToken, data.refreshToken);
        toast.success('Account created — welcome to NUST Sports!');
        navigate('/dashboard');
      } else {
        const data = await api.registerNative({
          email: form.email,
          password: form.password,
          role: form.role,
          fullName: form.fullName,
          cnic: form.cnic || null,
          dob: form.dob || null,
          contactNumber: form.contactNumber || null,
          department: form.department || null,
        });
        setOtpUserId(data.user.id);
        setOtpStep(true);
        toast.info(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.verifyOTP(otpUserId, otp);
      toast.success('Email verified! You can now sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (otpStep) {
    return (
      <div className="auth-page" style={{ background: 'var(--bg-page)' }}>
        <div className="auth-panel-right" style={{ flex: 1 }}>
          <div className="auth-form-card slide-up" style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: 'var(--brass-dim)', border: '2px solid var(--border-brass)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1.5rem' }}>
              📧
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Verify Your Email
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              We've sent a 6-digit verification code to your email address. Enter it below to activate your account.
            </p>
            <form onSubmit={handleOTP}>
              <input
                className="form-input"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.6em', fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '0.75rem' }}
                autoFocus
                required
              />
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading || otp.length < 6}
              >
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : 'Verify & Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-panel-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #C9A227, #E8C04A)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(201,162,39,0.35)' }}>🏅</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>NUST Sports</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Facility Portal</div>
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: '1rem' }}>
            Join NUST Sports Community
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, maxWidth: 300 }}>
            Register your account to access the Gym, Swimming Pool, and Saddle Club facilities at NUST.
          </p>
        </div>
        <p style={{ position: 'relative', zIndex: 1, fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em' }}>
          © National University of Sciences and Technology
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="auth-panel-right">
        <div className="auth-form-card slide-up" style={{ maxWidth: 480 }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              Create Account
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>Sign in here</Link>
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button type="button" className={`mode-toggle-btn ${mode === 'student' ? 'active' : ''}`} onClick={() => { setMode('student'); setErrors({}); }}>
              Student
            </button>
            <button type="button" className={`mode-toggle-btn ${mode === 'native' ? 'active' : ''}`} onClick={() => { setMode('native'); setErrors({}); }}>
              Staff / Other
            </button>
          </div>

          <form onSubmit={handleRegister} noValidate>
            {mode === 'student' ? (
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input
                  className={`form-input ${errors.registrationNumber ? 'error' : ''}`}
                  placeholder="e.g., 412001"
                  value={form.registrationNumber}
                  onChange={e => handleChange('registrationNumber', e.target.value)}
                  autoFocus
                />
                {errors.registrationNumber && <div className="form-error">{errors.registrationNumber}</div>}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className={`form-input ${errors.fullName ? 'error' : ''}`} placeholder="Your full name" value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} autoFocus />
                    {errors.fullName && <div className="form-error">{errors.fullName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-input form-select" value={form.role} onChange={e => handleChange('role', e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" placeholder="you@nust.edu.pk" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="e.g., SEECS" value={form.department} onChange={e => handleChange('department', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input className="form-input" placeholder="03XXXXXXXXX" value={form.contactNumber} onChange={e => handleChange('contactNumber', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className={`form-input ${errors.password ? 'error' : ''}`} type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => handleChange('password', e.target.value)} required minLength={8} />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className={`form-input ${errors.confirmPassword ? 'error' : ''}`} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} required />
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.25rem' }} disabled={loading}>
              {loading
                ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                : <><UserPlus size={17} /> Create Account</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
