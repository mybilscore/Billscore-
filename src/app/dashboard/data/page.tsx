// app/dashboard/buy/data/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// Helper function to get provider data with plans organized by categories
const getProviders = () => {
  return [
    {
      id: "mtn",
      name: "MTN",
      code: "MTN",
      color: "#FFC000",
      iconPath: "/networks/mtn.jpg",
      categories: [
        {
          id: "sme",
          name: "SME",
          plans: [
            { id: "mtn-sme-315", name: "1GB", data: "1GB", price: 530, validity: "30 days", planCode: "315" },
            { id: "mtn-sme-316", name: "1GB", data: "1GB", price: 250, validity: "1 day", planCode: "316" },
            { id: "mtn-sme-317", name: "2.5GB", data: "2.5GB", price: 580, validity: "1 day", planCode: "317" },
            { id: "mtn-sme-318", name: "5GB", data: "5GB", price: 1500, validity: "14-20 days", planCode: "318" },
            { id: "mtn-sme-319", name: "1GB", data: "1GB", price: 220, validity: "1 day", planCode: "319" },
            { id: "mtn-sme-320", name: "2GB", data: "2GB", price: 450, validity: "1 day", planCode: "320" },
            { id: "mtn-sme-321", name: "3GB", data: "3GB", price: 650, validity: "1 day", planCode: "321" },
            { id: "mtn-sme-36", name: "500MB", data: "500MB", price: 330, validity: "30 days", planCode: "36" },
            { id: "mtn-sme-37", name: "1GB", data: "1GB", price: 430, validity: "7-30 days", planCode: "37" },
            { id: "mtn-sme-38", name: "2GB", data: "2GB", price: 1000, validity: "30 days", planCode: "38" },
            { id: "mtn-sme-39", name: "3GB", data: "3GB", price: 1500, validity: "1 Month", planCode: "39" },
            { id: "mtn-sme-40", name: "5GB", data: "5GB", price: 2500, validity: "30 days", planCode: "40" },
            { id: "mtn-sme-41", name: "10GB", data: "10GB", price: 5000, validity: "30 days", planCode: "41" },
          ]
        },
        {
          id: "gifting",
          name: "GIFTING",
          plans: [
            { id: "mtn-gift-262", name: "75MB", data: "75MB", price: 73.50, validity: "1 day", planCode: "262" },
            { id: "mtn-gift-265", name: "500MB", data: "500MB", price: 343, validity: "1 day", planCode: "265" },
            { id: "mtn-gift-266", name: "1GB", data: "1GB", price: 490, validity: "1 day", planCode: "266" },
            { id: "mtn-gift-267", name: "1.5GB", data: "1.5GB", price: 588, validity: "2 days", planCode: "267" },
            { id: "mtn-gift-268", name: "2GB", data: "2GB", price: 735, validity: "2 days", planCode: "268" },
            { id: "mtn-gift-269", name: "2.5GB", data: "2.5GB", price: 882, validity: "2 days", planCode: "269" },
            { id: "mtn-gift-270", name: "3.2GB", data: "3.2GB", price: 980, validity: "2 days", planCode: "270" },
            { id: "mtn-gift-271", name: "2GB", data: "2GB", price: 1470, validity: "30 days", planCode: "271" },
            { id: "mtn-gift-272", name: "2.7GB", data: "2.7GB", price: 1960, validity: "30 days", planCode: "272" },
            { id: "mtn-gift-273", name: "3.5GB", data: "3.5GB", price: 2450, validity: "30 days", planCode: "273" },
            { id: "mtn-gift-274", name: "3.5GB", data: "3.5GB", price: 1470, validity: "7 days", planCode: "274" },
            { id: "mtn-gift-275", name: "1.8GB", data: "1.8GB", price: 1470, validity: "30 days", planCode: "275" },
            { id: "mtn-gift-276", name: "7GB", data: "7GB", price: 3430, validity: "30 days", planCode: "276" },
            { id: "mtn-gift-277", name: "7GB", data: "7GB", price: 1764, validity: "2 days", planCode: "277" },
            { id: "mtn-gift-278", name: "5.5GB", data: "5.5GB", price: 2940, validity: "30 days", planCode: "278" },
            { id: "mtn-gift-279", name: "10GB", data: "10GB", price: 4410, validity: "30 days", planCode: "279" },
            { id: "mtn-gift-280", name: "11GB", data: "11GB", price: 3430, validity: "7 days", planCode: "280" },
            { id: "mtn-gift-281", name: "12.5GB", data: "12.5GB", price: 5390, validity: "30 days", planCode: "281" },
            { id: "mtn-gift-282", name: "14.5GB", data: "14.5GB", price: 4900, validity: "30 days", planCode: "282" },
            { id: "mtn-gift-283", name: "16.5GB", data: "16.5GB", price: 6370, validity: "30 days", planCode: "283" },
            { id: "mtn-gift-284", name: "20GB", data: "20GB", price: 7350, validity: "30 days", planCode: "284" },
            { id: "mtn-gift-285", name: "25GB", data: "25GB", price: 6860, validity: "30 days", planCode: "285" },
            { id: "mtn-gift-286", name: "25GB", data: "25GB", price: 8820, validity: "30 days", planCode: "286" },
            { id: "mtn-gift-287", name: "34GB", data: "34GB", price: 9800, validity: "30 days", planCode: "287" },
            { id: "mtn-gift-288", name: "36GB", data: "36GB", price: 10780, validity: "30 days", planCode: "288" },
            { id: "mtn-gift-289", name: "40GB", data: "40GB", price: 8820, validity: "60 days", planCode: "289" },
            { id: "mtn-gift-290", name: "65GB", data: "65GB", price: 15680, validity: "30 days", planCode: "290" },
            { id: "mtn-gift-291", name: "75GB", data: "75GB", price: 17600, validity: "30 days", planCode: "291" },
            { id: "mtn-gift-292", name: "90GB", data: "90GB", price: 24500, validity: "60 days", planCode: "292" },
            { id: "mtn-gift-293", name: "165GB", data: "165GB", price: 34300, validity: "30 days", planCode: "293" },
            { id: "mtn-gift-294", name: "250GB", data: "250GB", price: 53900, validity: "30 days", planCode: "294" },
            { id: "mtn-gift-295", name: "800GB", data: "800GB", price: 122500, validity: "1 year", planCode: "295" },
          ]
        },
        {
          id: "cooperate-gifting",
          name: "COOPERATE GIFTING",
          plans: [
            { id: "mtn-coop-46", name: "1GB", data: "1GB", price: 250, validity: "24 hours", planCode: "46" },
          ]
        }
      ]
    },
    {
      id: "glo",
      name: "GLO",
      code: "GLO",
      color: "#00843D",
      iconPath: "/networks/glo.jpg",
      categories: [
        {
          id: "sme",
          name: "SME",
          plans: [
            { id: "glo-sme-220", name: "500MB", data: "500MB", price: 190, validity: "14 days", planCode: "220" },
            { id: "glo-sme-221", name: "1GB", data: "1GB", price: 316, validity: "14 days", planCode: "221" },
            { id: "glo-sme-222", name: "1GB", data: "1GB", price: 280, validity: "3 days", planCode: "222" },
            { id: "glo-sme-223", name: "1GB", data: "1GB", price: 316, validity: "7 days", planCode: "223" },
            { id: "glo-sme-224", name: "3GB", data: "3GB", price: 840, validity: "3 days", planCode: "224" },
            { id: "glo-sme-225", name: "3GB", data: "3GB", price: 948, validity: "7 days", planCode: "225" },
            { id: "glo-sme-226", name: "3GB", data: "3GB", price: 948, validity: "14 days", planCode: "226" },
            { id: "glo-sme-227", name: "5GB", data: "5GB", price: 1400, validity: "3 days", planCode: "227" },
            { id: "glo-sme-228", name: "5GB", data: "5GB", price: 1580, validity: "7 days", planCode: "228" },
            { id: "glo-sme-229", name: "5GB", data: "5GB", price: 1580, validity: "14 days", planCode: "229" },
            { id: "glo-sme-230", name: "10GB", data: "10GB", price: 3160, validity: "14 days", planCode: "230" },
          ]
        },
        {
          id: "gifting",
          name: "GIFTING",
          plans: [
            { id: "glo-gift-298", name: "45MB", data: "45MB", price: 45, validity: "1 day", planCode: "298" },
            { id: "glo-gift-299", name: "100MB", data: "100MB", price: 98, validity: "1 day", planCode: "299" },
            { id: "glo-gift-300", name: "200MB", data: "200MB", price: 196, validity: "2 days", planCode: "300" },
            { id: "glo-gift-301", name: "1.5GB", data: "1.5GB", price: 294, validity: "1 day", planCode: "301" },
            { id: "glo-gift-302", name: "3GB", data: "3GB", price: 735, validity: "2 days", planCode: "302" },
            { id: "glo-gift-303", name: "2.5GB", data: "2.5GB", price: 490, validity: "2 days", planCode: "303" },
            { id: "glo-gift-304", name: "1.5GB", data: "1.5GB", price: 490, validity: "7 days", planCode: "304" },
            { id: "glo-gift-305", name: "2.6GB", data: "2.6GB", price: 980, validity: "30 days", planCode: "305" },
            { id: "glo-gift-306", name: "5GB", data: "5GB", price: 1470, validity: "30 days", planCode: "306" },
            { id: "glo-gift-307", name: "6.15GB", data: "6.15GB", price: 1960, validity: "30 days", planCode: "307" },
            { id: "glo-gift-308", name: "7.25GB", data: "7.25GB", price: 2450, validity: "30 days", planCode: "308" },
            { id: "glo-gift-309", name: "10GB", data: "10GB", price: 2940, validity: "30 days", planCode: "309" },
            { id: "glo-gift-310", name: "12.5GB", data: "12.5GB", price: 3920, validity: "30 days", planCode: "310" },
            { id: "glo-gift-311", name: "16GB", data: "16GB", price: 4900, validity: "30 days", planCode: "311" },
            { id: "glo-gift-312", name: "20GB", data: "20GB", price: 5880, validity: "30 days", planCode: "312" },
            { id: "glo-gift-314", name: "28GB", data: "28GB", price: 7840, validity: "30 days", planCode: "314" },
          ]
        },
        {
          id: "cooperate-gifting",
          name: "COOPERATE GIFTING",
          plans: [
            { id: "glo-coop-70", name: "200MB", data: "200MB", price: 90, validity: "30 days", planCode: "70" },
            { id: "glo-coop-71", name: "500MB", data: "500MB", price: 200, validity: "30 days", planCode: "71" },
            { id: "glo-coop-72", name: "1GB", data: "1GB", price: 410, validity: "30 days", planCode: "72" },
            { id: "glo-coop-73", name: "2GB", data: "2GB", price: 830, validity: "30 days", planCode: "73" },
            { id: "glo-coop-74", name: "3GB", data: "3GB", price: 1245, validity: "30 days", planCode: "74" },
            { id: "glo-coop-75", name: "5GB", data: "5GB", price: 2075, validity: "30 days", planCode: "75" },
            { id: "glo-coop-76", name: "10GB", data: "10GB", price: 4150, validity: "30 days", planCode: "76" },
          ]
        }
      ]
    },
    {
      id: "airtel",
      name: "AIRTEL",
      code: "AIRTEL",
      color: "#ED1B24",
      iconPath: "/networks/airtel.png",
      categories: [
        {
          id: "gifting",
          name: "GIFTING",
          plans: [
            { id: "airtel-gift-231", name: "10GB", data: "10GB", price: 3000, validity: "30 days", planCode: "231" },
            { id: "airtel-gift-232", name: "1GB", data: "1GB", price: 780, validity: "7 days", planCode: "232" },
            { id: "airtel-gift-233", name: "1GB", data: "1GB", price: 290, validity: "3 days", planCode: "233" },
            { id: "airtel-gift-234", name: "2GB", data: "2GB", price: 1425, validity: "30 days", planCode: "234" },
            { id: "airtel-gift-235", name: "500MB", data: "500MB", price: 490, validity: "7 days", planCode: "235" },
            { id: "airtel-gift-236", name: "3GB", data: "3GB", price: 1960, validity: "30 days", planCode: "236" },
            { id: "airtel-gift-237", name: "3GB", data: "3GB", price: 735, validity: "2 days", planCode: "237" },
            { id: "airtel-gift-238", name: "1.5GB", data: "1.5GB", price: 490, validity: "7 days", planCode: "238" },
            { id: "airtel-gift-239", name: "1.5GB", data: "1.5GB", price: 980, validity: "7 days", planCode: "239" },
            { id: "airtel-gift-240", name: "1.5GB", data: "1.5GB", price: 505, validity: "1 day", planCode: "240" },
            { id: "airtel-gift-241", name: "1.5GB", data: "1.5GB", price: 405, validity: "1 day", planCode: "241" },
            { id: "airtel-gift-242", name: "75MB", data: "75MB", price: 74, validity: "1 day", planCode: "242" },
            { id: "airtel-gift-243", name: "110MB", data: "110MB", price: 98, validity: "1 day", planCode: "243" },
            { id: "airtel-gift-244", name: "250MB", data: "250MB", price: 50, validity: "1 day", planCode: "244" },
            { id: "airtel-gift-245", name: "2GB", data: "2GB", price: 570, validity: "7 days", planCode: "245" },
            { id: "airtel-gift-247", name: "600MB", data: "600MB", price: 205, validity: "2 days", planCode: "247" },
            { id: "airtel-gift-248", name: "3GB", data: "3GB", price: 1960, validity: "30 days", planCode: "248" },
            { id: "airtel-gift-249", name: "4GB", data: "4GB", price: 2450, validity: "30 days", planCode: "249" },
            { id: "airtel-gift-250", name: "7GB", data: "7GB", price: 1470, validity: "7 days", planCode: "250" },
            { id: "airtel-gift-251", name: "8GB", data: "8GB", price: 2970, validity: "30 days", planCode: "251" },
            { id: "airtel-gift-252", name: "10GB", data: "10GB", price: 3920, validity: "30 days", planCode: "252" },
            { id: "airtel-gift-253", name: "13GB", data: "13GB", price: 4900, validity: "30 days", planCode: "253" },
            { id: "airtel-gift-254", name: "25GB", data: "25GB", price: 7840, validity: "30 days", planCode: "254" },
            { id: "airtel-gift-255", name: "35GB", data: "35GB", price: 9800, validity: "30 days", planCode: "255" },
            { id: "airtel-gift-256", name: "60GB", data: "60GB", price: 14700, validity: "30 days", planCode: "256" },
            { id: "airtel-gift-257", name: "100GB", data: "100GB", price: 19600, validity: "30 days", planCode: "257" },
            { id: "airtel-gift-258", name: "300GB", data: "300GB", price: 49000, validity: "90 days", planCode: "258" },
            { id: "airtel-gift-259", name: "350GB", data: "350GB", price: 58800, validity: "120 days", planCode: "259" },
            { id: "airtel-gift-260", name: "685GB", data: "685GB", price: 98000, validity: "1 year", planCode: "260" },
            { id: "airtel-gift-296", name: "8GB", data: "8GB", price: 1960, validity: "30 days", planCode: "296" },
            { id: "airtel-gift-297", name: "60GB", data: "60GB", price: 9800, validity: "1 year", planCode: "297" },
          ]
        }
      ]
    },
    {
      id: "9mobile",
      name: "9MOBILE",
      code: "9MOBILE",
      color: "#6C2C7A",
      iconPath: "/networks/9mobile.jpg",
      categories: [
        {
          id: "sme",
          name: "SME",
          plans: [
            { id: "9mobile-sme-61", name: "1.1GB", data: "1.1GB", price: 400, validity: "30 days", planCode: "61" },
            { id: "9mobile-sme-62", name: "2GB", data: "2GB", price: 800, validity: "30 days", planCode: "62" },
          ]
        },
        {
          id: "gifting",
          name: "GIFTING",
          plans: [
            { id: "9mobile-gift-68", name: "1.5GB", data: "1.5GB", price: 880, validity: "30 days", planCode: "68" },
            { id: "9mobile-gift-69", name: "500MB", data: "500MB", price: 450, validity: "30 days", planCode: "69" },
          ]
        },
        {
          id: "cooperate-gifting",
          name: "COOPERATE GIFTING",
          plans: [
            { id: "9mobile-coop-85", name: "500MB", data: "500MB", price: 250, validity: "30 days", planCode: "85" },
            { id: "9mobile-coop-86", name: "1GB", data: "1GB", price: 500, validity: "30 days", planCode: "86" },
            { id: "9mobile-coop-87", name: "2GB", data: "2GB", price: 1000, validity: "30 days", planCode: "87" },
            { id: "9mobile-coop-88", name: "3GB", data: "3GB", price: 1500, validity: "30 days", planCode: "88" },
            { id: "9mobile-coop-89", name: "4GB", data: "4GB", price: 2000, validity: "30 days", planCode: "89" },
          ]
        }
      ]
    },
  ];
};

export default async function DataPage() {
  console.log("📱 [DATA] Starting data page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [DATA] User authenticated: ${sessionUser.id}`);

  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { wallet: true },
  });

  if (!user) {
    console.error("❌ [DATA] User not found!");
    return null;
  }

  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
  } else if (user.hasWallet) {
    try {
      const newWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          accountNumber: generateVirtualAccountNumber(),
          bankName: "PALMPAY",
          accountName: user.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
        },
      });
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      }) || user;
    } catch (error) {
      console.error("❌ Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
    try {
      const newWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          accountNumber: generateVirtualAccountNumber(),
          bankName: "PALMPAY",
          accountName: user.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
        },
      });
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
    } catch (error) {
      console.error("❌ Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: hasWallet,
    walletBalance: walletBalance,
  };

  const providers = getProviders();
  const defaultProvider = "mtn";

  console.log(`📤 [DATA] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [DATA] Data page load complete!");

  return (
    <DataClient
      user={userData}
      providers={providers}
      defaultProvider={defaultProvider}
    />
  );
}