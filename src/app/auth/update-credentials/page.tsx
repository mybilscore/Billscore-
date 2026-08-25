// app/auth/update-credentials/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';

export default function UpdateCredentialsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userData, setUserData] = useState<{ fullName: string; email: string; username: string } | null>(null);
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    newPin: '',
    confirmPin: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Validate token on load
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('Invalid or missing token');
        setValidating(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-credentials-token?token=${token}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Invalid or expired token');
          setValidating(false);
          setLoading(false);
          return;
        }

        setUserData(data.user);
        setValidating(false);
        setLoading(false);
      } catch (err) {
        setError('Failed to validate token. Please try again.');
        setValidating(false);
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    setLoading(true);

    const { newPassword, confirmPassword, newPin, confirmPin } = formData;

    // Validate password
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate PIN
    if (newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4 to 6 digits');
      setLoading(false);
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setError('PIN must contain only numbers');
      setLoading(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
          newPin,
          confirmPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Credentials updated successfully!');
        // ✅ No auto-redirect - user clicks close button
      } else {
        setError(data.error || 'Failed to update credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Close handler - redirects to bilscore.com
  const handleClose = () => {
    window.location.href = 'https://bilscore.com';
  };

  // ✅ Go back handler (for error states)
  const handleGoBack = () => {
    window.location.href = 'https://bilscore.com';
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e293b]"></div>
          <p className="text-gray-600">Validating your link...</p>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Invalid Link</h2>
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600">{error}</p>
            </div>
            <div className="mt-6">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center px-6 py-3 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 font-medium"
              >
                Return to Bilscore
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 relative">
          {/* Close Button - Top Right */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors group"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-[#1e293b] transition-colors" />
          </button>

          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/uploads/log-icon.jpeg"
                alt="Bilscore"
                className="h-10 w-10 object-cover rounded-lg"
              />
            </div>
            <span className="text-2xl font-bold text-[#1e293b] ml-1">bilscore</span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#1e293b]">Update Credentials</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set a new password and PIN for your Bilscore account
            </p>
          </div>

          {userData && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <p className="font-medium text-[#1e293b]">{userData.fullName}</p>
              {userData.email && <p className="text-sm text-gray-600">{userData.email}</p>}
              {userData.username && <p className="text-sm text-gray-400">@{userData.username}</p>}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Security Notice:</strong> This link is valid for 7 days and can only be used once.
                Keep your credentials secure and never share them.
              </p>
            </div>
          </div>

          {success && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{success}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Your credentials have been updated successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Password Section */}
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={!!success}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 text-xs text-gray-400">
                Requirements: Minimum 8 characters, mix of letters and numbers
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={!!success}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  )}
                </button>
              </div>
            </div>

            {/* PIN Section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                New Transaction PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  name="newPin"
                  value={formData.newPin}
                  onChange={handleChange}
                  required
                  minLength={4}
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  disabled={!!success}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter 4-6 digit PIN"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPin ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">4 to 6 digits only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                Confirm PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPin ? "text" : "password"}
                  name="confirmPin"
                  value={formData.confirmPin}
                  onChange={handleChange}
                  required
                  minLength={4}
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  disabled={!!success}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Confirm new PIN"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPin ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />
                  )}
                </button>
              </div>
            </div>

            {/* Button */}
            {success ? (
              <button
                type="button"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 font-medium"
              >
                <X className="h-5 w-5" />
                Close & Return to Bilscore
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Update Credentials'
                )}
              </button>
            )}

            {/* Footer Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-400 hover:text-[#1e293b] transition-colors"
              >
                Return to Bilscore
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Bilscore. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}