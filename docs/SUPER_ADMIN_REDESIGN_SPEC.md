# IMSU FOSS JOURNALS — SUPER ADMIN OPERATING CENTER REDESIGN SPEC (PHASE 6)

## 1. DESIGN IDENTITY & "EMERALD FOREST" DESIGN SYSTEM

Inspired by the compact, high-contrast overview architecture of `exam-prep-dashboard`, translated into the institutional academic identity of IMSU FOSS Journals.

### A. CSS Design Tokens (`app/globals.css`)

```css
/* Light Mode (Warm Institutional Parchment) */
:root {
  --background: 247 247 245; /* #f7f7f5 Warm clean canvas */
  --foreground: 18 24 20; /* #121814 Deep institutional ink */
  --card: 255 255 255; /* #ffffff Crisp white cards */
  --card-foreground: 18 24 20;
  --primary: 16 122 76; /* #107a4c Forest Academic Green */
  --primary-foreground: 255 255 255;
  --secondary: 240 244 241; /* #f0f4f1 Pale sage tint */
  --muted-foreground: 100 116 108; /* #64746c Balanced slate-sage */
  --border: 226 232 228; /* #e2e8e4 Clean card border */
  --accent-gold: 217 119 6; /* #d97706 Restrained Gold */
  --page-glow: rgba(16, 122, 76, 0.04);
}

/* Dark Mode (High-End Midnight Emerald / Forest Slate) */
.dark {
  --background: 10 17 14; /* #0a110e Deep Forest Obsidian */
  --foreground: 242 247 244; /* #f2f7f4 Crisp mint-white */
  --card: 15 26 20; /* #0f1a14 Elevated Cypress Slate */
  --card-foreground: 242 247 244;
  --primary: 52 211 153; /* #34d399 Vivid Emerald Accent */
  --primary-foreground: 10 17 14;
  --secondary: 22 36 28; /* #16241c Subdued Pine Surface */
  --muted: 22 36 28;
  --muted-foreground: 142 168 154; /* #8ea89a Sage Muted Text */
  --border: 28 48 37; /* #1c3025 Subtle Forest Outline */
  --accent-gold: 234 179 8; /* #eab308 Gold Highlights */
  --page-glow: rgba(52, 211, 153, 0.12); /* Ambient Emerald Glow */
  --shadow-card:
    0 0 0 1px rgba(52, 211, 153, 0.06), 0 16px 34px rgba(2, 8, 5, 0.55);
}
```

### B. Micro-Typography & Spacing Standards

- **Section Eyebrows**: `text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground`
- **Primary Metrics / Headers**: `text-sm sm:text-[15px] font-semibold tracking-[-0.02em] text-foreground`
- **Sub-notes & Descriptions**: `text-[12px] sm:text-[13px] text-muted-foreground`
- **Unified Card Lists**: Group related data into single cards with `border-t border-border/70 py-2.5 first:border-t-0 first:pt-0 last:pb-0`

---

## 2. QA FEEDBACK ACTION ITEMS (RESOLVING GOOGLE DOC NOTES)

### Action 1: Bypass Workspace Chooser for Super Admin (`app/admin/page.tsx` & Auth Routing)

- When a `SUPER_ADMIN` logs in, route them directly to `/admin` (Platform Administration).
- Super Admins should never see the author research workspace chooser prompt.

### Action 2: Overview-First Super Admin Dashboard (`app/admin/page.tsx`)

- Structure the dashboard into clean **Overview Sections**:
  1. **Quick Pulse Metrics**: Total active journals, pending action items count.
  2. **Operational Queue Card**: Compact list surfacing:
     - Receipts awaiting review (link to `/admin/psychology` or department ops)
     - Submissions awaiting tracking IDs
     - New submission requests
  3. **Active Departments / Journals Card**: Clean row list showing Psychology and expansion slots.
  4. **Platform Staff Summary**: Journal Admins + Editors counts with quick link to `/admin/access`.

### Action 3: User Management Cleanup (`app/admin/access/page.tsx`)

- Fix the double-search-bar regression → restore a single, responsive search input.
- Consolidate individual user cards into **one unified table card** with row dividers, clean role badges, and action dropdowns.
- Keep the current test/mock data intact for UI verification.

---

## 3. EXECUTION GUARDRAILS (DO NOTs)

- Do NOT rewrite backend schemas, Prisma migrations, or Supabase policies.
- Do NOT introduce automated payment gateways.
- Ensure all 72 existing tests continue passing (`npm test`).
