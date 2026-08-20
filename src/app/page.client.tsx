"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
  Gift,
  Calendar,
  User,
  Key,
} from "lucide-react";

// ============================================
// SOCIAL BUTTONS - REMOVED GOOGLE & APPLE
// ============================================

function SocialButtons({ 
  isLoading, 
  setIsLoading, 
  setError 
}: { 
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
}) {
  // Social sign-in is removed - this component is now empty
  // We keep it as a placeholder but it renders nothing
  return null;
}

type ForgotPasswordStep = "email" | "reset" | null;

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) errors.push("At least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("At least 1 uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least 1 lowercase letter");
  if (!/\d/.test(password)) errors.push("At least 1 number");
  if (!/[@$!%*?&]/.test(password)) errors.push("At least 1 special character (@$!%*?&)");

  return { isValid: errors.length === 0, errors };
};

const validatePin = (pin: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (pin.length < 4) errors.push("At least 4 digits");
  if (pin.length > 6) errors.push("Maximum 6 digits");
  if (!/^\d+$/.test(pin)) errors.push("Must contain only numbers");

  return { isValid: errors.length === 0, errors };
};

// ============================================
// PASSWORD STRENGTH INDICATOR
// ============================================
function PasswordStrengthIndicator({ password }: { password: string }) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least 1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "At least 1 number", met: /\d/.test(password) },
    { label: "At least 1 special character (@$!%*?&)", met: /[@$!%*?&]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const strength = metCount === 5 ? "Strong" : metCount >= 3 ? "Medium" : "Weak";
  const strengthColor = metCount === 5 ? "text-emerald-600" : metCount >= 3 ? "text-amber-600" : "text-rose-600";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <p className={`text-xs font-medium ${strengthColor}`}>Password strength: {strength}</p>
      <div className="flex gap-1">
        {requirements.map((req, idx) => (
          <div key={idx} className={`flex-1 h-1 rounded-full transition-all duration-300 ${req.met ? "bg-emerald-500" : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="space-y-0.5">
        {requirements.map((req, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs">
            {req.met ? <Check className="h-3 w-3 text-emerald-500" /> : <div className="h-3 w-3 rounded-full border border-gray-300" />}
            <span className={req.met ? "text-emerald-700" : "text-gray-400"}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FORGOT PASSWORD MODAL
// ============================================
function ForgotPasswordModal({
  step,
  onClose,
  onSendOtp,
  onResetPassword,
  onResendOtp,
  loading,
  error,
  success,
  resendCooldown,
  resetEmail,
  setResetEmail,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showNewPassword,
  setShowNewPassword,
  resetPasswordErrors,
}: any) {
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e293b]/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1e293b]/10 rounded-2xl flex items-center justify-center">
            <Lock className="h-8 w-8 text-[#1e293b]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1e293b]">
            {step === "email" ? "Reset Password" : "Set New Password"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {step === "email" ? "Enter your email to receive a reset code" : "Enter the 6-digit code sent to your email"}
          </p>
        </div>

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-rose-500 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={step === "email" ? onSendOtp : onResetPassword} className="space-y-4">
          {step === "email" ? (
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">6-Digit Reset Code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 text-center text-2xl tracking-widest font-mono"
                  required
                  maxLength={6}
                />
                <div className="mt-2 text-center">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-gray-400">Resend available in {resendCooldown}s</span>
                  ) : (
                    <button type="button" onClick={onResendOtp} disabled={loading} className="text-xs text-[#1e293b] hover:text-[#0f172a] font-medium transition-colors">
                      Resend code
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showNewPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} />
                {resetPasswordErrors.length > 0 && (
                  <div className="mt-2 p-3 bg-rose-50 rounded-lg">
                    <p className="text-xs font-medium text-rose-700 mb-1">Password requirements:</p>
                    <ul className="text-xs text-rose-600 space-y-0.5">
                      {resetPasswordErrors.map((err: string, idx: number) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : step === "email" ? "Send Reset Code" : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MAIN AUTH PAGE
// ============================================
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [socialLoading, setSocialLoading] = useState(false);

  const urlReferralCode = searchParams.get("ref") || "";
  const isFromReferral = !!urlReferralCode;

  // Sign In
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sign Up
  const [signUpData, setSignUpData] = useState({
    username: "",
    email: "",
    password: "",
    transactionPin: "",
    fullName: "",
    phone: "",
    referralCode: urlReferralCode || "",
  });
  const [signUpError, setSignUpError] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [pinErrors, setPinErrors] = useState<string[]>([]);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpPin, setShowSignUpPin] = useState(false);
  
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerName, setReferrerName] = useState<string>("");
  const [showReferralBanner, setShowReferralBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Forgot Password
  const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetPasswordErrors, setResetPasswordErrors] = useState<string[]>([]);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // ============================================
  // CHECK REFERRAL CODE
  // ============================================
  const checkReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerName("");
      setShowReferralBanner(false);
      return;
    }

    setReferralChecking(true);
    try {
      const response = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      
      setReferralValid(data.valid);
      if (data.valid && data.referrer) {
        setReferrerName(data.referrer.name);
        setShowReferralBanner(true);
      } else {
        setReferrerName("");
        setShowReferralBanner(false);
      }
    } catch (error) {
      setReferralValid(null);
      setReferrerName("");
      setShowReferralBanner(false);
    } finally {
      setReferralChecking(false);
    }
  };

  useEffect(() => {
    if (urlReferralCode) {
      checkReferralCode(urlReferralCode);
    }
  }, [urlReferralCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (signUpData.referralCode) {
        checkReferralCode(signUpData.referralCode);
      } else {
        setReferralValid(null);
        setReferrerName("");
        setShowReferralBanner(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [signUpData.referralCode]);

  // ============================================
  // SIGN IN HANDLER
  // ============================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: identifier.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const errorMessage =
          result.error === "CredentialsSignin"
            ? "Invalid credentials. Please check your email, username, or phone and password."
            : result.error === "AccessDenied"
            ? "Your account is not authorized"
            : "Login failed. Please try again";

        setError(errorMessage);
      } else if (result?.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user) {
          const { role } = session.user;

          if (role === "SUPER_ADMIN" || role === "ADMIN") {
            router.push("/admin");
          } else if (role === "AGENT" || role === "RETAILER") {
            router.push("/agent/dashboard");
          } else if (role === "DEVELOPER") {
            router.push("/developer/dashboard");
          } else {
            router.push(callbackUrl);
          }
        } else {
          router.push(callbackUrl);
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SIGN UP HANDLER
  // ============================================
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpLoading(true);
    setSignUpError("");
    setPasswordErrors([]);
    setPinErrors([]);

    if (!signUpData.username || signUpData.username.length < 3) {
      setSignUpError("Username must be at least 3 characters");
      setSignUpLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(signUpData.username)) {
      setSignUpError("Username can only contain letters, numbers, underscore, dot, and hyphen (3-30 characters)");
      setSignUpLoading(false);
      return;
    }

    const passwordValidation = validatePassword(signUpData.password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      setSignUpError("Password does not meet security requirements");
      setSignUpLoading(false);
      return;
    }

    const pinValidation = validatePin(signUpData.transactionPin);
    if (!pinValidation.isValid) {
      setPinErrors(pinValidation.errors);
      setSignUpError("Transaction PIN does not meet requirements");
      setSignUpLoading(false);
      return;
    }

    if (signUpData.referralCode) {
      const referralRegex = /^BIL-[A-Z0-9]{6}$/;
      if (!referralRegex.test(signUpData.referralCode.toUpperCase())) {
        setSignUpError("Invalid referral code format. Use BIL-XXXXXX");
        setSignUpLoading(false);
        return;
      }
      
      if (referralValid === false) {
        setSignUpError("Referral code not found. Please check and try again.");
        setSignUpLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signUpData.username,
          email: signUpData.email,
          password: signUpData.password,
          pin: signUpData.transactionPin,
          fullName: signUpData.fullName,
          phone: signUpData.phone || undefined,
          userType: "END_USER",
          preferredChannel: "MOBILE_APP",
          referralCode: signUpData.referralCode?.toUpperCase() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      const signInResult = await signIn("credentials", {
        email: signUpData.email,
        password: signUpData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/auth?registered=true");
        setSignUpLoading(false);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user) {
          const { role: userRole } = session.user;
          if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
            router.push("/admin");
          } else if (userRole === "DEVELOPER") {
            router.push("/developer/dashboard");
          } else {
            router.push(callbackUrl);
          }
        } else {
          router.push("/auth?registered=true");
        }
        setSignUpLoading(false);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setSignUpError(err.message);
      setSignUpLoading(false);
    }
  };

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpData({
      ...signUpData,
      [name]: value,
    });
    if (name === "password") {
      setPasswordErrors([]);
      setSignUpError("");
    }
    if (name === "transactionPin") {
      setPinErrors([]);
      setSignUpError("");
    }
    if (name === "referralCode") {
      setReferralValid(null);
    }
  };

  // ============================================
  // FORGOT PASSWORD HANDLERS
  // ============================================
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");

    if (!resetEmail) {
      setError("Please enter your registered email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset code");
      }

      setForgotStep("reset");
      setForgotSuccess("A password reset code has been sent to your email!");
      if (data.token) setOtpToken(data.token);
      setError("");

      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send reset code. Please try again.";
      setError(errorMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError("");
    setForgotSuccess("");
    setForgotLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend reset code");
      }

      setForgotSuccess("A new reset code has been sent to your email!");
      if (data.token) setOtpToken(data.token);

      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend code. Please try again.";
      setError(errorMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setResetPasswordErrors([]);

    if (!otp || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (otp.length !== 6) {
      setError("Reset code must be 6 digits");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setResetPasswordErrors(passwordValidation.errors);
      setError("Password does not meet security requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp,
          token: otpToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password");
      }

      if (response.ok && data.success) {
        setForgotStep(null);
        setResetEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpToken("");
        setShowNewPassword(false);
        setActiveTab("signin");
        setForgotSuccess("Password reset successful! Please sign in with your new password.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password. Please check your reset code and try again.";
      setError(errorMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setForgotStep(null);
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpToken("");
    setError("");
    setForgotSuccess("");
    setResendCooldown(0);
    setResetPasswordErrors([]);
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const rememberedIdentifier = localStorage.getItem("bilscore_remember_identifier");
    if (rememberedIdentifier) {
      setIdentifier(rememberedIdentifier);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (rememberMe && identifier) {
      localStorage.setItem("bilscore_remember_identifier", identifier);
    } else if (!rememberMe) {
      localStorage.removeItem("bilscore_remember_identifier");
    }
  }, [rememberMe, identifier]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        step={forgotStep}
        onClose={closeForgotPassword}
        onSendOtp={handleSendResetOtp}
        onResetPassword={handlePasswordReset}
        onResendOtp={handleResendOtp}
        loading={forgotLoading}
        error={error}
        success={forgotSuccess}
        resendCooldown={resendCooldown}
        resetEmail={resetEmail}
        setResetEmail={setResetEmail}
        otp={otp}
        setOtp={setOtp}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        resetPasswordErrors={resetPasswordErrors}
      />

      {/* Main Auth Page */}
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white lg:flex">
        {/* LEFT SIDE - Brand Story */}
        <div className="hidden lg:flex lg:w-1/2 lg:min-h-screen lg:sticky lg:top-0 lg:h-screen flex-col justify-start px-16 pt-20 pb-12 relative overflow-y-auto">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e293b]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1e293b]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%231e293b' stroke-opacity='0.1'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
            }}
          />

          <div className="relative z-10 max-w-lg">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center mb-12 group">
              <div className="w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/uploads/log-icon.jpeg"
                  alt="Bilscore"
                  className="h-10 w-10 object-cover rounded-lg"
                />
              </div>
              <span
                className="text-2xl font-bold tracking-tight text-[#1e293b] ml-1"
                style={{
                  fontFamily: "'Circular Std', 'Gilroy', 'Satoshi', 'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                bilscore
              </span>
            </Link>

            {/* Hero Text */}
            <div className="space-y-4 mb-8">
              <h1 className="text-4xl font-bold text-[#1e293b] leading-tight">
                Your Everyday Payments,
                <span className="block text-gray-400">Simplified</span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed">
                A smarter way to manage bills, airtime, data, and recurring payments all in one place. 
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#1e293b]/5 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-[#1e293b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e293b]">WhatsApp Payments</p>
                  <p className="text-xs text-gray-400">Pay directly in chat</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#1e293b]/5 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-[#1e293b]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e293b]">Schedule Bills</p>
                  <p className="text-xs text-gray-400">Schedule and pay when you want</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#1e293b]/5 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-[#1e293b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e293b]">Mobile App</p>
                  <p className="text-xs text-gray-400">iOS & Android</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#1e293b]/5 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-[#1e293b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e293b]">Multi-Network</p>
                  <p className="text-xs text-gray-400">MTN, Glo, Airtel, 9mobile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8 min-h-screen overflow-y-auto">
          <div className="w-full max-w-sm py-4">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 bg-[#1e293b] rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-base">B</span>
                </div>
                <span className="text-2xl font-bold text-[#1e293b]">bilscore</span>
              </div>
              <p className="text-center text-sm text-gray-500">
                {activeTab === "signin" ? "Welcome back" : "Create your account"}
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100">
              {/* Toggle */}
              <div className="flex gap-1.5 mb-6 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === "signin"
                      ? "bg-[#1e293b] text-white shadow-sm"
                      : "text-gray-500 hover:text-[#1e293b]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === "signup"
                      ? "bg-[#1e293b] text-white shadow-sm"
                      : "text-gray-500 hover:text-[#1e293b]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Social Buttons - Now renders nothing */}
              <SocialButtons
                isLoading={loading || signUpLoading || socialLoading}
                setIsLoading={setSocialLoading}
                setError={setError}
              />

              {/* Referral Banner */}
              {isFromReferral && showReferralBanner && referralValid && (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                      <Gift className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">
                        🎉 You were referred by <span className="font-bold">{referrerName || "a friend"}</span>!
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Sign up now and you'll both earn <span className="font-bold">₦50</span> bonus!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {shareSuccess && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Link shared successfully!
                  </p>
                </div>
              )}

              {copied && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Referral link copied to clipboard!
                  </p>
                </div>
              )}

              {(error || signUpError) && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-rose-500 mr-3 flex-shrink-0" />
                    <p className="text-sm font-medium text-rose-800">{error || signUpError}</p>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* SIGN IN FORM - With welcome message */}
              {/* ========================================== */}
              {activeTab === "signin" && (
                <>
                  {/* Welcome Message */}
                  <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-[#1e293b]">Welcome Back </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Sign in to continue managing your payments</p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                        Email / Username / Phone
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50"
                          placeholder="Email, username, or phone number"
                          required
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Enter your email address, username, or phone number
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-[#1e293b]">Password</label>
                        <button
                          type="button"
                          onClick={() => setForgotStep("email")}
                          className="text-xs font-medium text-[#1e293b] hover:text-[#0f172a] transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-[#1e293b] focus:ring-[#1e293b] border-gray-300 rounded"
                      />
                      <label htmlFor="remember" className="ml-2 text-sm text-gray-500">Remember me</label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || socialLoading}
                      className="w-full py-3 px-4 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Sign In"}
                    </button>

                    <div className="text-center">
                      <span className="text-sm text-gray-400">Don't have an account? </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("signup")}
                        className="text-sm font-medium text-[#1e293b] hover:underline"
                      >
                        Sign up free
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ========================================== */}
              {/* SIGN UP FORM - With welcome message */}
              {/* ========================================== */}
              {activeTab === "signup" && (
                <>
                  {/* Welcome Message */}
                  <div className="mb-5 text-center">
                    <h2 className="text-xl font-bold text-[#1e293b]">Create Your Account </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Start managing your bills, airtime, and data in minutes</p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="username"
                          value={signUpData.username}
                          onChange={handleSignUpChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                          placeholder="johndoe"
                          minLength={3}
                          maxLength={30}
                          pattern="[a-zA-Z0-9_.-]{3,30}"
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Letters, numbers, underscore, dot, hyphen (3-30 chars)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={signUpData.fullName}
                        onChange={handleSignUpChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={signUpData.email}
                          onChange={handleSignUpChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={signUpData.phone}
                          onChange={handleSignUpChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                          placeholder="08012345678"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showSignUpPassword ? "text" : "password"}
                          name="password"
                          value={signUpData.password}
                          onChange={handleSignUpChange}
                          required
                          className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showSignUpPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={signUpData.password} />
                      {passwordErrors.length > 0 && (
                        <div className="mt-1 p-2 bg-rose-50 rounded-lg">
                          <p className="text-xs font-medium text-rose-700 mb-0.5">Password requirements:</p>
                          <ul className="text-xs text-rose-600 space-y-0">
                            {passwordErrors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Transaction PIN */}
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">
                        Transaction PIN <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showSignUpPin ? "text" : "password"}
                          name="transactionPin"
                          value={signUpData.transactionPin}
                          onChange={handleSignUpChange}
                          required
                          maxLength={6}
                          className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 text-sm"
                          placeholder="••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPin(!showSignUpPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showSignUpPin ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-[#1e293b]" />}
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        4-6 digit numeric PIN for transaction confirmations
                      </p>
                      {pinErrors.length > 0 && (
                        <div className="mt-1 p-2 bg-rose-50 rounded-lg">
                          <p className="text-xs font-medium text-rose-700 mb-0.5">PIN requirements:</p>
                          <ul className="text-xs text-rose-600 space-y-0">
                            {pinErrors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Referral Code Input */}
                    <div>
                      <label className="block text-sm font-medium text-[#1e293b] mb-1">
                        Referral Code <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="referralCode"
                          value={signUpData.referralCode}
                          onChange={handleSignUpChange}
                          className={`w-full pl-10 pr-12 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1e293b] focus:border-transparent transition-all duration-200 bg-white/50 uppercase text-sm ${
                            referralValid === true
                              ? "border-emerald-400 bg-emerald-50/30"
                              : referralValid === false
                              ? "border-rose-400 bg-rose-50/30"
                              : "border-gray-200"
                          }`}
                          placeholder="BIL-XXXXXX"
                          maxLength={10}
                        />
                        {referralChecking && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                        )}
                        {referralValid === true && !referralChecking && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        )}
                        {referralValid === false && !referralChecking && signUpData.referralCode && (
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500" />
                        )}
                      </div>

                      {referralValid === true && (
                        <div className="mt-1 p-1.5 bg-emerald-50 rounded-lg">
                          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                             Valid referral code from <span className="font-medium">{referrerName || "a friend"}</span>! You'll both earn <span className="font-bold">₦50</span> bonus.
                          </p>
                        </div>
                      )}
                      {referralValid === false && signUpData.referralCode && (
                        <p className="mt-0.5 text-xs text-rose-600 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                           Invalid referral code. Please check and try again.
                        </p>
                      )}
                      {!signUpData.referralCode && !isFromReferral && (
                        <p className="mt-0.5 text-xs text-gray-400 flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5" />
                          Got a referral code? Enter it here to earn rewards!
                        </p>
                      )}
                      {!signUpData.referralCode && isFromReferral && (
                        <p className="mt-0.5 text-xs text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Referral code from your invite has been auto-filled! 🎉
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={signUpLoading || socialLoading}
                      className="w-full py-2.5 px-4 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {signUpLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Create Account"}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                      By registering, you agree to our Terms of Service and Privacy Policy.
                    </p>

                    <div className="text-center">
                      <span className="text-sm text-gray-400">Already have an account? </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("signin")}
                        className="text-sm font-medium text-[#1e293b] hover:underline"
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Bilscore. All rights reserved.
              </p>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
                <Link href="/privacy" className="hover:text-[#1e293b] transition-colors">Privacy Policy</Link>
                <span className="w-px h-3 bg-gray-300" />
                <Link href="/terms" className="hover:text-[#1e293b] transition-colors">Terms of Service</Link>
                <span className="w-px h-3 bg-gray-300" />
                <Link href="/support" className="hover:text-[#1e293b] transition-colors">Support</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInFromTop {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeIn 0.3s ease-out forwards; }
        .slide-in-from-top-2 { animation: slideInFromTop 0.4s ease-out forwards; }
      `}</style>
    </>
  );
}