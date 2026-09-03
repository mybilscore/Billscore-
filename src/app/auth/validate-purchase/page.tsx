// app/auth/validate-purchase/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { Lock, CheckCircle, AlertCircle, Loader2, X, Shield, Zap, Tv, Phone, Wifi, GraduationCap } from "lucide-react";

// ✅ LOADING MODAL WITH ANIMATED LOGO
const LoadingModal = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <div className="relative h-24 w-24 rounded-full bg-white shadow-2xl flex items-center justify-center animate-pulse border-2 border-gray-200/50">
            <div className="relative h-16 w-16">
              <Image
                src="/uploads/log-icon.jpeg"
                alt="Bilscore"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-xl font-semibold text-white">Processing...</h3>
          <p className="mt-2 text-sm text-gray-300">Please wait while we complete your transaction</p>
        </div>

        <div className="mt-4 flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce" />
        </div>
      </div>
    </div>
  );
};

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
  const [showLoadingModal, setShowLoadingModal] = useState(false);

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

  // Get service icon and color
  const getServiceInfo = (type: string) => {
    const services: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      'AIRTIME': { 
        icon: Phone, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'Airtime'
      },
      'DATA': { 
        icon: Wifi, 
        color: 'text-purple-600', 
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        label: 'Data'
      },
      'ELECTRICITY_INSTANT': { 
        icon: Zap, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        label: 'Electricity'
      },
      'ELECTRICITY_PREORDER': { 
        icon: Zap, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        label: 'Electricity'
      },
      'CABLE_TV': { 
        icon: Tv, 
        color: 'text-red-600', 
        bg: 'bg-red-100 dark:bg-red-900/30',
        label: 'Cable TV'
      },
      'EDUCATION': { 
        icon: GraduationCap, 
        color: 'text-green-600', 
        bg: 'bg-green-100 dark:bg-green-900/30',
        label: 'Education'
      },
    };
    return services[type] || { 
      icon: Lock, 
      color: 'text-[#1e293b]', 
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: 'Purchase'
    };
  };

  // Close window and go to bilscore.com
  const closeToBilscore = () => {
    window.close();
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

    setShowLoadingModal(true);

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

      setShowLoadingModal(false);

      if (!response.ok) {
        throw new Error(data.error || "Validation failed");
      }

      setSuccess(true);
      
      setTimeout(() => {
        closeToBilscore();
      }, 3000);

    } catch (err: any) {
      setShowLoadingModal(false);
      setError(err.message);
      setLoading(false);
    }
  };

  // Verifying state
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="relative h-20 w-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#1e293b]/10 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-gray-200/50">
              <Image
                src="/uploads/log-icon.jpeg"
                alt="Bilscore"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          </div>
          <Loader2 className="h-6 w-6 text-[#1e293b] animate-spin mx-auto mt-4" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Validating your session...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <button
            onClick={closeToBilscore}
            className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center text-red-500 mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Invalid or Expired Link
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={closeToBilscore}
            className="mt-4 w-full py-3 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-colors font-medium"
          >
            Go to Bilscore
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    const serviceInfo = transactionData?.transactionType ? getServiceInfo(transactionData.transactionType) : getServiceInfo('');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
          <button
            onClick={closeToBilscore}
            className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
            ✅ Purchase Confirmed!
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Your transaction has been completed successfully.
          </p>
          
          {transactionData && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-full ${serviceInfo.bg} flex items-center justify-center`}>
                  {serviceInfo.icon && <serviceInfo.icon className={`h-5 w-5 ${serviceInfo.color}`} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{serviceInfo.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transactionData.serviceType || transactionData.transactionType}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Amount:</span> NGN {Number(transactionData.amount || 0).toFixed(2)}
                </p>
                {transactionData.recipient && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Recipient:</span> {transactionData.recipient}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 text-center">
              ✅ A confirmation message has been sent to your WhatsApp
            </p>
          </div>
          
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Closing in 3 seconds...
          </p>
          <button
            onClick={closeToBilscore}
            className="mt-4 w-full py-3 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Main PIN entry form
  const serviceInfo = transactionData?.transactionType ? getServiceInfo(transactionData.transactionType) : getServiceInfo('');
  const ServiceIcon = serviceInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      {/* Loading Modal */}
      <LoadingModal isOpen={showLoadingModal} />

      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <button
          onClick={closeToBilscore}
          className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-3 overflow-hidden bg-white">
            <Image
              src="/uploads/log-icon.jpeg"
              alt="Bilscore Logo"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Confirm Your Purchase
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your PIN to complete the transaction
          </p>
        </div>
        
        {/* Transaction Details */}
        {transactionData && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-full ${serviceInfo.bg} flex items-center justify-center`}>
                {ServiceIcon && <ServiceIcon className={`h-5 w-5 ${serviceInfo.color}`} />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{serviceInfo.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {transactionData.serviceType || transactionData.transactionType}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600 dark:text-gray-400 flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Amount:</span>
                <span className="font-bold text-[#1e293b] dark:text-white">NGN {Number(transactionData.amount || 0).toFixed(2)}</span>
              </p>
              {transactionData.recipient && (
                <p className="text-gray-600 dark:text-gray-400 flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recipient:</span>
                  <span>{transactionData.recipient}</span>
                </p>
              )}
            </div>
            {transactionData.details && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                {Object.entries(transactionData.details).map(([key, value]) => (
                  <p key={key} className="flex justify-between">
                    <span className="font-medium">{key}:</span>
                    <span>{String(value)}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-red-400 dark:text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              ⏰ This link expires in 5 minutes
            </p>
          </div>
        )}

        {/* PIN Form */}
        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Your Transaction PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                maxLength={6}
                className={`w-full pl-10 pr-4 py-3 text-center text-2xl tracking-[0.5em] border ${error ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                placeholder="••••"
                autoFocus
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              Enter your 4-6 digit PIN
            </p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3 bg-[#1e293b] text-white rounded-xl hover:bg-[#0f172a] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-lg shadow-[#1e293b]/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Validating...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </button>

          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Your PIN is encrypted and never stored in plain text
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ValidatePurchasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="relative h-20 w-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#1e293b]/10 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-gray-200/50">
              <Image
                src="/uploads/log-icon.jpeg"
                alt="Bilscore"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          </div>
          <Loader2 className="h-6 w-6 text-[#1e293b] animate-spin mx-auto mt-4" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ValidatePurchaseContent />
    </Suspense>
  );
}