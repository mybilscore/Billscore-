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
  };
}

export default async function QRDisplayPage({ params, searchParams }: QRDisplayPageProps) {
  const { id } = params;
  const { t: type, p: provider, h: hash, e: expiresAt } = searchParams;

  console.log("🔍 [QR Display] Params:", { id, type, provider, hash, expiresAt });

  // ✅ Validate required parameters
  if (!id || id === "undefined") {
    console.error("❌ [QR Display] Invalid ID:", id);
    redirect("/");
  }

  if (!type || !provider || !hash) {
    console.error("❌ [QR Display] Missing required parameters:", { type, provider, hash });
    redirect("/");
  }

  // ✅ Verify the QR hash using the same function as Buy Now
  const isValid = verifyQRHash({
    identifier: id,
    type: type,
    provider: provider,
    hash: hash,
    expiresAt: expiresAt || undefined,
  });

  if (!isValid) {
    console.error("❌ [QR Display] Invalid QR hash");
    notFound();
  }

  // ✅ Build the buy-now link (what the QR code points to)
  const buyNowLink = `/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}${expiresAt ? `&e=${expiresAt}` : ''}`;

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
    />
  );
}