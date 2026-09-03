// app/qr/display/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { QRDisplayClient } from "./page.client";
import { verifyQRHash } from "~/lib/qr-hash";

interface QRDisplayPageProps {
  params: {
    id: string;
  };
  searchParams: {
    t?: string;
    p?: string;
    h?: string;
    e?: string;
    u?: string; // ✅ userId
  };
}

export default async function QRDisplayPage({ params, searchParams }: QRDisplayPageProps) {
  const { id } = params;
  const { t: type, p: provider, h: hash, e: expiresAt, u: userId } = searchParams;

  console.log("🔍 [QR Display] Params:", { id, type, provider, hash, expiresAt, userId });

  // ✅ Validate required parameters
  if (!id || id === "undefined") {
    console.error("❌ [QR Display] Invalid ID:", id);
    redirect("/");
  }

  if (!type || !provider || !hash || !userId) {
    console.error("❌ [QR Display] Missing required parameters:", { type, provider, hash, userId });
    redirect("/");
  }

  // ✅ Verify the QR hash using userId
  const isValid = verifyQRHash({
    identifier: id,
    type: type,
    provider: provider,
    userId: userId, // ✅ Include userId in verification
    hash: hash,
  });

  if (!isValid) {
    console.error("❌ [QR Display] Invalid QR hash");
    notFound();
  }

  // ✅ Build the buy-now link with userId
  const buyNowLink = `/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}&u=${userId}${expiresAt ? `&e=${expiresAt}` : ''}`;

  // ✅ Support contact info
  const supportInfo = {
    phone: "+234 800 000 0000",
    email: "support@bilscore.com",
    website: "bilscore.com",
  };

  console.log("✅ [QR Display] Rendering QR page for meter:", id);

  return (
    <QRDisplayClient
      identifier={id}
      type={type}
      provider={provider}
      meterNumber={id}
      buyNowLink={buyNowLink}
      supportPhone={supportInfo.phone}
      supportEmail={supportInfo.email}
      supportWebsite={supportInfo.website}
      hash={hash}
      expiresAt={expiresAt || undefined}
      userId={userId} // ✅ Pass userId to client
    />
  );
}