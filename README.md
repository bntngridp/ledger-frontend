# Ledger Frontend — Cross-Platform Fintech & Crypto Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000000.svg?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-Web%20%2F%20Mobile-61DAFB.svg?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Testing-2EAD33.svg?logo=playwright)](https://playwright.dev/)

Ledger Frontend is a modern, responsive **Cross-Platform Mobile & Web Fintech Application** designed for seamless fiat e-wallet management and crypto asset operations. Built with **React Native**, **Expo Router**, and **TypeScript**, it provides an intuitive, high-performance user experience across Mobile viewports and Desktop web screens.

---

## 🌟 Key Features

### 1. 📊 Interactive Multi-Asset Dashboard
- **Asset Summary Card**: Real-time display of total estimated balance in IDR, portfolio breakdown (`IDR`, `USDT`, `USDC`), and asset performance charts.
- **Privacy Mode**: One-tap eye icon toggle to hide/show sensitive balance details.
- **Quick Action Row**: Responsive 5-item action grid (**Top Up**, **Withdraw**, **Transfer**, **Swap**, **Crypto Receive**) with equalized visual card heights.

### 2. 💳 Fiat Top-Up & Withdrawal Engine
- **IDR Deposit (Top-Up)**: Preset quick-amount chips (Rp 50k, 100k, 250k, 500k, 1M), custom amount inputs, and direct integration with **Midtrans Snap Payment Gateway** (Virtual Accounts & QRIS).
- **IDR Withdrawal**: Interactive Bank & E-Wallet selector modal supporting major Indonesian financial channels:
  - 🏦 **Banks**: BCA, Mandiri, BNI, BRI, Permata Bank, CIMB Niaga.
  - 📱 **E-Wallets**: DANA, OVO, GoPay, ShopeePay, LinkAja.
  - Automated fixed administration fee calculation (Rp 2.500) and review confirmation modals.

### 3. 🪙 Crypto Wallet & Instant Swap
- **Crypto Balances & Receive QR**: Dedicated asset overview with QR code generation for EVM deposit addresses and one-click address copying.
- **Crypto P2P Send**: Address validation, network selection, and real-time gas fee estimation.
- **Instant Asset Swap**: Live conversion rate calculator, slippage tolerance settings, and instant IDR $\leftrightarrow$ Crypto swap confirmation.

### 4. 🔐 Security & Account Management
- **Two-Factor Authentication (2FA)**: Google Authenticator TOTP setup, 16 downloadable recovery codes, and multi-option deactivation modals.
- **Dedicated Change Password Flow**: Email OTP request triggers, countdown timers, and password confirmation validation.
- **Notification Center**: Real-time notification feeds with unread counters and read/unread filtering.

### 5. 🎭 Automated E2E Playwright Simulation Suite
- Master Playwright E2E test suite ([`scripts/test_ui_full_simulation.js`](file:///Users/bintang/Documents/Github/Ledger/ledger-frontend/scripts/test_ui_full_simulation.js)) covering all 9 core UI modules.
- Supports both **Headless** (CI execution) and **Headed** (`headless: false` live desktop observation) test runner modes.

---

## 🛠️ Tech Stack & Dependencies

- **Core Framework**: React Native (Web & Mobile) via Expo SDK 52
- **Routing & Navigation**: Expo Router v4 (File-based routing)
- **Language**: TypeScript (Strict Mode)
- **Styling & UI**: Custom Design Tokens, Themed Components, Ionicons / Vector Icons
- **HTTP Client**: Axios with automatic JWT interceptors
- **E2E Testing**: Playwright Test (Chromium)

---

## 📋 Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/bntngridp/ledger-frontend.git
cd ledger-frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 3. Start the Development Server
```bash
# Start Expo dev server
npx expo start

# Or run directly on Web (Port 7071)
npm run web
```

---

## 🧪 Running Playwright E2E UI Simulations

To run the automated E2E simulation suite across all 9 UI modules:

```bash
# Run Master UI Simulation
node scripts/test_ui_full_simulation.js

# Run Fiat Topup & Withdraw Selector Test
node scripts/test_ui_fiat.js
```

> **Visual Demonstration**: To watch the Chromium browser pop up and perform UI actions automatically on your screen, set `headless: false` in `scripts/test_ui_full_simulation.js`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
