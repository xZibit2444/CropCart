# CropCart GH

Farm-to-consumer logistics platform connecting local Ghanaian farms with urban buyers and wholesalers. Sealed cold chain, tracked loads, harvest-fresh delivery.

## Features

- **Live routing** - Real-time delivery tracking with cold-chain monitoring
- **Farm verification** - Curated Ghanaian growers with traceability
- **Wholesale orders** - EDI-ready pallet reservations with lot tracking
- **Local sourcing** - Reduces transport emissions and supports community farming

## Tech Stack

- **Frontend**: HTML5, CSS3, vanilla JavaScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- Responsive design (mobile-first)
- Smooth entrance animations with scroll-triggered reveals
- Serverless architecture with Supabase Edge Functions

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cropcart-gh.git
cd cropcart-gh
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your API URL and public anon key from Project Settings → API
4. Create a `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Locally

```bash
# Start local dev server
python -m http.server 4173

# Open in browser
http://localhost:4173
```

### 4. Database Schema

Set up these tables in Supabase SQL Editor:

```sql
-- Waitlist
CREATE TABLE waitlist (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Early Access
CREATE TABLE early_access (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Farm Applications
CREATE TABLE farm_applications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  location TEXT NOT NULL,
  products TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter Subscriptions
CREATE TABLE newsletter (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Design System

- **Font**: Manrope (Google Fonts)
- **Primary Color**: #2faa5a (green)
- **Design**: Apple-inspired minimalism, no gradients, restrained animations
- **Responsive breakpoints**: 900px, 620px

## Team

CropCart GH Team · Sourcing that keeps farms thriving and cities fed.

---

Built for Ghana's farmers and cities.
