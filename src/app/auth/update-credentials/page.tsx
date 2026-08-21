// app/auth/update-credentials/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to update credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
            <div className="mt-6">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-500">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Update Credentials</h2>
          <p className="mt-2 text-sm text-gray-600">
            Set a new password and PIN for your Bilscore account
          </p>
        </div>

        {userData && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="font-medium text-gray-900">{userData.fullName}</p>
            {userData.email && <p className="text-sm text-gray-600">{userData.email}</p>}
            {userData.username && <p className="text-sm text-gray-500">@{userData.username}</p>}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>Security Notice:</strong> This link is valid for 7 days and can only be used once.
            Keep your credentials secure and never share them.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Password Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <div className="mt-2 text-xs text-gray-500">
                Requirements:
                <ul className="list-disc list-inside">
                  <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                    Minimum 8 characters
                  </li>
                  <li className={/[a-zA-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    Use a mix of letters and numbers
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            {/* PIN Section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700">New PIN</label>
              <input
                type="password"
                name="newPin"
                value={formData.newPin}
                onChange={handleChange}
                required
                minLength={4}
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter 4-6 digit PIN"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">4 to 6 digits only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm PIN</label>
              <input
                type="password"
                name="confirmPin"
                value={formData.confirmPin}
                onChange={handleChange}
                required
                minLength={4}
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new PIN"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
              <p className="text-xs text-green-500 mt-1">Redirecting to login...</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : success ? '✅ Credentials Updated' : 'Update Credentials'}
          </button>

          <div className="text-center">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-500">
              Return to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}