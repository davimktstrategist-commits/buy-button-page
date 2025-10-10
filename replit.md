# Roleta do Tigre - Aplicativo de Jogo com PIX

## Overview
The "Roleta do Tigre" project is a comprehensive online roulette game application featuring a green tiger theme. Its core purpose is to provide an engaging gaming experience coupled with seamless financial transactions via BRPIX for deposits and withdrawals. The application operates publicly without requiring user logins, utilizing anonymous sessions. The project aims to deliver a fully functional Minimum Viable Product (MVP) that includes both the game interface and an administrative panel. The business vision is to tap into the online gaming market with a unique theme and efficient payment processing, offering a user-friendly and secure platform.

## User Preferences
I prefer simple language in explanations. I like an iterative development workflow, so please propose changes and improvements in stages. Ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex logic. Do not make changes to the `public/` folder unless absolutely necessary for core game functionality, and do not modify the `server/seed.ts` file without explicit instruction.

## System Architecture

### UI/UX Decisions
The frontend employs a dual architecture: a static HTML/CSS/JS game interface and a React/TypeScript administrative Single Page Application (SPA). The game's design follows a dark green casino theme, utilizing Bootstrap 5 and custom CSS. The admin panel uses Shadcn UI with Tailwind CSS, featuring a dark theme sidebar and a dashboard with animated SVG sparklines for metrics. Typography uses Inter for UI and body text, and Poppins for titles and large numbers. Components are custom-styled Shadcn UI with elevation, hover/active states, and smooth animations.

### Technical Implementations
**Frontend:**
- **Game:** Static files in `public/`, Bootstrap 5, custom CSS. Uses anonymous `sessionId` via `localStorage` (UUID v4) for user tracking. Intercepts `fetch()` requests to add `sessionId`.
- **Admin:** React/TypeScript SPA (`client/`), Vite, Shadcn UI, Tailwind CSS. Token-based authentication for admin users.
**Backend:**
- **Framework:** Express.js with TypeScript.
- **Database:** PostgreSQL (Neon) managed with Drizzle ORM.
- **Authentication:** Anonymous user sessions for the game (auto-creation of user if `sessionId` is new). Password-based authentication for admin panel via environment variables (`ADMIN_PASSWORD`).
- **Payment Gateway:** BRPIX for PIX transactions.
- **PHP-Compatibility:** Supports PHP-compatible routes (`/ajax/*.php` and `/api/*.php`) for the HTML frontend, and dedicated `/api/admin/*` routes for the React admin panel.

### Feature Specifications
- **Roulette Game:** Animated roulette with 12 segments and configurable multipliers (1x to 100x). Includes a bonus wheel, real-time balance, and game history. Features a simulated recent winners list in the upper left corner showing other players' winnings to enhance engagement.
- **Payment System:** BRPIX integration for PIX deposits (dynamic QR Code, copy-paste code, configurable expiration) and withdrawals (PIX key requests, admin approval). Features automatic 10.5% split for commission.
- **Admin Panel:**
    - **Dashboard:** Real-time metrics (Game Profit, Total Wagered, Deposits Today, Payouts, Total Users, Confirmed Deposits, Total Account Balance, Paid Withdrawals) with sparklines. Graphs for 7-day deposits and top user balances.
    - **Management:** Users (balance, history), Deposits (history, BRPIX IDs, status), Withdrawals (approval/rejection, PIX keys, auto-refund on rejection).
    - **Roulette Configuration:** Adjustable probabilities per multiplier for main and bonus roulettes, with auto-save.
- **Authentication & Security:** Anonymous `sessionId` for game users. Admin panel uses password-based login with JWT-like tokens (24-hour expiry). BRPIX credentials are secured in environment variables.

### System Design Choices
- **Public Access:** The game is fully public, relying on `localStorage` for anonymous user sessions, eliminating the need for traditional user registration.
- **Dual Frontend Approach:** Allows for rapid deployment of the game while providing a robust, modern interface for administration.
- **Microservice-like Separation:** Clear distinction between game, payment, and admin API endpoints, though residing within a single Express application.
- **Database Schema:** `users`, `games`, `transactions`, `withdrawals`, `roulette_config`, `sessions` tables to manage all aspects of the application.

## External Dependencies

- **BRPIX Gateway:** Used for all PIX-based deposit and withdrawal functionalities.
    - `BRPIX_SECRET_KEY` (secret)
    - `BRPIX_COMPANY_ID` (secret)
- **PostgreSQL Database:** Provided by Neon, used as the primary data store.
- **Drizzle ORM:** Used for database interaction with PostgreSQL.
- **Vite:** Build tool for the React admin frontend.
- **Shadcn UI:** Component library for the React admin panel.
- **Tailwind CSS:** Utility-first CSS framework for styling the React admin panel.
- **Bootstrap 5:** Frontend framework for the static HTML game interface.