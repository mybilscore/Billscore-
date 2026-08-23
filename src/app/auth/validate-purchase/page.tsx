// app/auth/validate-purchase/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Lock, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

function ValidatePurchaseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid validation link");
      setVerifying(false);
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
      } finally {
        setVerifying(false);
      }
    };

    validateToken();
  }, [token]);

  // Get service icon
  const getServiceIcon = (type: string) => {
    const icons: Record<string, string> = {
      'AIRTIME': '📱',
      'DATA': '📶',
      'ELECTRICITY_INSTANT': '⚡',
      'ELECTRICITY_PREORDER': '⚡',
      'CABLE_TV': '📺',
      'EDUCATION': '🎓',
    };
    return icons[type] || '🛍️';
  };

  // Close window and go to bilscore.com
  const closeToBilscore = () => {
    // Try to close the window/tab
    window.close();
    
    // Fallback: redirect to bilscore.com after a short delay
    setTimeout(() => {
      window.location.href = 'https://bilscore.com';
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!pin || pin.length < 4) {
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
      
      // Close to bilscore.com after 3 seconds
      setTimeout(() => {
        closeToBilscore();
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Validating your session...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={closeToBilscore}
            className="float-right text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
            Invalid or Expired Link
          </h2>
          <p className="text-center text-gray-600">{error}</p>
          <button
            onClick={closeToBilscore}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Bilscore
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={closeToBilscore}
            className="float-right text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center text-green-500 mb-4">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
            ✅ Purchase Confirmed!
          </h2>
          <p className="text-center text-gray-600">
            Your transaction has been completed successfully.
          </p>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">
              A confirmation message has been sent to your WhatsApp.
            </p>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Closing in 3 seconds...
          </p>
          <button
            onClick={closeToBilscore}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={closeToBilscore}
          className="float-right text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex items-center justify-center text-blue-600 mb-4">
          <Lock className="h-12 w-12" />
        </div>
        
        <h2 className="text-xl font-bold text-center text-gray-800">
          Confirm Your Purchase
        </h2>
        
        <p className="text-center text-sm text-gray-500 mt-1">
          Enter your PIN to complete the transaction
        </p>
        
        {transactionData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getServiceIcon(transactionData.transactionType)}</span>
              <span className="text-sm font-medium text-gray-700">{transactionData.serviceType}</span>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Amount:</span> NGN {Number(transactionData.amount || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Recipient:</span> {transactionData.recipient || "N/A"}
            </p>
            {transactionData.details && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                {Object.entries(transactionData.details).map(([key, value]) => (
                  <p key={key}>
                    <span className="font-medium">{key}:</span> {String(value)}
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-red-400 mt-2">
              ⏰ This link expires in 5 minutes
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
            🔐 Your PIN is encrypted and never stored in plain text
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ValidatePurchasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ValidatePurchaseContent />
    </Suspense>
  );
}