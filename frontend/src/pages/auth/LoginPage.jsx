import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLLEGE_LOGO } from '../../constants/branding';
import { ShieldCheck, Eye, EyeOff, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage = () => {
  const { login, isAuthenticated, user, getDefaultRouteForRole } = useAuth();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already authenticated, redirect to role-specific dashboard
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }

    const savedId = localStorage.getItem('rememberedUserId');
    if (savedId) {
      setUserId(savedId);
    }
  }, [isAuthenticated, user, navigate, getDefaultRouteForRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId.trim() || !password) {
      setError('Please enter both User ID and Password');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(userId.trim(), password, rememberMe);
      const target = getDefaultRouteForRole(loggedInUser.role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid User ID or Password');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page-container">
      {/* Background radial glow */}
      <div className="login-glow-bg" />

      <div className="animate-fade-in login-card">
        {/* College Logo & Header */}
        <div className="login-header">
          <div className="login-emblem">
            <img src={COLLEGE_LOGO} alt="NEC College Logo" style={{ objectFit: 'contain' }} />
          </div>

          <h1 className="login-title">
            Narasaraopet Engineering College
          </h1>
          <p className="login-subtitle">
            Faculty Service Management System
          </p>
          <span className="login-tagline">
            Sign in with institutional credentials
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* User ID */}
          <div>
            <label className="login-field-label">
              User ID
            </label>
            <div className="login-input-wrapper">
              <UserIcon
                size={18}
                className="login-input-icon"
              />
              <input
                type="text"
                placeholder="e.g. CSE001, AO001"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="login-input-text"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="login-field-label">
              Password
            </label>
            <div className="login-input-wrapper">
              <Lock
                size={18}
                className="login-input-icon"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-eye-btn"
                tabIndex="-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="login-options-row">
            <label className="login-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login-checkbox"
              />
              Remember me
            </label>
            <span className="login-version-tag">College Portal v1.0</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
