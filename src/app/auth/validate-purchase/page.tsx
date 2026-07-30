// app/auth/validate-purchase/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { verify } from "jsonwebtoken";
import { Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ValidatePurchasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid validation link");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-token?token=${token}`);
        const data = await response.json();
        
        if (data.success) {
          setTokenValid(true);
          setTransactionData(data.transaction);
        } else {
          setTokenValid(false);
          setError(data.error || "Invalid or expired link");
        }
      } catch (error) {
        setTokenValid(false);
        setError("Failed to validate link");
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!pin || pin.length < 4 || pin.length > 6) {
      setError("Please enter a valid PIN (4-6 digits)");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/confirm-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Validation failed");
      }

      setSuccess(true);
      
      // Redirect to success page after 3 seconds
      setTimeout(() => {
        router.push("/dashboard/transactions");
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
            Invalid or Expired Link
          </h2>
          <p className="text-center text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!tokenValid && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          </div>
          <p className="text-center text-gray-600 mt-4">Validating your session...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center text-green-500 mb-4">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
            ✅ Purchase Confirmed!
          </h2>
          <p className="text-center text-gray-600">
            Your transaction has been completed successfully.
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Redirecting to transactions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center text-blue-600 mb-4">
          <Lock className="h-12 w-12" />
        </div>
        
        <h2 className="text-xl font-bold text-center text-gray-800">
          Confirm Your Purchase
        </h2>
        
        {transactionData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Service:</span> {transactionData.serviceType}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Amount:</span> ₦{transactionData.amount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Recipient:</span> {transactionData.recipient}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              This link expires in 5 minutes
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Your Transaction PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="••••"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 text-center">
              Enter your 4-6 digit PIN
            </p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Validating...
              </>
            ) : (
              "Confirm Purchase"
            )}
          </button>

          <p className="mt-3 text-xs text-gray-400 text-center">
            Your PIN is encrypted and never stored in plain text
          </p>
        </form>
      </div>
    </div>
  );
}