# 📦 SmartyAI - Smart Order Management & E-Commerce Platform in Algeria
### *THE LUXURY SUITE FOR ALGERIAN MERCHANTS & DROP-SHIPPERS*

**SmartyAI** is an integrated cloud-based system (Full-Stack App) specifically designed to accompany and empower e-commerce merchants and marketers in the Algerian market. The app combines the power of Google's **Gemini** generative AI models to extract orders instantly, official national payment gateways to automatically activate subscriptions, and professional logistics integrations with major Algerian delivery companies in a single, seamless user interface.

---

## 🚀 Key Technical and Innovative Features

### 1. Mobile Order Extraction via AI (Gemini SDK Wrapper)
* **Support for Unstructured & Multimodal Inputs**: Merchants can paste an entire chat history from Facebook Messenger or WhatsApp, upload a screenshot of a receipt/invoice (Image Checkout Receipt), or send a vocal note. The AI will handle parsing, organizing, and saving the data.
* **Smart Handling of Local Logistics**: The model instantly recognizes Algerian recipient names, standardizes phone numbers (evaluating their format quality), performs accurate Wilaya classification (mapping and normalizing Arabic/French names), matches Communes (municipalities), and identifies the customer's delivery preference—whether home delivery (`home`) or office pick-up (`desk / bureau`).
* **Resilient Model Fallback Strategy**: Within `src/server/config.ts`, we developed the custom `generateContentWithRetry` engine to automatically cycle through Gemini models (`gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`) using Exponential Backoff to absorb temporary API errors and safeguard vital merchant operations.

### 2. Independent Digital Storefronts (Storefront Ecosystem)
* **Custom Public Sales Pages**: Every merchant instantly gets a unique digital storefront path (`/store/:merchantId`) displaying their active inventory in an elegant, mobile-responsive layout designed for fast loading.
* **Fast Checkout & Shopping Cart**: The `StorefrontCart.tsx` and `PublicCheckoutForm.tsx` interfaces allow buyers to choose the required size, color, and quantity, with auto-calculated shipping rates and real-time inventory tracking.

### 3. Subscription Gateways & Automated Upgrades (Chargily Pay V2)
* **Instant Automated Link**: Direct integration with Algeria's leading national payment gateway, **Chargily Pay**, facilitating seamless payments using Algeria Post's Edahabia card or CIB bank cards.
* **Interactive Sandbox Environment**: If the cloud API key is missing or not configured, subscribers are intelligently guided to an integrated sandbox payment simulator within the UI for safe testing of the checkout experience.
* **CCP & Administrative Approval**: The app also features a traditional subscription upgrade flow allowing users to upload postal transfer (CCP) receipts, coupled with a specialized dashboard for admin approval to inspect receipts and manually activate accounts.

### 4. Algerian Shipping & Courier Dispatch Engine
* **Comprehensive Coverage of Major Delivery Agencies**: Smooth virtual integration that instantly generates tracking numbers and customized thermal waybills for major Algerian shipping companies active in the market:
  * **Yalidine Express** • **ZR Express** • **Maystro Delivery** • **Ecotrack** • **Anderson Express** • **Procolis** • **Nord & Sud Express** • **Fastlo** • **Kazi Tour** • **Soudia Express** • **Colisliv**.
* **Anti-Return Analysis & Risk Mitigation (Return Rate Analytics)**: A smart system that calculates and measures delivery success rates across Algeria's 58 Wilayas, highlighting high-risk, high-return-rate Wilayas with red flags so merchants can call and verbally confirm the order before dispatch.

### 5. Network Watchdogs, Security Shields & Monitoring (PWA & Watchdogs)
* **Offline Resilience**: Integration of the `NetworkStatus.tsx` component to monitor network connectivity in wholesalers or low-coverage warehouses, buffering changes for reliable local/cloud synchronization later.
* **iFrame Security Shields**: A built-in security checker (Redirection & Auth Watchdog) bypassing strict cookie restrictions within framed previews on developers' browsers, offering an intelligent tooltip that guides merchants to launch the application safely in a standalone window.
* **Secure Webhooks with Signatures**: Direct digital payment verification hooks secured with modern cryptographic signatures (HMAC SHA-256) to prevent fraud and guarantee reliable payment confirmations.

---

## 📂 Directory Architecture

```text
SmartyAI Workspace
├── .env.example                       # Template for environment variables and API keys
├── .gitignore                         # List of ignored files for build artifacts and local configs
├── firebase-applet-config.json       # Active verification config for Firebase connection
├── firebase-applet-config.example.json# Reference template for database setup and Firestore collections
├── firebase-blueprint.json            # Collections and rules layout schema for Firebase
├── firestore.rules                    # Critical security and read/write permission rules for Firestore
├── index.html                         # Entry browser loading template for React views
├── metadata.json                      # Application permissions and settings for AI Studio
├── package.json                       # Package scripts, dependencies, and build settings (React + Express)
├── server.ts                          # Main Express cloud server entrypoint (AI, Shipping, Payments)
│
├── 📁 src/                            # Font-end source code and UI logic
│   ├── main.tsx                       # Initial mounting bridge for React v19 / Vite v6
│   ├── App.tsx                        # Master router, iframe observer, session and auth supervisor
│   ├── index.css                      # Global styled styles powered by Tailwind CSS v4
│   ├── types.ts                       # Standard data structures (Orders, Merchants, Plans, Products)
│   │
│   ├── 📁 components/                 # Extracted and reusable modular interfaces (Modular UI)
│   │   ├── LandingPage.tsx            # Multi-lingual interactive platform portal (AR / FR / EN)
│   │   ├── Sidebar.tsx                # Flexible side-navigation drawer for admin screens
│   │   ├── Dashboard.tsx              # Comprehensive analytic dashboard with live custom order filters
│   │   ├── OrderInput.tsx             # Bulk message compiler and AI order parser interface
│   │   ├── OrderReview.tsx            # Verification modal for address normalization & geolocation mapping
│   │   ├── WilayasList.tsx            # Geological guide for Algeria's 58 Wilayas with shipping calculator
│   │   ├── AdminDashboard.tsx         # Backend review for CCP upgrades, approvals, and transaction logs
│   │   ├── MerchantProducts.tsx       # Live storefront inventory manager, products admin & images
│   │   ├── DynamicStorefront.tsx      # Public-facing sales portal with unique sharing links
│   │   ├── StorefrontCart.tsx         # Customer checkout flow with integrated shipping options
│   │   ├── Subscription.tsx           # Premium subscription options, billing card UI, and invoice generator
│   │   ├── FirebaseProvider.tsx       # Authorization contexts and state hooks for Firestore security
│   │   ├── ErrorBoundary.tsx          # Wrapper preventing unexpected frontend failures from breaking the app
│   │   ├── Settings.tsx               # Settings for APIs, credentials, social accounts, and default fees
│   │   ├── NetworkStatus.tsx          # Real-time network detection line to maintain local state offline
│   │   └── Notifications.tsx          # Alert indicators and logs of newly placed store orders
│   │
│   ├── 📁 lib/                        # Helpers and utilities
│   │   ├── firebase.ts                # Cloud connection setups and authentication tools
│   │   ├── notifications.ts           # Shared functions dispatching user alerts inside Firestore
│   │   ├── security.ts                # HMAC signatures helper confirming payment requests and messenger payloads
│   │   └── translations.ts            # Global dictionary for three system languages (AR / FR / EN)
│   │
│   └── 📁 server/                     # Backend components and server-side routes
│       ├── config.ts                  # Firebase declarations, billing models, and Gemini backup strategies
│       └── 📁 routes/                 # Core endpoints for AI, shipping, and storefront interactions
│           ├── ai.routes.ts           # Multilingual message and image extraction endpoints
│           ├── subscription.routes.ts # Subscription sessions, billing hooks, and simulated checkout routes
│           ├── shipping.routes.ts     # Delivery engine interface and waybills dispatcher
│           ├── store.routes.ts        # Direct-to-consumer store api and delivery calculations
│           ├── inventory.routes.ts    # Secure media uploads and product resource endpoints
│           └── 📁 webhooks/           # Integrations receiving callbacks from external networks
│               ├── chargily.routes.ts # Webhook processing secure Chargily updates via HMAC verification
│               └── facebook.routes.ts # Messenger platform message callbacks and webhooks
```

---

## 🛠️ Installation & Run Guide

### 1. Prerequisites & Cloning
Ensure you have **Node.js** installed (version 18 or higher is recommended). Install the required packages:
```bash
npm install
```

### 2. Environment Configurations
Create a `.env` file in the root directory following the keys in `.env.example`:
```env
# Server-side Gemini AI key used to parse and extract data
GEMINI_API_KEY=your_gemini_api_key_here

# Chargily Pay V2 national checkout credentials
CHARGILY_SECRET_KEY=your_chargily_secret_key_here
CHARGILY_WEBHOOK_SECRET=your_chargily_webhook_signature_here
```

### 3. Set Up Firebase Infrastructure
1. Create a new project in your [Firebase Console](https://console.firebase.google.com).
2. Enable **Cloud Firestore** and **Firebase Authentication** (Google and Email providers).
3. Register a Web App, then copy the configuration data into a file named `firebase-applet-config.json` at the project's root:
```json
{
  "apiKey": "your_api_key",
  "authDomain": "your_auth_domain",
  "projectId": "your_project_id",
  "storageBucket": "your_storage_bucket",
  "messagingSenderId": "your_sender_id",
  "appId": "your_app_id",
  "firestoreDatabaseId": "(default)"
}
```

### 4. Running the Fast Nest Dev Server (Express + Vite)
To launch the unified development server on port `3000`:
```bash
npm run dev
```

### 5. Production Build & Execution
To bundle the frontend resources and compile the Express server into a highly optimized, standalone `dist/server.cjs` file:
```bash
npm run build
npm start
```

---

## 🌐 Social Media Webhooks API Integration Guide

To process and extract customer orders automatically the moment a message lands in your Facebook Page, Instagram account, or WhatsApp Business dashboard, configure your webhooks to point to **SmartyAI**'s endpoints:

### 📊 Webhook Endpoint Routers

| Provider / Channel | 🌐 API Endpoint URL | Protocol | `server.ts` Controller |
| :--- | :--- | :--- | :--- |
| **Facebook Messenger** | Meta Messenger Platform API | HTTP POST / GET | `/api/webhooks/facebook` |
| **Instagram Direct** | Instagram Graph Messaging | Meta Webhooks Client | `/api/webhooks/facebook` |
| **WhatsApp Business** | Cloud WhatsApp API / Twilio | Express Request Payload | `/api/webhooks/facebook` |
| **Unified Webhook**   | Unified CRM Multi-Channel API | Secure Custom Payload | `/api/webhooks/master` |

---

### 🚀 Setup Steps to Enable Automated Order Parsing:

1. **Configure Meta Developer Dashboard**:
   * Navigate to [developers.facebook.com](https://developers.facebook.com) and create a Business App type.
   * Add the "Messenger" or "Instagram Graph API" product to your application.
   * Generate a Page Access Token and save it in your platform configurations.

2. **Establish Verification Handshake (Verification Challenge)**:
   * In your Meta Webhooks configuration page, input the callback endpoint:
     `https://your-domain.com/api/webhooks/facebook`
   * Under "Verify Token", input the corresponding value defined in your server router: `smarty_verification_token` (or configure via the `FACEBOOK_VERIFY_TOKEN` env variable).
   * The Express server will instantly verify the challenge handshake and successfully configure the webhook subscription in seconds.

3. **Handling Chat Events via JSON Extraction**:
   When a customer message is received, Meta will publish a webhook callback containing the raw chat input. The server picks up the payload, safely submits it to our `/api/extract-order` AI interface to build the order schema, saves it inside Firestore, and informs the merchant's dashboard with live visual and audio notifications.

---
*SmartyAI • The ultimate AI-powered ecosystem to skyrocket and modernize retail and delivery across Algeria's 58 Wilayas.*
