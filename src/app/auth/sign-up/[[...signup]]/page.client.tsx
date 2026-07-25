// emap/src/app/auth/sign-up/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function SignUpPageClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    party_type: "INDIVIDUAL",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      console.log("📝 EMAP: Registering user:", formData.email);
      
      // 1. Register the user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          party_type: formData.party_type,
          registration_source: "EMAP_SELF",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      console.log("✅ EMAP: Registration successful:", result);

      // 2. Automatically sign in the user
      console.log("🔐 EMAP: Auto-logging in user:", formData.email);
      
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false, // Don't redirect yet, we'll handle it manually
      });

      if (signInResult?.error) {
        console.error("❌ EMAP: Auto-login failed:", signInResult.error);
        // If auto-login fails, redirect to sign-in page with the slug
        router.push(`/auth/sign-in?registered=true&slug=${result.data.slug}`);
      } else {
        console.log("✅ EMAP: Auto-login successful, redirecting to profile completion");
        
        // Get the session to confirm login
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user) {
    console.log("👤 EMAP: User session established:", session.user.email);
    const { partyStatus, isSuperAdmin, slug } = session.user;
    
    // SUPER ADMIN CHECK - THIS MUST COME FIRST
    if (isSuperAdmin) {
      console.log("👑 Super admin detected, redirecting to admin dashboard");
      router.push("/admin/dashboard");
    }
    // If profile is pending, go to slug with modal
    else if (partyStatus === "PENDING_PROFILE") {
      router.push(`/${slug}?completeProfile=true`);
    } else {
      router.push(`/${slug}`);
    }
  } else {
    router.push(`/auth/sign-in?registered=true`);
  }

      }

    } catch (err: any) {
      console.error("💥 EMAP: Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">Create EMAP Account</h2>
          <p className="text-center text-gray-600 mt-2">
            Register to manage your farms and operations
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Party Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                I am registering as
              </label>
              <select
                name="party_type"
                value={formData.party_type}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="INDIVIDUAL">Individual Farmer</option>
                <option value="ORGANIZATION">Organization/Company</option>
                <option value="COMMUNITY">Community</option>
              </select>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.party_type === "INDIVIDUAL" ? "Full Name" : 
                 formData.party_type === "ORGANIZATION" ? "Organization Name" : 
                 "Community Name"}
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={formData.party_type === "INDIVIDUAL" ? "John Doe" : "Your Business/Community Name"}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+234 800 000 0000"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-600">Already have an account?</span>{" "}
          <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>

        <div className="text-center text-xs text-gray-500">
          By registering, you become the administrator of your account.
          You can later add team members with different roles.
        </div>
      </div>
    </div>
  );
}