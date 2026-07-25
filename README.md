# Bilscore • Your Everyday Payments, Simplified

[demo](https://bilscore.com) — [github](https://github.com/mybilscore/Billscore-) — [docs](https://docs.bilscore.com) — [discord](https://discord.gg/bilscore)

> **Bilscore** is Nigeria's premier VTU and billing platform. It enables users to buy airtime, data, electricity tokens, cable TV subscriptions, and pay bills instantly via WhatsApp, USSD, mobile app, and API. Built for everyone - from smartphone users to feature phone users.

---

## Features

* **Multi-Channel Access**: Buy airtime, data, electricity, and cable TV via WhatsApp AI Bot, USSD (*123#), Mobile App, or Web Dashboard.
* **Electricity Pre-Order**: Purchase electricity tokens days in advance to avoid network failures when you need power.
* **Smart Subscriptions**: Auto-purchase electricity monthly with intelligent conditional logic - never run out of power.
* **Offline USSD Mode**: Pre-filled USSD codes work offline via your phone dialer - no internet required.
* **AI-Powered WhatsApp Bot**: Natural language understanding for effortless transactions. Just type what you need!
* **Retailer Starter Credit (RSC)**: Zero-interest micro-loans (₦3,000-₦5,000) for retailers to start selling without capital.
* **Developer API Platform**: Comprehensive REST API for third-party developers and businesses to integrate Bilscore services.
* **QR Code Payments**: Generate and scan QR codes for instant electricity and cable TV payments - no app required.
* **Agent Dashboard**: Manage your business, track sales, and monitor performance all in one place.
* **Secure & Reliable**: Bank-grade security with 99.9% uptime guarantee.

---

## Channels

| Channel | Description | Access |
|---------|-------------|--------|
| **WhatsApp AI Bot** | AI-powered natural language understanding | Message us on WhatsApp |
| **USSD** | Works on all phones - even feature phones | Dial *123# |
| **Mobile App** | Full-featured iOS and Android app | Download from App Store/Play Store |
| **Web Dashboard** | Admin and agent management console | Web browser |
| **Developer API** | REST API for third-party integration | API documentation |
| **QR Code** | Scan to pay - no app required | QR code on meter/decoder |

---

## Stack

1. **Frontend**: [Next.js 14](https://nextjs.org) + [React 18](https://react.dev) + [TypeScript](https://typescriptlang.org)
2. **Mobile App**: [Flutter](https://flutter.dev) (iOS & Android)
3. **Styling**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
4. **Database**: [MySQL 8.0](https://mysql.com) with [Prisma ORM](https://prisma.io)
5. **Queue System**: [BullMQ](https://bullmq.io) + [Redis 7](https://redis.io)
6. **AI/NLP**: [OpenAI GPT-4](https://openai.com) for WhatsApp bot
7. **WhatsApp Integration**: [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp)
8. **USSD Gateway**: [Africa's Talking](https://africastalking.com) / [Beem](https://beem.africa)
9. **Payment Integration**: [Flutterwave](https://flutterwave.com) / [Paystack](https://paystack.com)
10. **VTU Vendors**: [VTPass](https://vtpass.com) / [Quickteller](https://quickteller.com)
11. **Deployment**: [Vercel](https://vercel.com) (Web) + [Railway](https://railway.app) (Database)
12. **QR Code**: [qrcode.js](https://github.com/davidshimjs/qrcodejs) for QR generation

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- [Git](https://git-scm.com)
- [MySQL](https://mysql.com) (v8.0+)
- [Redis](https://redis.io) (v7+)
- [Flutter](https://flutter.dev) (for mobile app)

### Clone and Setup

```bash
git clone https://github.com/mybilscore/Billscore-.git
cd bilscore-app
npm install
cp .env.example .env