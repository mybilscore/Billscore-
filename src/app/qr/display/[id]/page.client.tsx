// app/qr/display/[id]/page.client.tsx - DARKER TEXT FOR THERMAL PRINTING

"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import {
  Shield,
  Phone,
  Mail,
  Printer,
} from "lucide-react";
import { generateQRUrl } from "~/lib/qr-hash";

interface QRDisplayClientProps {
  identifier: string;
  type: string;
  provider: string;
  meterNumber: string;
  buyNowLink: string;
  supportPhone: string;
  supportEmail: string;
  supportWebsite: string;
  hash: string;
  expiresAt?: string;
}

export function QRDisplayClient({
  identifier,
  type,
  provider,
  meterNumber,
  buyNowLink,
  supportPhone,
  supportEmail,
  supportWebsite,
  hash,
  expiresAt,
}: QRDisplayClientProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  };

  // ✅ Generate QR value for the Buy Now link
  const qrValue = generateQRUrl(getBaseUrl(), {
    identifier: identifier,
    type: type.toLowerCase(),
    provider: provider,
  });

  const urlParams = new URLSearchParams(qrValue.split('?')[1]);
  const hashShort = urlParams.get('h')?.substring(0, 8) || '';

  const handlePrint = () => {
    window.print();
  };

  // ✅ Check if expired
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 print:p-2">
      <div className="w-full max-w-sm bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none p-4 print:p-3 border print:border-2 print:border-black">
        
        {/* ⚠️ Expired Badge */}
        {isExpired && (
          <div className="mb-2 bg-red-600 border-2 border-red-800 rounded-lg p-1.5 text-center print:mb-1">
            <p className="text-[10px] font-bold text-white uppercase tracking-wider print:text-[8px]">
              ⚠️ This QR code has expired
            </p>
          </div>
        )}

        {/* ✅ QR Code - MAXIMUM SIZE */}
        <div ref={qrRef} className="flex justify-center mb-3 print:mb-2">
          <div className="rounded-xl border-2 border-gray-300 bg-white p-3 print:border-4 print:border-black">
            {qrValue && (
              <QRCode
                value={qrValue}
                size={300}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
            )}
          </div>
        </div>

        {/* ✅ Meter Number - Darker */}
        <div className="text-center mb-2 print:mb-1.5">
          <div className="bg-gray-100 rounded-lg py-1.5 px-3 print:bg-transparent print:border-2 print:border-black">
            <p className="text-[10px] text-gray-600 print:text-[8px] uppercase tracking-wider font-semibold">Meter Number</p>
            <p className="text-lg font-mono font-bold text-black print:text-black tracking-wider">
              {meterNumber}
            </p>
          </div>
        </div>

        {/* ✅ Provider - Darker */}
        <div className="text-center mb-2 print:mb-1.5">
          <p className="text-xs font-semibold text-gray-800 print:text-black">
            {provider}
          </p>
        </div>

        {/* QR Code ID / Hash - Darker */}
        <div className="text-center mb-2 print:mb-1.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 print:text-black bg-gray-50 px-2 py-0.5 rounded-full print:bg-transparent print:border print:border-black">
            <Shield className="h-2.5 w-2.5 text-gray-700 print:text-black" />
            <span className="font-mono font-medium text-gray-700 print:text-black">#{hashShort}</span>
            {!isExpired && (
              <>
                <span className="w-px h-2.5 bg-gray-400 print:bg-black" />
                <span className="text-green-700 font-bold print:text-black">● Valid</span>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 my-2 print:my-1.5 print:border-black" />

        {/* ✅ Bilscore Branding - Darker */}
        <div className="text-center mb-2 print:mb-1.5">
          <div className="flex items-center justify-center gap-2">
            <div className="h-6 w-6 rounded-full bg-[#1e293b] flex items-center justify-center print:h-5 print:w-5 print:border-2 print:border-black print:bg-white">
              <span className="text-white text-xs font-bold print:text-black print:text-[10px]">B</span>
            </div>
            <span className="text-base font-bold text-gray-900 print:text-black tracking-tight">Bilscore</span>
            <span className="text-[10px] text-gray-500 print:text-black">|</span>
            <span className="text-[10px] font-medium text-gray-700 print:text-black">Pay Your Bill</span>
          </div>
        </div>

        {/* ✅ Support / Contact Information - Darker */}
        <div className="text-center space-y-0.5 print:space-y-0 bg-gray-50 rounded-lg p-1.5 print:bg-transparent print:p-0">
          <p className="text-[10px] font-semibold text-gray-700 print:text-black">
            📞 Need help? Contact us:
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-gray-800 print:text-black">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-700 print:text-black" />
              {supportPhone}
            </span>
            <span className="w-px h-3 bg-gray-400 print:bg-black" />
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-gray-700 print:text-black" />
              {supportEmail}
            </span>
          </div>
          <p className="text-[10px] font-medium text-gray-600 print:text-black">
            {supportWebsite}
          </p>
        </div>

        {/* ✅ Footer - Scan to pay - Darker */}
        <div className="mt-2 pt-1.5 border-t border-gray-300 text-center print:mt-1.5 print:pt-1 print:border-black">
          <p className="text-xs font-bold text-gray-800 print:text-black">
            📱 Scan to Pay
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[8px] font-medium text-gray-600 print:text-black flex items-center gap-0.5">
              <span>🔒</span> Secured
            </span>
            <span className="w-px h-2.5 bg-gray-400 print:bg-black" />
            <span className="text-[8px] font-medium text-gray-600 print:text-black flex items-center gap-0.5">
              <span>⚡</span> Instant
            </span>
            <span className="w-px h-2.5 bg-gray-400 print:bg-black" />
            <span className="text-[8px] font-medium text-gray-600 print:text-black flex items-center gap-0.5">
              <span>📱</span> QR Payment
            </span>
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="mt-3 w-full rounded-lg bg-[#1e293b] py-2.5 text-sm font-semibold text-white hover:bg-[#0f172a] transition-colors flex items-center justify-center gap-2 print:hidden shadow-lg"
        >
          <Printer className="h-4 w-4" />
          Print QR Code
        </button>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:p-2 {
            padding: 8px !important;
          }
          .print\\:p-3 {
            padding: 12px !important;
          }
          .print\\:mb-2 {
            margin-bottom: 8px !important;
          }
          .print\\:mb-1 {
            margin-bottom: 4px !important;
          }
          .print\\:mb-1\\.5 {
            margin-bottom: 6px !important;
          }
          .print\\:mt-2 {
            margin-top: 8px !important;
          }
          .print\\:mt-1 {
            margin-top: 4px !important;
          }
          .print\\:mt-1\\.5 {
            margin-top: 6px !important;
          }
          .print\\:pt-1 {
            padding-top: 4px !important;
          }
          .print\\:text-base {
            font-size: 16px !important;
          }
          .print\\:text-sm {
            font-size: 14px !important;
          }
          .print\\:text-xs {
            font-size: 12px !important;
          }
          .print\\:text-\\[10px\\] {
            font-size: 10px !important;
          }
          .print\\:text-\\[8px\\] {
            font-size: 8px !important;
          }
          .print\\:text-\\[6px\\] {
            font-size: 6px !important;
          }
          .print\\:h-5 {
            height: 20px !important;
          }
          .print\\:w-5 {
            width: 20px !important;
          }
          .print\\:border-2 {
            border-width: 2px !important;
          }
          .print\\:border-4 {
            border-width: 4px !important;
          }
          .print\\:border-black {
            border-color: black !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:bg-transparent {
            background: transparent !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-gray-400 {
            color: #9ca3af !important;
          }
          .print\\:text-gray-500 {
            color: #6b7280 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          .print\\:text-gray-900 {
            color: #111827 !important;
          }
          .print\\:text-green-700 {
            color: #15803d !important;
          }
          .print\\:text-red-700 {
            color: #b91c1c !important;
          }
          .print\\:text-white {
            color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border {
            border-width: 1px !important;
          }
          .print\\:bg-red-600 {
            background: #dc2626 !important;
          }
          .print\\:border-red-800 {
            border-color: #991b1b !important;
          }
          .print\\:bg-gray-50 {
            background: #f9fafb !important;
          }
          .print\\:bg-gray-100 {
            background: #f3f4f6 !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:gap-1 {
            gap: 4px !important;
          }
          .print\\:gap-0\\.5 {
            gap: 2px !important;
          }
          .print\\:h-2\\.5 {
            height: 10px !important;
          }
          .print\\:w-2\\.5 {
            width: 10px !important;
          }
          .print\\:h-3 {
            height: 12px !important;
          }
          .print\\:w-3 {
            width: 12px !important;
          }
          .print\\:font-medium {
            font-weight: 500 !important;
          }
          .print\\:font-semibold {
            font-weight: 600 !important;
          }
          .print\\:font-bold {
            font-weight: 700 !important;
          }
        }
      `}</style>
    </div>
  );
}