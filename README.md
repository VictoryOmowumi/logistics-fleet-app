# Truck&Co Logistics Fleet App

![Truck&Co App Banner](public/app-banner.png)

Truck&Co is a modern logistics operations dashboard for dispatch, fleet oversight, and order tracking. It brings together map-based visibility, operational insights, and streamlined management workflows in a polished Next.js experience.

## Highlights

- Dispatch console with live map context powered by Leaflet
- Drivers, vehicles, orders, and users management pages
- Auth flows including verification and password reset
- Responsive UI with theme support and modern component primitives

## Tech Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS + Radix UI + Phosphor icons
- NextAuth for authentication
- MongoDB with Mongoose
- Resend for transactional email
- Leaflet + React-Leaflet for maps

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or pnpm/yarn)
- MongoDB instance (local or Atlas)
- Resend API key (optional, for email flows)

### Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Create `.env.local` at the project root
   ```bash
   MONGODB_URI=your-mongodb-connection-string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret
   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM="TruckCo Logistics <no-reply@truckco.com>"
   EMAIL_PROVIDER=resend
   ```
3. Start the dev server
   ```bash
   npm run dev
   ```

Open `http://localhost:3000` in your browser.

## Scripts

- `npm run dev` Start the development server
- `npm run build` Build for production
- `npm run start` Start the production server
- `npm run lint` Run ESLint

## Project Structure

- `src/app` App Router routes and pages
- `src/components` UI building blocks and shared components
- `public` Static assets including the app banner

## Deployment

Build and run locally with:

```bash
npm run build
npm run start
```

