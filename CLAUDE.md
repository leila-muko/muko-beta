# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Muko is a "Decision Intelligence for Fashion" web app — a multi-step creative workspace that guides fashion designers through concept development, specification refinement, and analysis. Currently in beta.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm start         # Start production server
npm run lint      # ESLint
```

No test framework is configured yet.

## Tech Stack

- **Next.js 16** with App Router, React 19, TypeScript 5
- **Tailwind CSS v4** with custom design system (see `tailwind.config.ts`)
- **Zustand** for client-side state (`lib/store/sessionStore.ts`)
- **Supabase** for auth and database (`lib/supabase/`)
- **Framer Motion** for animations
- **Radix UI** for dialog and dropdown primitives

## Architecture

### Multi-Step Wizard Flow

The core UX is a linear 4-step workflow, each a separate route:

1. **Entry** (`/entry`) — Collection name + season selection, persisted to localStorage
2. **Concept Studio** (`/concept`) — Aesthetic direction, mood board, color palette, brand DNA scoring
3. **Spec Studio** (`/spec`) — Category, target MSRP, material, silhouette, construction tier, cost validation
4. **Report** (`/report`) — Three-dimensional scoring (Identity, Resonance, Execution) + "Ask Muko" chat

### State Management

`lib/store/sessionStore.ts` is a single Zustand store holding all session data across steps (entry fields, concept fields, spec fields, pulse scores, navigation state). Components read/write directly to this store.

### Auth & Middleware

- `middleware.ts` protects `/dashboard`, `/analysis`, `/settings` — redirects unauthenticated users to `/auth/signin`
- Supabase server client (`lib/supabase/server.ts`) uses cookie-based auth for server components
- Supabase browser client (`lib/supabase/client.ts`) for client components
- OAuth callback handled at `/auth/callback/route.ts`

### Intelligence & Calculation Modules

- `lib/spec-studio/calculator.ts` — COGS, margin analysis, timeline prediction
- `lib/spec-studio/material-matcher.ts` — Material recommendations based on aesthetic + cost ceiling
- `lib/spec-studio/smart-defaults.ts` — Category/silhouette-based defaults
- `lib/concept-studio/utils.ts` — Aesthetic matching, mood board analysis, color harmonization, brand DNA scoring
- `lib/recommendations.ts` — Seasonal aesthetic trend recommendations
- `lib/alternatives.ts` — Cost-saving and timeline optimization suggestions

### Data

Static JSON files in `lib/data/` (categories, materials, keywords) power the selection UIs and recommendation engine. Database models are defined in `lib/types/database.ts` (BrandProfile, Analysis, SavedCollection) but not yet fully wired to persistence.

## Design System

- **Fonts**: Sohne Breit (headings, local files in `app/fonts/`), Inter (body, Google Fonts)
- **Colors**: Olive ink (#43432B), Chartreuse, Camel, Steel, Rose — defined as semantic tokens in Tailwind config
- **Shadows**: Custom `muko-sm` through `muko-xl` with olive-toned shadows
- **Glass morphism**: Heavy use of backdrop-blur, saturate, layered overlays (grain, glaze, vignette)
- **Animations**: `animate-float`, `pulse-glow`, `fadeIn` defined in `globals.css`

## Path Aliases

`@/*` maps to project root (e.g., `import { cn } from '@/lib/utils'`).

## Key Conventions

- `AskMuko.tsx` currently uses mock responses — marked with TODOs for Claude API integration
- Pulse scores (Identity, Resonance, Execution) use a `PulseState` type: `{ status: 'green'|'yellow'|'red', score: number, message: string }`
- UI components in `components/ui/` are minimal primitives (button, input) using `clsx` + `tailwind-merge` via a `cn()` utility
