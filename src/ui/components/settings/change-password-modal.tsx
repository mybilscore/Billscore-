// src/app/[slug]/settings/modals/change-password-modal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  Key,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  CheckCircle,
  XCircle,
  Info,
  Check,
  ShieldCheck,
  Fingerprint,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  onSuccess?: () => void;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function ChangePasswordModal({ isOpen, onClose, slug, onSuccess }: ChangePasswordModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    let score = 0;
    if (requirements.length) score++;
    if (requirements.uppercase) score++;
    if (requirements.lowercase) score++;
    if (requirements.number) score++;
    if (requirements.special) score++;

    let label = "";
    let color = "";
    if (score === 0) {
      label = "Very Weak";
      color = "text-red-600";
    } else if (score <= 2) {
      label = "Weak";
      color = "text-orange-500";
    } else if (score === 3) {
      label = "Fair";
      color = "text-yellow-600";
    } else if (score === 4) {
      label = "Good";
      color = "text-blue-600";
    } else {
      label = "Strong";
      color = "text-green-600";
    }

    return {
      score,
      label,
      color,
      requirements,
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    // Current password validation - NO strict requirements, just check if not empty
    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    
    // New password validation - strict requirements
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one special character";
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    // Check if new password is same as current (only if both are provided)
    if (formData.newPassword && formData.currentPassword && formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/${slug}/settings/security/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to change password");
      }

      toast.success("Password changed successfully!");
      
      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      
      onSuccess?.();
      onClose();
      
      router.refresh();
      
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      if (error.message.toLowerCase().includes("incorrect") || error.message.toLowerCase().includes("wrong")) {
        toast.error("Current password is incorrect");
        setErrors(prev => ({
          ...prev,
          currentPassword: "Current password is incorrect",
        }));
      } else {
        toast.error(error.message || "Failed to change password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);
  const passwordsMatch = formData.newPassword && formData.confirmPassword && 
    formData.newPassword === formData.confirmPassword;
  // New password must meet all requirements to be valid
  const isNewPasswordValid = formData.newPassword.length >= 8 &&
    /[A-Z]/.test(formData.newPassword) &&
    /[a-z]/.test(formData.newPassword) &&
    /[0-9]/.test(formData.newPassword) &&
    /[^A-Za-z0-9]/.test(formData.newPassword);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update your account password
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Current Password - No strict requirements, just required */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  placeholder="Enter your current password"
                  className={`w-full rounded-lg border ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  } bg-white pl-9 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password - Strict requirements */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  placeholder="Enter new password (min 8 characters, with uppercase, lowercase, number, special char)"
                  className={`w-full rounded-lg border ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-300'
                  } bg-white pl-9 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {errors.newPassword}
                </p>
              )}

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Password strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all ${
                          i < passwordStrength.score
                            ? passwordStrength.score === 5
                              ? 'bg-green-500'
                              : passwordStrength.score === 4
                              ? 'bg-blue-500'
                              : passwordStrength.score === 3
                              ? 'bg-yellow-500'
                              : passwordStrength.score === 2
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Password Requirements */}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.length ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength.requirements.length ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>Min 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength.requirements.uppercase ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength.requirements.lowercase ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.number ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength.requirements.number ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>Number</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.requirements.special ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength.requirements.special ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>Special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password *
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your new password"
                  className={`w-full rounded-lg border ${
                    errors.confirmPassword ? 'border-red-500' : 
                    (formData.confirmPassword && passwordsMatch && formData.newPassword ? 'border-green-500' : 'border-gray-300')
                  } bg-white pl-9 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword && passwordsMatch && formData.newPassword && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Password Guidelines */}
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    New Password Requirements:
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <li>• Minimum 8 characters</li>
                    <li>• At least one uppercase letter (A-Z)</li>
                    <li>• At least one lowercase letter (a-z)</li>
                    <li>• At least one number (0-9)</li>
                    <li>• At least one special character (!@#$%^&*)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Security Tips */}
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    Security Tips:
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                    <li>• Enable Two-Factor Authentication for extra security</li>
                    <li>• Change your password every 90 days</li>
                    <li>• Never share your password with anyone</li>
                    <li>• Use a unique password for this account</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Info about password change */}
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="flex items-start gap-2">
                <Fingerprint className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    After changing your password, you'll be logged out of all active sessions except this one. You'll need to log in again on other devices.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (formData.newPassword && !isNewPasswordValid)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}