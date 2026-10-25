import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { COLLEGE_LOGO } from '../../constants/branding';
import { Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '../../services/api';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email: trimmedEmail });
      setMessage(response?.message || 'If an account exists for this email, password reset instructions will be sent.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process your request at this moment. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-glow-bg" />

      <div className="animate-fade-in login-card">
        {/* College Logo & Header */}
        <div className="login-header">
          <div className="login-emblem">
            <img src={COLLEGE_LOGO} alt="NEC College Logo" style={{ objectFit: 'contain' }} />
          </div>

          <h1 className="login-title">
            Reset Password
          </h1>
          <p className="login-subtitle">
            Faculty Service Management System
          </p>
          <span className="login-tagline">
            Enter your registered institutional email to receive reset instructions
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Confirmation Alert */}
        {submitted ? (
          <div className="space-y-4">
            <div className="login-success-alert">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <span>{message}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
              Please check your inbox (and spam folder) for the password reset link. The link is valid for 15 minutes.
            </p>
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', textDecoration: 'none' }}>
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label className="login-field-label">
                Registered Email Address
              </label>
              <div className="login-input-wrapper">
                <Mail size={18} className="login-input-icon" />
                <input
                  type="email"
                  placeholder="e.g. csehod@nrtec.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input-text"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span>Sending Instructions...</span>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/login" className="login-forgot-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
