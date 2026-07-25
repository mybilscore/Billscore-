// src/app/app-guide/page.client.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  Video,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Home,
  Menu,
  X,
  Users,
  Store,
  Sprout,
  BarChart3,
  Send,
  Settings,
  HelpCircle,
  Shield,
  Zap,
  Clock,
  Star,
  Bookmark,
  Share2,
  Printer,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  Map,
  Droplets,
  Award,
  Package,
  Truck,
  FileCheck,
  TrendingUp,
  Globe,
  Building2,
  User,
  Calendar,
  Download,
  Copy,
  Leaf,
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  Instagram,
  Facebook,
  Smartphone,
  WifiOff,
  Camera,
  QrCode,
  Tractor,
  Wrench,
  Fuel,
  Hammer,
  Box,
  Info,
  AlertCircle as AlertCircleIcon,
  Tag,
  Hash,
  DollarSign,
  Scale,
  Layers,
  HardDrive,
  Zap as ZapIcon,
  Cpu,
  Radio,
  RefreshCw,
  Plus,
  Building,
  File,
  Shield as ShieldIcon,
  Clock as ClockIcon,
  Sun,
  Battery,
  Plug,
  FlaskConical,
  Syringe,
  TreePine,
  ClipboardCheck,
  ClipboardList,
  Warehouse,
  Ship,
  Activity,
  ShoppingCart,
  Boxes,
} from "lucide-react";

// ============= COMPONENTS =============

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "primary";
  size?: "default" | "sm" | "lg" | "icon";
}

function Button({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default:
      "bg-[#2e7d32] text-white shadow hover:bg-[#1b5e20] hover:shadow-md",
    primary:
      "bg-[#2e7d32] text-white shadow hover:bg-[#1b5e20] hover:shadow-md",
    outline:
      "border border-gray-300 bg-white shadow-sm hover:bg-gray-50 hover:shadow",
    ghost: "hover:bg-gray-100 hover:text-gray-900",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-md px-8 text-base",
    icon: "h-9 w-9",
  };

  const finalClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className || ""}`;

  return (
    <button className={finalClasses} {...props}>
      {children}
    </button>
  );
}

// ============= HEADER =============

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", name: "Home" },
    { href: "/app-guide", name: "Documentation", active: true },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
        scrolled ? "py-2 shadow-md" : "py-3"
      }`}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link className="flex items-center gap-3" href="/">
              <div className="relative h-14 w-14 overflow-hidden rounded-full flex-shrink-0">
                <img
                  src="/uploads/logos/elmeena.svg"
                  alt="EMAP Logo"
                  className="h-full w-full object-contain p-1.5"
                />
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  className={`text-sm font-medium transition-all duration-300 hover:text-[#2e7d32] hover:scale-105 ${
                    link.active
                      ? "text-[#2e7d32] border-b-2 border-[#2e7d32] pb-1"
                      : "text-muted-foreground"
                  }`}
                  href={link.href}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              aria-label="Search"
              className="h-9 w-9"
              size="icon"
              variant="ghost"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Link href="/auth/sign-in">
              <Button size="sm" variant="ghost" className="text-muted-foreground">
                Log In
              </Button>
            </Link>
            <Link href="/auth/sign-in">
              <Button size="sm" className="bg-[#2e7d32] hover:bg-[#1b5e20]">
                Sign Up
              </Button>
            </Link>

            <Button
              aria-label="Toggle mobile menu"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="icon"
              variant="ghost"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 border-b px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                className={`block py-2 text-base font-medium transition-colors hover:text-[#2e7d32] ${
                  link.active ? "text-[#2e7d32]" : "text-foreground"
                }`}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="mt-3 flex flex-col space-y-2 border-t pt-3">
              <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full" variant="ghost">
                  Log In
                </Button>
              </Link>
              <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[#2e7d32] hover:bg-[#1b5e20]">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ============= FOOTER =============

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-6 w-6 rounded-md bg-[#2e7d32] flex items-center justify-center text-white">
                <Leaf className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold">EMAP</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Enterprise Management for Agricultural Platforms. Streamlining farm
              operations and supply chain management.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/app-guide" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/app-guide" className="text-gray-400 hover:text-white transition-colors">
                  User Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" /> Abuja, FCT, Nigeria
              </li>
              <li className="flex items-center">
                <Phone className="mr-2 h-4 w-4" /> +234 801 234 5678
              </li>
              <li className="flex items-center">
                <Mail className="mr-2 h-4 w-4" /> support@emap.com
              </li>
            </ul>
            <div className="mt-4 flex space-x-4">
              <Link href="https://facebook.com" target="_blank" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="https://instagram.com" target="_blank" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} EMAP. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// ============= SCROLL TO TOP =============

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#2e7d32] text-white shadow-lg transition-all duration-300 hover:bg-[#1b5e20] hover:shadow-xl ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10 pointer-events-none"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

// ============= DOCUMENTATION DATA =============

interface DocArticle {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  category: string;
  icon: any;
  readTime: string;
  updatedAt: string;
}

interface DocCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  articles: DocArticle[];
}

// Documentation data - all static content
function getDocData(): DocCategory[] {
  return [
    // ============ GETTING STARTED ============
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics of the EMAP ecosystem and set up your account",
      icon: BookOpen,
      articles: [
        {
          id: "introduction",
          title: "Introduction to EMAP Ecosystem",
          description: "Overview of EMAP, EMAPS, and EMMP platforms",
          category: "getting-started",
          icon: BookOpen,
          readTime: "5 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to the EMAP Ecosystem</h2>
              <p className="text-gray-700">
                The El-Meena Digital Agriculture Ecosystem is designed as a single, integrated digital backbone 
                supporting the entire alfalfa value chain, from land preparation and cultivation through processing, 
                export, and commercial trade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800">EMAP</h4>
                  <p className="text-sm text-green-700">Production & Field Operations Platform</p>
                  <p className="text-xs text-green-600 mt-1">System of Record for all farm-level data</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800">EMAPS</h4>
                  <p className="text-sm text-blue-700">Processing & Sales Platform</p>
                  <p className="text-xs text-blue-600 mt-1">System of Record for post-harvest operations</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800">EMMP</h4>
                  <p className="text-sm text-purple-700">Marketplace Platform</p>
                  <p className="text-xs text-purple-600 mt-1">System of Record for commercial activities</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: "account-setup",
          title: "Account Setup & Onboarding",
          description: "How to create and configure your account",
          category: "getting-started",
          icon: User,
          readTime: "5 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Setting Up Your Account</h2>
              <p className="text-gray-700">
                Get started with the EMAP ecosystem by creating your account and completing your profile.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2e7d32] text-white text-xs font-bold">1</div>
                  <div>
                    <h4 className="font-semibold">Sign Up</h4>
                    <p className="text-sm text-gray-600">Create your account with email and password.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2e7d32] text-white text-xs font-bold">2</div>
                  <div>
                    <h4 className="font-semibold">Complete Your Profile</h4>
                    <p className="text-sm text-gray-600">Fill in your personal or organization details.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2e7d32] text-white text-xs font-bold">3</div>
                  <div>
                    <h4 className="font-semibold">Platform Access</h4>
                    <p className="text-sm text-gray-600">Based on your role, you&apos;ll get access to EMAP, EMAPS, or EMMP.</p>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: "quick-start",
          title: "Quick Start Guide",
          description: "Get up and running quickly with EMAP",
          category: "getting-started",
          icon: Zap,
          readTime: "3 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Quick Start Guide</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <CheckCircle className="h-4 w-4 text-[#2e7d32] mr-2" />
                    For Farmers
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>1. Complete your profile</li>
                    <li>2. Add your farm and fields</li>
                    <li>3. Record your first harvest</li>
                    <li>4. Track payments</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <CheckCircle className="h-4 w-4 text-[#2e7d32] mr-2" />
                    For Processors
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>1. Set up warehouse</li>
                    <li>2. Configure QA workflows</li>
                    <li>3. Process incoming harvests</li>
                    <li>4. Create lots</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <CheckCircle className="h-4 w-4 text-[#2e7d32] mr-2" />
                    For Buyers
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>1. Complete KYC</li>
                    <li>2. Browse catalog</li>
                    <li>3. Place orders</li>
                    <li>4. Track shipments</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <CheckCircle className="h-4 w-4 text-[#2e7d32] mr-2" />
                    For Administrators
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>1. Set up clusters</li>
                    <li>2. Manage team members</li>
                    <li>3. Monitor dashboards</li>
                    <li>4. Configure settings</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },

    // ============ EMAP - FARMS MANAGEMENT PLATFORM ============
    {
      id: "emap",
      title: "EMAP - Farms Management Platform",
      description: "Complete guide from cluster creation to harvest management",
      icon: Store,
      articles: [
        // Cluster Management
        {
          id: "emap-clusters",
          title: "🏢 Cluster Management",
          description: "Create and manage clusters - the foundation of farm organization",
          category: "emap",
          icon: Building2,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Cluster Management Overview</h2>
              <p className="text-gray-700">
                A <strong>Cluster</strong> is a grouping of farms under a coordinator. Clusters are the foundation 
                of farm organization in EMAP, used to group farms geographically or by producer type.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">What is a Cluster?</h4>
                <ul className="mt-2 space-y-1 text-sm text-green-700">
                  <li>• <strong>Purpose:</strong> Organize farms under a coordinator</li>
                  <li>• <strong>Types:</strong> Farmer Group, Cooperative, Association, Community, Project</li>
                  <li>• <strong>Tiers:</strong> Basic, Standard, Premium</li>
                  <li>• <strong>Structure:</strong> Cluster → Farms → Fields → Crop Cycles</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Cluster</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-700">Step-by-Step Guide:</p>
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Clusters</strong> - Click "Clusters" in the sidebar</li>
                  <li><strong>Click "Add Cluster"</strong> - Click the "Create New Cluster" button</li>
                  <li><strong>Fill in Basic Information</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Cluster Name *, Cluster Type *, Tier, Status, Description</li>
                      <li>SPV Beneficiary, SPV Equity %, Established Date</li>
                    </ul>
                  </li>
                  <li><strong>Add Location &amp; Geography</strong> (Optional):
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Region, Local Government, Ward, Village</li>
                      <li>GPS Coordinates (Latitude, Longitude)</li>
                      <li>Total Area (ha) and Cultivated Area (ha)</li>
                      <li><strong>GPS Boundary</strong> - GeoJSON polygon:
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "type": "Polygon",
  "coordinates": [
    [
      [10.0200, 12.4400],
      [10.0500, 12.4400],
      [10.0550, 12.4550],
      [10.0400, 12.4650],
      [10.0250, 12.4650],
      [10.0150, 12.4550],
      [10.0200, 12.4400]
    ]
  ]
}`}
                        </pre>
                        <span className="text-xs text-gray-500">Format: [longitude, latitude] pairs. Must close the polygon.</span>
                      </li>
                    </ul>
                  </li>
                  <li><strong>Assign Leadership</strong> (Optional)</li>
                  <li><strong>Click "Create Cluster"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800">GPS Boundary Format</h4>
                <p className="text-sm text-blue-700">
                  The GPS boundary must be in GeoJSON Polygon format with coordinates as [longitude, latitude] pairs.
                  The polygon must be closed (first and last point must match).
                </p>
              </div>
            </div>
          ),
        },
        // Farm Management
        {
          id: "emap-farms",
          title: "🌾 Farm Management",
          description: "Create and manage farms within clusters",
          category: "emap",
          icon: TreePine,
          readTime: "10 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Farm Management Overview</h2>
              <p className="text-gray-700">
                A <strong>Farm</strong> is an individual farm unit within a cluster. Each farm can have multiple fields.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Farm Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm text-center">🌱 Alfalfa</div>
                  <div className="bg-white rounded p-2 text-sm text-center">🌽 Corn</div>
                  <div className="bg-white rounded p-2 text-sm text-center">🌾 Wheat</div>
                  <div className="bg-white rounded p-2 text-sm text-center">🫘 Soybean</div>
                  <div className="bg-white rounded p-2 text-sm text-center">🌿 Mixed</div>
                  <div className="bg-white rounded p-2 text-sm text-center">📦 Other</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Farm</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to the Cluster</strong> - Click "Clusters" → Select the cluster</li>
                  <li><strong>Click "Add Farm"</strong></li>
                  <li><strong>Fill in Basic Information</strong> (Required):
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Farm Name *, Farm Type *, Status, Total Area (ha) *</li>
                    </ul>
                  </li>
                  <li><strong>Add Location &amp; GPS</strong> (Optional):
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Latitude and Longitude coordinates</li>
                      <li><strong>GPS Boundary</strong> - GeoJSON polygon:
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "type": "Polygon",
  "coordinates": [
    [
      [10.0200, 12.4400],
      [10.0500, 12.4400],
      [10.0550, 12.4550],
      [10.0400, 12.4650],
      [10.0250, 12.4650],
      [10.0150, 12.4550],
      [10.0200, 12.4400]
    ]
  ]
}`}
                        </pre>
                        <span className="text-xs text-gray-500">Format: [longitude, latitude] pairs. Must close the polygon.</span>
                      </li>
                    </ul>
                  </li>
                  <li><strong>Add Soil Information</strong> (Optional)</li>
                  <li><strong>Add Land Title</strong> (Optional)</li>
                  <li><strong>Add Irrigation</strong> (Optional)</li>
                  <li><strong>Click "Create Farm"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800">GPS Boundary Format</h4>
                <p className="text-sm text-blue-700">
                  The GPS boundary must be in GeoJSON Polygon format with coordinates as [longitude, latitude] pairs.
                  The polygon must be closed (first and last point must match).
                </p>
              </div>
            </div>
          ),
        },
        // Field Management
        {
          id: "emap-fields",
          title: "📋 Field Management",
          description: "Create and manage fields within farms",
          category: "emap",
          icon: Map,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Field Management Overview</h2>
              <p className="text-gray-700">
                A <strong>Field</strong> is a subdivision of a farm used for crop production.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Field Hierarchy</h4>
                <p className="text-sm text-blue-700">Cluster → Farm → <strong>Field</strong> → Crop Cycle → Activities → Harvest</p>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Field</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to the Farm</strong> - Click "Farms" → Select the farm → "View Fields"</li>
                  <li><strong>Click "Add Field"</strong></li>
                  <li><strong>Fill in Basic Information</strong> (Required):
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Field Number *, Field Name, Area (ha) *, Status</li>
                    </ul>
                  </li>
                  <li><strong>Add Location &amp; GPS</strong> (Optional):
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Latitude and Longitude coordinates</li>
                      <li><strong>GPS Boundary</strong> - GeoJSON polygon:
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`{
  "type": "Polygon",
  "coordinates": [
    [
      [10.0200, 12.4400],
      [10.0500, 12.4400],
      [10.0550, 12.4550],
      [10.0400, 12.4650],
      [10.0250, 12.4650],
      [10.0150, 12.4550],
      [10.0200, 12.4400]
    ]
  ]
}`}
                        </pre>
                        <span className="text-xs text-gray-500">Format: [longitude, latitude] pairs. Must close the polygon.</span>
                      </li>
                    </ul>
                  </li>
                  <li><strong>Add Soil Information</strong> (Optional)</li>
                  <li><strong>Click "Create Field"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800">GPS Boundary Format</h4>
                <p className="text-sm text-blue-700">
                  The GPS boundary must be in GeoJSON Polygon format with coordinates as [longitude, latitude] pairs.
                  The polygon must be closed (first and last point must match).
                </p>
              </div>
            </div>
          ),
        },
        // Crop Cycle Management
        {
          id: "emap-crop-cycles",
          title: "🌱 Crop Cycle Management",
          description: "Start and manage crop production cycles from planting to harvest",
          category: "emap",
          icon: Sprout,
          readTime: "12 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Crop Cycle Management</h2>
              <p className="text-gray-700">
                A <strong>Crop Cycle</strong> represents the full production cycle from planting to harvest.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Cycle Status Flow</h4>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                  <span className="px-2 py-1 bg-gray-200 rounded">🌱 Planted</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-gray-200 rounded">🌿 Germinated</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-gray-200 rounded">🌳 Growing</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-gray-200 rounded">🌸 Flowering</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-gray-200 rounded">🌾 Maturing</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-yellow-200 rounded">✅ Ready</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-orange-200 rounded">🚜 Harvesting</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-green-200 rounded">✅ Harvested</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-blue-200 rounded">✅ Completed</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Starting a Crop Cycle</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to the Field</strong></li>
                  <li><strong>Click "Start Cycle"</strong></li>
                  <li><strong>Fill in Cycle Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Cycle Name, Crop Type *, Variety, Planting Date *, Expected Cuts</li>
                    </ul>
                  </li>
                  <li><strong>Add Additional Dates</strong> (Optional)</li>
                  <li><strong>Add Inputs</strong> (Optional)</li>
                  <li><strong>Click "Start Cycle"</strong></li>
                </ol>
              </div>
            </div>
          ),
        },
        // Activity Logging
        {
          id: "emap-activities",
          title: "📋 Activity Logging",
          description: "Log all field operations and activities within crop cycles",
          category: "emap",
          icon: FileText,
          readTime: "10 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Activity Logging Overview</h2>
              <p className="text-gray-700">
                Activities are the daily operations that occur within a crop cycle.
              </p>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Activity Types</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr><th className="px-4 py-2 text-left">Activity Type</th><th className="px-4 py-2 text-left">Requires Inventory</th><th className="px-4 py-2 text-left">Has Cost</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-4 py-2">Fertilizer Application</td><td className="px-4 py-2">✅ Yes</td><td className="px-4 py-2">✅ Yes</td></tr>
                    <tr><td className="px-4 py-2">Pesticide Application</td><td className="px-4 py-2">✅ Yes</td><td className="px-4 py-2">✅ Yes</td></tr>
                    <tr><td className="px-4 py-2">Herbicide Application</td><td className="px-4 py-2">✅ Yes</td><td className="px-4 py-2">✅ Yes</td></tr>
                    <tr><td className="px-4 py-2">Irrigation</td><td className="px-4 py-2">❌ No</td><td className="px-4 py-2">✅ Yes</td></tr>
                    <tr><td className="px-4 py-2">Harvest</td><td className="px-4 py-2">❌ No</td><td className="px-4 py-2">✅ Yes</td></tr>
                    <tr><td className="px-4 py-2">Field Scouting</td><td className="px-4 py-2">❌ No</td><td className="px-4 py-2">❌ No</td></tr>
                    <tr><td className="px-4 py-2">Labor</td><td className="px-4 py-2">❌ No</td><td className="px-4 py-2">✅ Yes</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        // Harvest Recording
        {
          id: "emap-harvest",
          title: "🌾 Harvest Recording",
          description: "Record harvests, cuts, and yield data",
          category: "emap",
          icon: Package,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Harvest Recording Overview</h2>
              <p className="text-gray-700">
                A <strong>Harvest</strong> records the collection of a crop from a field during a crop cycle.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">Harvest Fields</h4>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr><th className="text-left">Field</th><th className="text-left">Required</th><th className="text-left">Description</th></tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-200">
                    <tr><td className="py-1">Cut Number</td><td>Yes</td><td>Auto-incremented</td></tr>
                    <tr><td className="py-1">Harvest Date</td><td>Yes</td><td>Date of harvest</td></tr>
                    <tr><td className="py-1">Actual Bales</td><td>Yes</td><td>Actual bale count</td></tr>
                    <tr><td className="py-1">Actual Weight</td><td>Yes</td><td>Actual weight in kg</td></tr>
                    <tr><td className="py-1">Moisture %</td><td>No</td><td>Moisture content</td></tr>
                    <tr><td className="py-1">Visual Quality</td><td>No</td><td>Quality assessment</td></tr>
                  </tbody>
                </table>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Recording a Harvest</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to the Crop Cycle</strong></li>
                  <li><strong>Click "Harvest" or "Record Harvest"</strong></li>
                  <li><strong>Fill in Harvest Details</strong></li>
                  <li><strong>Click "Record Harvest"</strong></li>
                </ol>
              </div>
            </div>
          ),
        },
        // Inventory Management
        {
          id: "emap-inventory-management",
          title: "📦 Inventory Management",
          description: "Manage farm inputs, supplies, and equipment inventory with stock tracking and cost management",
          category: "emap",
          icon: Package,
          readTime: "10 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Inventory Management Overview</h2>
              <p className="text-gray-700">
                The EMAP Inventory Management system allows you to track all farm inputs, supplies, and equipment.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Item Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm">🌱 Seed (SEED)</div>
                  <div className="bg-white rounded p-2 text-sm">🧪 Fertilizer (FERT)</div>
                  <div className="bg-white rounded p-2 text-sm">💉 Pesticide (PEST)</div>
                  <div className="bg-white rounded p-2 text-sm">🌿 Herbicide (HERB)</div>
                  <div className="bg-white rounded p-2 text-sm">⛽ Fuel (FUEL)</div>
                  <div className="bg-white rounded p-2 text-sm">🔧 Equipment (EQPT)</div>
                </div>
              </div>
            </div>
          ),
        },
        // Resource Management
        {
          id: "emap-resource-management",
          title: "🔧 Resource Management",
          description: "Manage equipment, vehicles, tools, and other farm resources",
          category: "emap",
          icon: Tractor,
          readTime: "12 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Resource Management Overview</h2>
              <p className="text-gray-700">
                The EMAP Resource Management system allows you to track all farm equipment, vehicles, and tools.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Resource Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm">🚜 Tractor (TR)</div>
                  <div className="bg-white rounded p-2 text-sm">🌾 Harvester (HV)</div>
                  <div className="bg-white rounded p-2 text-sm">💧 Irrigation (IR)</div>
                  <div className="bg-white rounded p-2 text-sm">🚚 Vehicle (VH)</div>
                  <div className="bg-white rounded p-2 text-sm">✈️ Drone (DR)</div>
                  <div className="bg-white rounded p-2 text-sm">📡 Sensor (SN)</div>
                </div>
              </div>
            </div>
          ),
        },
        // EMAP Mobile App
        {
          id: "emap-mobile-app",
          title: "📱 EMAP Mobile App",
          description: "Offline-first Android app for field data collection and operations",
          category: "emap",
          icon: Smartphone,
          readTime: "6 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">EMAP Mobile App</h2>
              <p className="text-gray-700">
                The EMAP Mobile App is an offline-first Android application designed for field operations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <WifiOff className="h-4 w-4 text-[#2e7d32] mr-2" />
                    Offline-First Operation
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• Capture data without internet</li>
                    <li>• Auto-sync when connected</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <Camera className="h-4 w-4 text-[#2e7d32] mr-2" />
                    Field Features
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• GPS-validated logging</li>
                    <li>• Harvest recording with photos</li>
                    <li>• QR code scanning</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },

    // ============ EMAPS - PROCESSING & SALES PLATFORM ============
    {
      id: "emaps",
      title: "EMAPS - Processing & Sales Platform",
      description: "Complete guide from intake to final approval for processing and export",
      icon: Award,
      articles: [
        // Overview
        {
          id: "emaps-overview",
          title: "Overview & Purpose",
          description: "Introduction to EMAPS and its role in the ecosystem",
          category: "emaps",
          icon: Award,
          readTime: "5 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">EMAPS Overview</h2>
              <p className="text-gray-700">
                EMAPS (El-Meena Processing and Sales Platform) is the authoritative post-harvest and quality 
                management platform within the El-Meena digital ecosystem.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Key Responsibilities</h4>
                <ul className="mt-2 space-y-1 text-sm text-blue-700">
                  <li>• <strong>Intake</strong> - Receive and register bales from EMAP</li>
                  <li>• <strong>Quality Testing</strong> - Test moisture, CP%, and physical quality</li>
                  <li>• <strong>Lot Creation</strong> - Group bales into certified lots</li>
                  <li>• <strong>Warehouse</strong> - Manage inventory and storage</li>
                  <li>• <strong>Logistics</strong> - Prepare for export and shipment</li>
                  <li>• <strong>Final Approval</strong> - Quality sign-off before export</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">System of Record (SoR)</h4>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  <li>✅ Bale intake records</li>
                  <li>✅ Quality test results</li>
                  <li>✅ Lot creation and grading</li>
                  <li>✅ Warehouse inventory positions</li>
                  <li>✅ Processing activities</li>
                  <li>✅ Container loading and shipment preparation</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">EMAPS Workflow</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <span className="px-3 py-2 bg-blue-100 rounded-lg font-medium">📦 Intake</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-yellow-100 rounded-lg font-medium">🧪 Quality Tests</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-purple-100 rounded-lg font-medium">✅ Test Approval</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-green-100 rounded-lg font-medium">📦 Lots</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-orange-100 rounded-lg font-medium">🏭 Warehouse</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-cyan-100 rounded-lg font-medium">🚢 Logistics</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-red-100 rounded-lg font-medium">✅ Final Approval</span>
                </div>
              </div>
            </div>
          ),
        },
        // Intake
        {
          id: "emaps-intake",
          title: "📦 Intake Management",
          description: "Receive and register harvested bales from EMAP",
          category: "emaps",
          icon: Package,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Intake Management</h2>
              <p className="text-gray-700">
                Intake is the process of receiving harvested bales from EMAP and registering them into the EMAPS system.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Intake Status</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pending</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Processing</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Completed</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Rejected</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating an Intake Record</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Intake</strong> - Click "Intake" in the sidebar</li>
                  <li><strong>Click "New Intake"</strong></li>
                  <li><strong>Fill in Intake Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Source Field *, Cluster *, Harvest Date</li>
                      <li>Number of Bales *, Actual Weight *</li>
                      <li>Bale Type, Visual Quality</li>
                    </ul>
                  </li>
                  <li><strong>Click "Create Intake"</strong></li>
                </ol>
              </div>
            </div>
          ),
        },
        // Quality Tests
        {
          id: "emaps-quality-tests",
          title: "🧪 Quality Tests",
          description: "Multi-stage quality control and certification",
          category: "emaps",
          icon: FlaskConical,
          readTime: "10 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Quality Tests</h2>
              <p className="text-gray-700">
                Quality Tests are multi-stage quality control procedures that ensure only certified lots proceed to inventory.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">QA Parameters</h4>
                <table className="w-full text-sm mt-2">
                  <thead><tr><th className="text-left">Parameter</th><th className="text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-yellow-200">
                    <tr><td className="py-1">Moisture %</td><td>Water content in bales</td></tr>
                    <tr><td className="py-1">Crude Protein (CP%)</td><td>Protein content</td></tr>
                    <tr><td className="py-1">ADF</td><td>Acid Detergent Fiber</td></tr>
                    <tr><td className="py-1">NDF</td><td>Neutral Detergent Fiber</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Quality Grades</h4>
                <table className="w-full text-sm mt-2">
                  <thead><tr><th className="text-left">Grade</th><th className="text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-green-200">
                    <tr><td className="py-1 font-semibold">Supreme</td><td>Highest quality - Premium export</td></tr>
                    <tr><td className="py-1 font-semibold">Premium</td><td>Export quality</td></tr>
                    <tr><td className="py-1 font-semibold">Standard</td><td>Good quality - Domestic</td></tr>
                    <tr><td className="py-1 font-semibold">Utility</td><td>Lower grade - Processing</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        // Test Approval
        {
          id: "emaps-test-approval",
          title: "✅ Test Approval",
          description: "Review and approve quality test results",
          category: "emaps",
          icon: ClipboardCheck,
          readTime: "6 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Test Approval</h2>
              <p className="text-gray-700">
                Test Approval is the workflow where quality test results are reviewed and approved by supervisors.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800">Approval Status</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pending</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Approved</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Rejected</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Needs Review</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Test Approval Workflow</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Test Approval</strong></li>
                  <li><strong>Review Pending Tests</strong></li>
                  <li><strong>Make Decision</strong> - Approve, Reject, or Need Review</li>
                  <li><strong>Click "Submit Approval Decision"</strong></li>
                </ol>
              </div>
            </div>
          ),
        },
        // Lots
        {
          id: "emaps-lots",
          title: "📦 Lot Management",
          description: "Create and manage traceable production lots",
          category: "emaps",
          icon: Box,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Lot Management</h2>
              <p className="text-gray-700">
                A <strong>Lot</strong> is a traceable production batch that maintains backward traceability.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Lot Grouping</h4>
                <ul className="mt-2 space-y-1 text-sm text-green-700">
                  <li>• By quality grade (Supreme, Premium, Standard, Utility)</li>
                  <li>• By cut cycle</li>
                  <li>• By processing batch</li>
                  <li>• By origin (field/cluster)</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Lot</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Lots</strong></li>
                  <li><strong>Click "Create Lot"</strong></li>
                  <li><strong>Fill in Lot Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Lot Name *, Grade *, Source Field</li>
                      <li>Bale Count *, Total Weight *</li>
                      <li>QA Certificate #, Certified By</li>
                    </ul>
                  </li>
                  <li><strong>Click "Create Lot"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Traceability Chain</h4>
                <p className="text-sm text-blue-700">Field → Cluster → Producer → Harvest → Bale → Lot → Inventory → Shipment</p>
              </div>
            </div>
          ),
        },
        // Warehouse
        {
          id: "emaps-warehouse",
          title: "🏭 Warehouse Management",
          description: "Manage storage and inventory activities",
          category: "emaps",
          icon: Warehouse,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Warehouse Management</h2>
              <p className="text-gray-700">
                Warehouse Management handles all storage and inventory activities.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800">Inventory Features</h4>
                <ul className="mt-2 space-y-1 text-sm text-orange-700">
                  <li>• Register warehouses and storage zones</li>
                  <li>• Track stack locations and lot quantities</li>
                  <li>• Monitor age and condition of products</li>
                  <li>• Enforce FIFO / FEFO rules</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Stock Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Receive Stock</h4>
                  <ol className="mt-2 space-y-1 text-sm text-gray-600 list-decimal list-inside">
                    <li>Navigate to Warehouse → "Receive Stock"</li>
                    <li>Select the lot to receive</li>
                    <li>Enter quantity and location</li>
                    <li>Confirm receipt</li>
                  </ol>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Move Stock</h4>
                  <ol className="mt-2 space-y-1 text-sm text-gray-600 list-decimal list-inside">
                    <li>Navigate to Warehouse → "Move Stock"</li>
                    <li>Select lot and quantity</li>
                    <li>Select source and destination zones</li>
                    <li>Confirm move</li>
                  </ol>
                </div>
              </div>
            </div>
          ),
        },
        // Logistics
        {
          id: "emaps-logistics",
          title: "🚢 Logistics Management",
          description: "Prepare certified inventory for export and shipment",
          category: "emaps",
          icon: Ship,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Logistics Management</h2>
              <p className="text-gray-700">
                Logistics Management handles the preparation of certified inventory for export.
              </p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-800">Logistics Features</h4>
                <ul className="mt-2 space-y-1 text-sm text-cyan-700">
                  <li>• Allocate lots based on contract instructions</li>
                  <li>• Create container loading plans</li>
                  <li>• Record container and seal numbers</li>
                  <li>• Generate export documentation</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Shipment Preparation</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Logistics</strong></li>
                  <li><strong>Create New Shipment</strong></li>
                  <li><strong>Fill in Shipment Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Customer *, Contract # *, Shipping Date *</li>
                      <li>Lot Selected *, Quantity *, Weight *</li>
                      <li>Container #, Seal #</li>
                    </ul>
                  </li>
                  <li><strong>Generate Documents</strong></li>
                  <li><strong>Click "Confirm Shipment"</strong></li>
                </ol>
              </div>
            </div>
          ),
        },
        // Final Approval
        {
          id: "emaps-final-approval",
          title: "✅ Final Approval",
          description: "Final quality check and release for export",
          category: "emaps",
          icon: ClipboardCheck,
          readTime: "6 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Final Approval</h2>
              <p className="text-gray-700">
                Final Approval is the last quality check before products are released for export.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800">Final Approval Checks</h4>
                <table className="w-full text-sm mt-2">
                  <thead><tr><th className="text-left">Check</th><th className="text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-red-200">
                    <tr><td className="py-1">Quality Verification</td><td>All QA tests passed</td></tr>
                    <tr><td className="py-1">Quantity Verification</td><td>Stock matches records</td></tr>
                    <tr><td className="py-1">Document Verification</td><td>All docs generated</td></tr>
                    <tr><td className="py-1">Compliance Check</td><td>Meets export requirements</td></tr>
                  </tbody>
                </table>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Final Approval Process</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Final Approval</strong></li>
                  <li><strong>Review Pending Approvals</strong></li>
                  <li><strong>Review Lot Details</strong></li>
                  <li><strong>Make Decision</strong> - Approve for Export or Reject</li>
                  <li><strong>Click "Submit Final Approval"</strong></li>
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Post-Approval Actions</h4>
                <ul className="mt-2 space-y-1 text-sm text-green-700">
                  <li>✅ Lot released for export</li>
                  <li>✅ Inventory updated</li>
                  <li>✅ Documents finalized</li>
                  <li>✅ Shipment confirmed</li>
                </ul>
              </div>
            </div>
          ),
        },
      ],
    },

    // ============ EMMP - MARKETPLACE PLATFORM ============
    {
      id: "emmp",
      title: "EMMP - Marketplace Platform",
      description: "Complete guide for commercial, contracts, and buyer management",
      icon: Globe,
      articles: [
        // Overview
        {
          id: "emmp-overview",
          title: "Overview & Purpose",
          description: "Introduction to EMMP and its role in the ecosystem",
          category: "emmp",
          icon: Globe,
          readTime: "5 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">EMMP Overview</h2>
              <p className="text-gray-700">
                EMMP (El-Meena Marketplace Platform) is the authoritative commercial and marketplace platform 
                for the El-Meena ecosystem. It manages buyers, pricing, contracts, orders, invoicing references, 
                and commercial performance while consuming certified inventory data from EMAPS.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800">Key Responsibilities</h4>
                <ul className="mt-2 space-y-1 text-sm text-purple-700">
                  <li>• <strong>Price Management</strong> - Define and manage pricing rules</li>
                  <li>• <strong>Available Lots</strong> - View certified inventory lots</li>
                  <li>• <strong>Product Catalog</strong> - Manage product listings</li>
                  <li>• <strong>Orders</strong> - Process and track buyer orders</li>
                  <li>• <strong>Shipments</strong> - Manage shipping and delivery</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">System of Record (SoR)</h4>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  <li>✅ Buyer onboarding and verification</li>
                  <li>✅ Product listings and grade catalogues</li>
                  <li>✅ Pricing rules and contract terms</li>
                  <li>✅ Orders and allocations</li>
                  <li>✅ Sales invoices and settlement references</li>
                </ul>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">EMMP Workflow</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <span className="px-3 py-2 bg-blue-100 rounded-lg font-medium">📊 Dashboard</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-green-100 rounded-lg font-medium">💰 Price Management</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-yellow-100 rounded-lg font-medium">📦 Available Lots</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-purple-100 rounded-lg font-medium">📋 Product Catalog</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-orange-100 rounded-lg font-medium">📋 Orders</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-2 bg-cyan-100 rounded-lg font-medium">🚢 Shipments</span>
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">Data Source: EMAPS (Certified Lots) → EMMP (Commercial) → Buyers</p>
              </div>
            </div>
          ),
        },
        // Dashboard
        {
          id: "emmp-dashboard",
          title: "📊 Dashboard",
          description: "Commercial overview and key metrics",
          category: "emmp",
          icon: Home,
          readTime: "6 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-700">
                The EMMP Dashboard provides a comprehensive view of all commercial activities, including pricing, 
                orders, shipments, and revenue.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Key Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div className="bg-white rounded p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">45</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">₦45M</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">23</p>
                    <p className="text-xs text-gray-500">Active Buyers</p>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">8</p>
                    <p className="text-xs text-gray-500">Pending Orders</p>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Dashboard Components</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Quick Actions</h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• [New Order] - Create a new buyer order</li>
                    <li>• [Price Management] - Update pricing</li>
                    <li>• [View Catalog] - Browse products</li>
                    <li>• [Shipments] - Track shipments</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Alerts</h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• ⚠️ 3 orders pending shipment</li>
                    <li>• ⚠️ 2 lots approaching expiry</li>
                    <li>• ⚠️ 1 payment overdue</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        // Price Management
        {
          id: "emmp-price-management",
          title: "💰 Price Management",
          description: "Define and manage product pricing rules",
          category: "emmp",
          icon: DollarSign,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Price Management</h2>
              <p className="text-gray-700">
                Price Management handles the pricing logic for all products, including grade-based pricing, 
                dynamic pricing rules, and contract pricing.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Pricing Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm">📋 List Price - Standard published price</div>
                  <div className="bg-white rounded p-2 text-sm">📝 Contract Price - Negotiated for specific buyers</div>
                  <div className="bg-white rounded p-2 text-sm">📊 Volume Discount - Price breaks by quantity</div>
                  <div className="bg-white rounded p-2 text-sm">📅 Seasonal Pricing - Adjustments by season</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Grade Pricing Reference</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr><th className="px-4 py-2 text-left">Grade</th><th className="px-4 py-2 text-left">Quality</th><th className="px-4 py-2 text-left">Price/ton (NGN)</th><th className="px-4 py-2 text-left">Use Case</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-4 py-2 font-semibold text-green-600">Supreme</td><td className="px-4 py-2">Premium Export Quality</td><td className="px-4 py-2">55,000</td><td className="px-4 py-2">GCC Dairy Farms</td></tr>
                    <tr><td className="px-4 py-2 font-semibold text-blue-600">Premium</td><td className="px-4 py-2">Export Quality</td><td className="px-4 py-2">50,000</td><td className="px-4 py-2">Feed Millers</td></tr>
                    <tr><td className="px-4 py-2 font-semibold text-yellow-600">Standard</td><td className="px-4 py-2">Good Quality</td><td className="px-4 py-2">45,000</td><td className="px-4 py-2">Domestic Market</td></tr>
                    <tr><td className="px-4 py-2 font-semibold text-gray-600">Utility</td><td className="px-4 py-2">Lower Grade</td><td className="px-4 py-2">35,000</td><td className="px-4 py-2">Processing</td></tr>
                  </tbody>
                </table>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Price Rule</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Price Management</strong></li>
                  <li><strong>Click "Add Price"</strong></li>
                  <li><strong>Fill in Price Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Product *, Grade *, Unit Type, Price *</li>
                      <li>Currency *, Effective Date *, Expiry Date</li>
                      <li>Minimum Order, Maximum Order, Volume Discount</li>
                    </ul>
                  </li>
                  <li><strong>Click "Save Price Rule"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Bulk Pricing Rules</h4>
                <table className="w-full text-sm mt-2">
                  <thead><tr><th className="text-left">Volume (tons)</th><th className="text-left">Discount</th><th className="text-left">Price/ton</th></tr></thead>
                  <tbody className="divide-y divide-blue-200">
                    <tr><td className="py-1">10 - 50</td><td>0%</td><td>List Price</td></tr>
                    <tr><td className="py-1">51 - 100</td><td>5%</td><td>List Price - 5%</td></tr>
                    <tr><td className="py-1">101 - 200</td><td>10%</td><td>List Price - 10%</td></tr>
                    <tr><td className="py-1">201+</td><td>15%</td><td>List Price - 15%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        // Available Lots
        {
          id: "emmp-available-lots",
          title: "📦 Available Lots",
          description: "View and manage certified inventory lots",
          category: "emmp",
          icon: Package,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Available Lots</h2>
              <p className="text-gray-700">
                Available Lots displays all certified inventory lots from EMAPS that are ready for commercial sale.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">Lot Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Available</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Reserved</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Allocated</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Shipped</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Expired</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Lot Details View</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">Lot Information</h4>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• <strong>Lot ID:</strong> LOT-2025-0045</li>
                      <li>• <strong>Grade:</strong> Supreme</li>
                      <li>• <strong>Total Bales:</strong> 120</li>
                      <li>• <strong>Total Weight:</strong> 5,800 kg</li>
                      <li>• <strong>Status:</strong> Available</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Quality Information</h4>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• <strong>Moisture:</strong> 11.8%</li>
                      <li>• <strong>CP%:</strong> 18.5%</li>
                      <li>• <strong>ADF:</strong> 31.5%</li>
                      <li>• <strong>NDF:</strong> 39.8%</li>
                      <li>• <strong>QA Certificate:</strong> QA-2025-0123</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Traceability Chain</h4>
                <p className="text-sm text-blue-700">Field → Cluster → Producer → Harvest → Bale → Lot → QA Certificate → Inventory</p>
              </div>
            </div>
          ),
        },
        // Product Catalog
        {
          id: "emmp-product-catalog",
          title: "📋 Product Catalog",
          description: "Manage market-facing product listings",
          category: "emmp",
          icon: Layers,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
              <p className="text-gray-700">
                The Product Catalog manages all market-facing product listings, including product specifications, 
                grade descriptions, and availability.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800">Product Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm">🥇 Supreme Bales - Premium quality</div>
                  <div className="bg-white rounded p-2 text-sm">🥈 Premium Bales - Export quality</div>
                  <div className="bg-white rounded p-2 text-sm">🥉 Standard Bales - Good quality</div>
                  <div className="bg-white rounded p-2 text-sm">🧊 Cubes - Alfalfa cubes for feed</div>
                  <div className="bg-white rounded p-2 text-sm">💊 Pellets - Alfalfa pellets for feed</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Adding a Product</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Product Catalog</strong></li>
                  <li><strong>Click "Add Product"</strong></li>
                  <li><strong>Fill in Product Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Product Name *, Category *, Grade, SKU</li>
                      <li>Specifications (Moisture, CP%, ADF, NDF)</li>
                      <li>Packaging Type, Weight per Unit</li>
                      <li>List Price, Currency, Discount Range</li>
                      <li>Description</li>
                    </ul>
                  </li>
                  <li><strong>Click "Create Product"</strong></li>
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Product Specifications Example</h4>
                <div className="bg-white rounded p-3 mt-2">
                  <h5 className="font-semibold">Supreme Alfalfa</h5>
                  <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                    <li>• Moisture: ≤12%</li>
                    <li>• CP%: ≥18%</li>
                    <li>• ADF: ≤32%</li>
                    <li>• NDF: ≤40%</li>
                    <li>• Color: Green</li>
                    <li>• Packaging: Bales (50kg)</li>
                    <li>• Origin: Northern Region, Nigeria</li>
                    <li>• Certifications: ISO 9001, GLOBALG.A.P.</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        // Orders
        {
          id: "emmp-orders",
          title: "📋 Orders Management",
          description: "Process and track buyer orders",
          category: "emmp",
          icon: ShoppingCart,
          readTime: "10 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
              <p className="text-gray-700">
                Orders Management handles all buyer orders from placement through fulfilment, including order tracking, 
                allocation, and status management.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800">Order Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Pending</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Processing</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Allocated</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Shipped</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Delivered</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Cancelled</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating an Order</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Orders</strong></li>
                  <li><strong>Click "New Order"</strong></li>
                  <li><strong>Fill in Order Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Order # (Auto-generated), Order Date *, Buyer *</li>
                      <li>Contract #, Shipping Address</li>
                      <li>Product *, Lot *, Quantity (tons) *, Bales</li>
                      <li>Price/ton *, Total Amount</li>
                      <li>Delivery Date, Shipping Method</li>
                      <li>Port of Loading, Port of Discharge</li>
                      <li>Payment Terms, Currency, Notes</li>
                    </ul>
                  </li>
                  <li><strong>Click "Create Order"</strong></li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Commercial Terms Reference</h4>
                <table className="w-full text-sm mt-2">
                  <thead><tr><th className="text-left">Term</th><th className="text-left">Definition</th></tr></thead>
                  <tbody className="divide-y divide-blue-200">
                    <tr><td className="py-1">FOB</td><td>Free on Board - Seller delivers to port</td></tr>
                    <tr><td className="py-1">CIF</td><td>Cost, Insurance, Freight - Seller pays all</td></tr>
                    <tr><td className="py-1">EXW</td><td>Ex Works - Buyer picks up at warehouse</td></tr>
                    <tr><td className="py-1">LC</td><td>Letter of Credit - Bank guarantee</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        // Shipments
        {
          id: "emmp-shipments",
          title: "🚢 Shipments Management",
          description: "Manage shipping and delivery logistics",
          category: "emmp",
          icon: Ship,
          readTime: "8 min",
          updatedAt: "February 26, 2025",
          content: (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Shipments Management</h2>
              <p className="text-gray-700">
                Shipments Management handles all shipping and delivery logistics, including container tracking, 
                documentation, and delivery confirmation.
              </p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-800">Shipment Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Preparing</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Ready</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> In Transit</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Delivered</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Delayed</div>
                  <div className="bg-white rounded p-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Completed</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6">Creating a Shipment</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ol className="mt-2 space-y-2 text-gray-700 list-decimal list-inside">
                  <li><strong>Navigate to Shipments</strong></li>
                  <li><strong>Click "New Shipment"</strong></li>
                  <li><strong>Fill in Shipment Details</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Order *, Shipment Date *, Carrier *, Vessel</li>
                      <li>Bill of Lading #, Container # *, Seal # *</li>
                      <li>Weight (kg) *, Volume (m³)</li>
                      <li>Port of Loading *, Port of Discharge *</li>
                      <li>ETA *, ETD</li>
                    </ul>
                  </li>
                  <li><strong>Generate Documentation</strong>:
                    <ul className="ml-6 list-disc text-sm text-gray-600">
                      <li>Bill of Lading, Certificate of Origin</li>
                      <li>Phytosanitary, Quality Certificate</li>
                      <li>Export Invoice, Packing List</li>
                    </ul>
                  </li>
                  <li><strong>Click "Create Shipment"</strong></li>
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Shipping Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-lg font-bold text-green-600">7.5</p>
                    <p className="text-xs text-gray-500">Avg Transit (days)</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">92%</p>
                    <p className="text-xs text-gray-500">On-Time Rate</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-lg font-bold text-yellow-600">2%</p>
                    <p className="text-xs text-gray-500">Damage Rate</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">450</p>
                    <p className="text-xs text-gray-500">Total Volume (tons)</p>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },

    // ============ PLATFORM BOUNDARIES & DATA FLOW ============
    {
      id: "platform-boundaries",
      title: "Platform Boundaries & Data Flow",
      description: "Understanding system of record principles and cross-platform integration",
      icon: ShieldIcon,
      articles: [
        {
          id: "sor-principles",
          title: "System of Record (SoR) Principles",
          description: "Understanding data ownership and authority",
          category: "platform-boundaries",
          icon: ShieldIcon,
          readTime: "5 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">System of Record (SoR) Principles</h2>
              <p className="text-gray-700">
                Each platform is assigned a clearly defined operational scope and data authority.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800">EMAP SoR</h4>
                  <p className="text-sm text-green-700">Production & Field Operations</p>
                  <ul className="mt-2 space-y-1 text-sm text-green-700">
                    <li>• Land and farm registration</li>
                    <li>• Cluster definitions</li>
                    <li>• GPS boundaries</li>
                    <li>• Crop lifecycle records</li>
                    <li>• Raw yield data</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800">EMAPS SoR</h4>
                  <p className="text-sm text-blue-700">Processing, QA & Inventory</p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>• Bale intake records</li>
                    <li>• Quality test results</li>
                    <li>• Lot creation & grading</li>
                    <li>• Warehouse inventory</li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800">EMMP SoR</h4>
                  <p className="text-sm text-purple-700">Commercial, Contracts & Buyers</p>
                  <ul className="mt-2 space-y-1 text-sm text-purple-700">
                    <li>• Buyer onboarding</li>
                    <li>• Product listings</li>
                    <li>• Pricing rules</li>
                    <li>• Orders & allocations</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: "data-flow",
          title: "EMAP → EMAPS → EMMP Data Flow",
          description: "Understanding the one-directional data flow",
          category: "platform-boundaries",
          icon: ArrowRight,
          readTime: "4 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">EMAP → EMAPS → EMMP Data Flow</h2>
              <p className="text-gray-700">
                Data flows strictly in one direction across the value chain, ensuring integrity and traceability.
              </p>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800">Step 1: EMAP → EMAPS</h4>
                  <ul className="mt-2 space-y-1 text-sm text-green-700">
                    <li>• Harvest event closure</li>
                    <li>• Bale counts and estimated weights</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800">Step 2: EMAPS → EMMP</h4>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>• Certified lots and grades</li>
                    <li>• Available inventory quantities</li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800">Step 3: EMMP → EMAPS</h4>
                  <ul className="mt-2 space-y-1 text-sm text-purple-700">
                    <li>• Sales allocation instructions</li>
                    <li>• Contract-linked shipment schedules</li>
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800">❌ Prohibited: Reverse Writes</h4>
                  <p className="text-sm text-red-700">No platform may write data back to a previous platform&apos;s SoR.</p>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },

    // ============ SUPPORT & RESOURCES ============
    {
      id: "support",
      title: "Support & Resources",
      description: "FAQs, contact information, and glossary",
      icon: HelpCircle,
      articles: [
        {
          id: "faq",
          title: "Frequently Asked Questions",
          description: "Common questions and answers",
          category: "support",
          icon: HelpCircle,
          readTime: "5 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">What is the difference between EMAP, EMAPS, and EMMP?</h4>
                  <p className="text-sm text-gray-600 mt-1">EMAP manages production and field operations. EMAPS manages processing, quality assurance, and inventory. EMMP manages the marketplace, buyers, and commercial activities.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Do I need internet access to use EMAP?</h4>
                  <p className="text-sm text-gray-600 mt-1">No. EMAP supports offline-first operation.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">How is product quality tracked?</h4>
                  <p className="text-sm text-gray-600 mt-1">EMAPS tracks multiple QA parameters including moisture, crude protein (CP%), fibre metrics, density, and visual quality.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">Can buyers track their orders?</h4>
                  <p className="text-sm text-gray-600 mt-1">Yes. Buyers have access to a secure portal where they can view contracts, shipment status, QA certificates, and delivery updates.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: "contact-support",
          title: "Contact Support",
          description: "How to get help and support",
          category: "support",
          icon: MessageSquare,
          readTime: "2 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Contact Support</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <Mail className="h-4 w-4 text-[#2e7d32] mr-2" />
                    Email
                  </h4>
                  <p className="text-sm text-gray-600">support@emap.com</p>
                  <p className="text-xs text-gray-500 mt-1">Response within 24 hours</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center">
                    <Phone className="h-4 w-4 text-[#2e7d32] mr-2" />
                    Phone
                  </h4>
                  <p className="text-sm text-gray-600">+234 801 234 5678</p>
                  <p className="text-xs text-gray-500 mt-1">Mon-Fri, 8:00 AM - 6:00 PM WAT</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: "glossary",
          title: "Glossary of Terms",
          description: "Definitions of key terms used in the platform",
          category: "support",
          icon: BookOpen,
          readTime: "4 min",
          updatedAt: "January 15, 2025",
          content: (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Glossary of Terms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">EMAP</h4><p className="text-sm text-gray-600">El-Meena Farms Management Platform</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">EMAPS</h4><p className="text-sm text-gray-600">El-Meena Processing and Sales Platform</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">EMMP</h4><p className="text-sm text-gray-600">El-Meena Marketplace Platform</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">SoR</h4><p className="text-sm text-gray-600">System of Record</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">Lot</h4><p className="text-sm text-gray-600">Traceable production batch</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">QA</h4><p className="text-sm text-gray-600">Quality Assurance</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">GCC</h4><p className="text-sm text-gray-600">Gulf Cooperation Council</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">NDVI</h4><p className="text-sm text-gray-600">Normalized Difference Vegetation Index</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">FOB</h4><p className="text-sm text-gray-600">Free on Board</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">CIF</h4><p className="text-sm text-gray-600">Cost, Insurance, Freight</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">LC</h4><p className="text-sm text-gray-600">Letter of Credit</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">CP%</h4><p className="text-sm text-gray-600">Crude Protein percentage</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><h4 className="font-semibold text-gray-800">GeoJSON</h4><p className="text-sm text-gray-600">Geospatial data format for GPS boundaries</p></div>
              </div>
            </div>
          ),
        },
      ],
    },
  ];
}

// ============= DOCUMENTATION PAGE =============

export function DocumentationClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<{ [key: string]: "yes" | "no" | null }>({});

  const docData = getDocData();

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedCategory
        ? docData.filter((cat) => cat.id === selectedCategory)
        : docData;
    }

    const query = searchQuery.toLowerCase().trim();
    return docData
      .map((category) => ({
        ...category,
        articles: category.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query) ||
            article.description.toLowerCase().includes(query) ||
            article.content?.toString().toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.articles.length > 0);
  }, [searchQuery, selectedCategory]);

  const currentArticle = useMemo(() => {
    if (!selectedArticle) return null;
    for (const category of docData) {
      for (const article of category.articles) {
        if (article.id === selectedArticle) {
          return article;
        }
      }
    }
    return null;
  }, [selectedArticle]);

  const currentCategory = useMemo(() => {
    if (!currentArticle) return null;
    return docData.find((cat) => cat.id === currentArticle.category);
  }, [currentArticle]);

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticle(articleId);
    setIsMobileSidebarOpen(false);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    setIsMobileSidebarOpen(false);
  };

  const handleVote = (articleId: string, vote: "yes" | "no") => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [articleId]: prev[articleId] === vote ? null : vote,
    }));
  };

  const renderArticle = (article: DocArticle | null) => {
    if (!article) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-xl font-semibold text-gray-700">Select an Article</h3>
          <p className="mt-2 text-gray-500 max-w-md">
            Choose a topic from the sidebar to get started with the documentation.
          </p>
        </div>
      );
    }

    const Icon = article.icon;
    const isHelpful = helpfulVotes[article.id];

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/app-guide" className="hover:text-[#2e7d32]">
              Documentation
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href="#"
              onClick={() => handleCategorySelect(article.category)}
              className="hover:text-[#2e7d32]"
            >
              {docData.find((cat) => cat.id === article.category)?.title}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700">{article.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2e7d32]/10 text-[#2e7d32]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {article.readTime} read
                </span>
                <span>•</span>
                <span>Updated {article.updatedAt}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="prose prose-green max-w-none">{article.content}</div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Was this helpful?</span>
              <button
                onClick={() => handleVote(article.id, "yes")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isHelpful === "yes"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                Yes
              </button>
              <button
                onClick={() => handleVote(article.id, "no")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isHelpful === "no"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                No
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const categoryArticles = docData.find(
                (cat) => cat.id === article.category
              )?.articles;
              if (!categoryArticles) return null;
              const currentIndex = categoryArticles.findIndex(
                (a) => a.id === article.id
              );
              return (
                <>
                  {currentIndex > 0 && (
                    <button
                      onClick={() =>
                        handleArticleSelect(categoryArticles[currentIndex - 1].id)
                      }
                      className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Previous</p>
                        <p className="text-sm font-medium text-gray-700">
                          {categoryArticles[currentIndex - 1].title}
                        </p>
                      </div>
                    </button>
                  )}
                  {currentIndex < categoryArticles.length - 1 && (
                    <button
                      onClick={() =>
                        handleArticleSelect(categoryArticles[currentIndex + 1].id)
                      }
                      className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-right hover:bg-gray-50 transition-colors sm:ml-auto"
                    >
                      <div>
                        <p className="text-xs text-gray-500">Next</p>
                        <p className="text-sm font-medium text-gray-700">
                          {categoryArticles[currentIndex + 1].title}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="flex min-h-[calc(100vh-64px)] flex-col">
        <section className="bg-gradient-to-r from-[#2e7d32] to-[#1b5e20] text-white py-10">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Documentation</h1>
                <p className="mt-1 text-green-100 max-w-2xl">
                  Complete user guide for EMAP, EMAPS, and EMMP platforms
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-72 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 pl-10 text-white placeholder:text-white/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="sticky top-14 z-30 bg-white border-b border-gray-200 px-4 py-2 md:hidden flex items-center justify-between">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {isMobileSidebarOpen ? "Close" : "Menu"}
          </button>
          {selectedArticle && (
            <span className="text-sm text-gray-500 truncate max-w-[200px]">
              {currentArticle?.title}
            </span>
          )}
        </div>

        <div className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-8">
            <aside
              className={`hidden md:block w-64 lg:w-72 flex-shrink-0 transition-all duration-300 ${
                isSidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              <div className="sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto pr-4 space-y-2">
                <button
                  onClick={() => handleCategorySelect(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === null && !selectedArticle
                      ? "bg-[#2e7d32] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    All Topics
                  </div>
                </button>

                {filteredCategories.map((category) => {
                  const CategoryIcon = category.icon;
                  const isActive = selectedCategory === category.id;
                  const articleCount = category.articles.length;

                  return (
                    <div key={category.id} className="space-y-1">
                      <button
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-[#2e7d32]/10 text-[#2e7d32]"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4" />
                            <span>{category.title}</span>
                          </div>
                          <span className="text-xs text-gray-400">{articleCount}</span>
                        </div>
                      </button>

                      {isActive && (
                        <div className="ml-4 space-y-1 border-l-2 border-[#2e7d32]/20 pl-2">
                          {category.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleSelect(article.id)}
                              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                                selectedArticle === article.id
                                  ? "bg-[#2e7d32]/10 text-[#2e7d32] font-medium"
                                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <article.icon className="h-3 w-3" />
                                {article.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {isMobileSidebarOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 md:hidden"
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
                <aside className="fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl md:hidden overflow-y-auto pt-20 pb-6 px-4">
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        handleCategorySelect(null);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        All Topics
                      </div>
                    </button>

                    {filteredCategories.map((category) => {
                      const CategoryIcon = category.icon;
                      const isActive = selectedCategory === category.id;
                      const articleCount = category.articles.length;

                      return (
                        <div key={category.id} className="space-y-1">
                          <button
                            onClick={() => handleCategorySelect(category.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-[#2e7d32]/10 text-[#2e7d32]"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="h-4 w-4" />
                                <span>{category.title}</span>
                              </div>
                              <span className="text-xs text-gray-400">{articleCount}</span>
                            </div>
                          </button>

                          {isActive && (
                            <div className="ml-4 space-y-1 border-l-2 border-[#2e7d32]/20 pl-2">
                              {category.articles.map((article) => (
                                <button
                                  key={article.id}
                                  onClick={() => handleArticleSelect(article.id)}
                                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                                    selectedArticle === article.id
                                      ? "bg-[#2e7d32]/10 text-[#2e7d32] font-medium"
                                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <article.icon className="h-3 w-3" />
                                    {article.title}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </aside>
              </>
            )}

            <div className="flex-1 min-w-0">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                {searchQuery && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500">
                      Showing {filteredCategories.reduce((acc, cat) => acc + cat.articles.length, 0)}{" "}
                      results for &quot;{searchQuery}&quot;
                    </p>
                    {filteredCategories.reduce((acc, cat) => acc + cat.articles.length, 0) === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        No results found. Try a different search term.
                      </p>
                    )}
                  </div>
                )}

                {currentArticle ? (
                  renderArticle(currentArticle)
                ) : searchQuery ? (
                  <div className="space-y-6">
                    {filteredCategories.map((category) => (
                      <div key={category.id}>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                          <category.icon className="h-5 w-5 text-[#2e7d32]" />
                          {category.title}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {category.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleSelect(article.id)}
                              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-[#2e7d32] hover:bg-gray-50 transition-all"
                            >
                              <article.icon className="h-5 w-5 text-[#2e7d32]" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800">{article.title}</p>
                                <p className="text-sm text-gray-500 truncate">{article.description}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedCategory ? (
                  <div>
                    {filteredCategories.map((category) => (
                      <div key={category.id}>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-4">
                          <category.icon className="h-6 w-6 text-[#2e7d32]" />
                          {category.title}
                        </h2>
                        <p className="text-gray-600 mb-6">{category.description}</p>
                        <div className="grid grid-cols-1 gap-3">
                          {category.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleSelect(article.id)}
                              className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 text-left hover:border-[#2e7d32] hover:bg-gray-50 transition-all group"
                            >
                              <article.icon className="h-6 w-6 text-[#2e7d32]" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 group-hover:text-[#2e7d32] transition-colors">
                                  {article.title}
                                </p>
                                <p className="text-sm text-gray-500">{article.description}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {article.readTime}
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#2e7d32] group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Documentation Topics</h2>
                    <p className="text-gray-600 mb-6">
                      Browse our documentation to learn how to use the EMAP ecosystem effectively.
                      Select a category to get started.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {docData.map((category) => {
                        const CategoryIcon = category.icon;
                        return (
                          <button
                            key={category.id}
                            onClick={() => handleCategorySelect(category.id)}
                            className="group rounded-xl border border-gray-200 p-5 text-left hover:border-[#2e7d32] hover:shadow-md transition-all bg-white"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2e7d32]/10 text-[#2e7d32] group-hover:scale-110 transition-transform">
                                <CategoryIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800 group-hover:text-[#2e7d32] transition-colors">
                                  {category.title}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {category.articles.length} articles
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2e7d32] group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/faq"
                  className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm border border-gray-100 hover:border-[#2e7d32] hover:shadow-md transition-all"
                >
                  <HelpCircle className="h-5 w-5 text-[#2e7d32]" />
                  <div>
                    <p className="font-medium text-gray-800">FAQ</p>
                    <p className="text-xs text-gray-500">Frequently asked questions</p>
                  </div>
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm border border-gray-100 hover:border-[#2e7d32] hover:shadow-md transition-all"
                >
                  <MessageSquare className="h-5 w-5 text-[#2e7d32]" />
                  <div>
                    <p className="font-medium text-gray-800">Contact Support</p>
                    <p className="text-xs text-gray-500">Get help from our team</p>
                  </div>
                </Link>
                <Link
                  href="/blog"
                  className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm border border-gray-100 hover:border-[#2e7d32] hover:shadow-md transition-all"
                >
                  <Bookmark className="h-5 w-5 text-[#2e7d32]" />
                  <div>
                    <p className="font-medium text-gray-800">Blog</p>
                    <p className="text-xs text-gray-500">Latest updates and tips</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

     
      <ScrollToTop />
    </div>
  );
}