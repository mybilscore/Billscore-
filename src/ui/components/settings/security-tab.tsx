// src/app/[slug]/settings/components/security-tab.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

interface SecurityTabProps {
  data: any;
  slug: string;
  permissions: any;
  onSave: (data: any) => void;
}

export function SecurityTab({ data, slug, permissions, onSave }: SecurityTabProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  const handleChangePassword = async (formData: any) => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/${slug}/settings/security/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setShowPasswordForm(false);
      onSave({});
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const response = await fetch(`/api/${slug}/settings/security/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !data.security?.twoFactorEnabled,
        }),
      });

      if (!response.ok) throw new Error("Failed to update 2FA");

      const result = await response.json();
      toast.success(`2FA ${result.enabled ? "enabled" : "disabled"} successfully`);
      onSave({ security: result });
    } catch (error) {
      toast.error("Failed to update 2FA settings");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session?")) return;

    try {
      const response = await fetch(`/api/${slug}/settings/security/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to revoke session");

      toast.success("Session revoked successfully");
      onSave({});
    } catch (error) {
      toast.error("Failed to revoke session");
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "No password", color: "gray" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengths = [
      { score: 0, label: "Very Weak", color: "red" },
      { score: 2, label: "Weak", color: "orange" },
      { score: 4, label: "Fair", color: "yellow" },
      { score: 5, label: "Good", color: "blue" },
      { score: 6, label: "Strong", color: "green" },
    ];

    return strengths.reduce((prev, curr) => 
      score >= curr.score ? curr : prev
    );
  };

  const passwordStrength = getPasswordStrength(newPassword || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Security Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account security and active sessions
        </p>
      </div>

      {/* Password Section */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center dark:bg-blue-900/20">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Password</h3>
              <p className="text-sm text-gray-500">
                Last changed: {data.security?.passwordLastChanged 
                  ? new Date(data.security.passwordLastChanged).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Change Password
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleSubmit(handleChangePassword)} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  {...register("currentPassword", { required: "Current password is required" })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  {...register("newPassword", { 
                    required: "New password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" }
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">Password strength:</span>
                    <span className={`text-xs font-medium text-${passwordStrength.color}-600`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full ${
                          i < (passwordStrength.score as number)
                            ? `bg-${passwordStrength.color}-500`
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword", { 
                    required: "Please confirm your password",
                    validate: value => value === newPassword || "Passwords do not match"
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-[#2e7d32] text-white rounded-lg hover:bg-[#1b5e20] disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              data.security?.twoFactorEnabled
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-gray-50 dark:bg-gray-800"
            }`}>
              <Smartphone className={`h-5 w-5 ${
                data.security?.twoFactorEnabled
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
              }`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-500">
                {data.security?.twoFactorEnabled
                  ? "2FA is enabled. Your account is more secure."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle2FA}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              data.security?.twoFactorEnabled
                ? "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                : "bg-[#2e7d32] text-white hover:bg-[#1b5e20]"
            }`}
          >
            {data.security?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </div>

      {/* Session Management */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center dark:bg-purple-900/20">
            <Laptop className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Active Sessions</h3>
            <p className="text-sm text-gray-500">
              Manage your active sessions across devices
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Current Session */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2e7d32]/10 flex items-center justify-center">
                <Laptop className="h-4 w-4 text-[#2e7d32]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Current Session
                </p>
                <p className="text-xs text-gray-500">
                  Chrome on Windows • Last active now
                </p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Active
            </span>
          </div>

          {/* Other Sessions (example) */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center dark:bg-gray-700">
                <Smartphone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mobile Device
                </p>
                <p className="text-xs text-gray-500">
                  iPhone • Last active 2 days ago
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRevokeSession("session-123")}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Security Recommendations
        </h3>
        <div className="space-y-2">
          {!data.security?.twoFactorEnabled && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Enable two-factor authentication for better security</span>
            </div>
          )}
          {data.security?.passwordLastChanged && 
            new Date(data.security.passwordLastChanged) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Your password is over 90 days old. Consider changing it.</span>
            </div>
          )}
          {data.security?.maxSessions && data.security.maxSessions < 5 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Info className="h-4 w-4" />
              <span>You can increase your session limit in preferences</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}