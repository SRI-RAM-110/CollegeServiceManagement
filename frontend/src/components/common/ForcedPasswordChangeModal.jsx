import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export const ForcedPasswordChangeModal = () => {
  const { user, mustChangePassword, updateCurrentUser, logout } = useAuth();
  const { addToast } = useNotifications();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!mustChangePassword || !user) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!oldPassword.trim()) {
      setError('Please enter your current or temporary password.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password cannot be the same as the temporary password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    try {
      setLoading(true);
      await authApi.changePassword({
        userId: user.userId,
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      });

      updateCurrentUser({ mustChangePassword: false });
      addToast('Password updated successfully! Welcome to the portal.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        zIndex: 9999,
        padding: '24px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl space-y-4"
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: 'auto',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Change Temporary Password</h2>
            <p className="text-xs text-slate-400">Security requirement for first login</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You are logged in with a temporary or administrator-assigned password. You must set a personal secure password before accessing portal services.
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Current / Temporary Password
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new secure password"
              className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ForcedPasswordChangeModal;
