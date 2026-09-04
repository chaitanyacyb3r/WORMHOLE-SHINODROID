# DOCUMENT 2: PAGE_SPECS.md

## Shinodroid Page-by-Page UI Specifications

### Global Components (Used Across All Pages)

---

#### COMPONENT: Top Navigation Bar (Landing/Public Pages)

text

```
┌─────────────────────────────────────────────────────────────────┐
│  🛡️ Shinodroid          Features  Pricing  Docs     [Sign In] [Start Free →]  │
│  ─── border-bottom: 1px solid var(--border-subtle) ──────────  │
└─────────────────────────────────────────────────────────────────┘
```

- **Position:** `sticky top-0 z-50`
- **Background:** `var(--glass-bg-heavy)` with `backdrop-filter: blur(24px)`
- **Height:** 64px
- **Content max-width:** `var(--container-2xl)` centered
- **Logo:** Icon mark + "Shinodroid" wordmark, gradient-text on hover
- **Nav links:** `var(--text-secondary)`, on hover → `var(--text-primary)`, `transition: var(--duration-fast)`
- **"Sign In":** Ghost button — transparent bg, `var(--text-secondary)` text, on hover `var(--surface-3)` bg
- **"Start Free →":** `.btn-primary` with arrow icon, subtle `var(--glow-sm)` on hover
- **Scroll behavior:** Background opacity goes from 0% to 85% as user scrolls past 100px (use Intersection Observer)
- **Mobile (< 768px):** Hamburger menu, slide-in drawer from right

---

#### COMPONENT: Dashboard Sidebar (dashboard-shell.tsx — REDESIGN)

text

```
┌──────────────────────┐
│  🛡️ Shinodroid       │ ← Logo + wordmark (hidden when collapsed)
│                      │
│  ┌──────────────────┐│
│  │▌ Dashboard       ││ ← Active: gradient left border + tinted bg
│  └──────────────────┘│
│    📤 New Scan       │
│    📋 Scan History   │
│    ⚙️ Settings       │
│                      │
│                      │
│  ──── divider ─────  │
│                      │
│  ┌──────────────────┐│
│  │ 👤 User Name     ││ ← Avatar + name + plan badge
│  │    Free Plan     ││
│  │    [Upgrade]     ││
│  └──────────────────┘│
│  [◀ Collapse]        │ ← Toggle to 72px icon-only mode
└──────────────────────┘
   Width: 260px (expanded) / 72px (collapsed)
```

- **Background:** `var(--surface-1)` — one step above page bg
- **Border right:** `1px solid var(--border-subtle)`
- **Width expanded:** 260px | **Collapsed:** 72px
- **Collapse animation:** `width transition var(--duration-normal) var(--ease-out)`
- **Nav items:**
    - Default: `var(--text-secondary)`, `padding: 10px 16px`, `border-radius: var(--radius-sm)`
    - Hover: `bg: var(--surface-2)`, `color: var(--text-primary)`
    - Active: `bg: rgba(124, 58, 237, 0.1)`, `color: var(--accent)`, left border `3px solid var(--accent)`, icon also tinted accent
- **User section:** Fixed to bottom, separated by `1px solid var(--border-subtle)` divider above
- **Plan badge:** `.badge` with outline style, "Free" / "Pro" / "Team"
- **Collapsed state:** Only icons visible, centered, tooltip on hover showing label
- **Mobile (< 1024px):** Hidden by default, hamburger triggers slide-in overlay with `var(--overlay-heavy)` backdrop
- **Existing logic to preserve:** All navigation routes, auth context for user info

---

#### COMPONENT: Dashboard Top Bar

text

```
┌──────────────────────────────────────────────────────────────┐
│  Good morning, Alex 👋                    🔔 (3)   [+ New Scan]  │
└──────────────────────────────────────────────────────────────┘
```

- **Position:** Sticky within main content area (not global)
- **Background:** `var(--surface-0)` with bottom border `var(--border-subtle)`
- **Greeting:** Uses time-of-day (morning/afternoon/evening) + user's first name from Convex `users.viewer`
- **Notification bell:** `Lucide Bell` icon, relative positioned badge (count from Convex if implemented, else static)
- **"+ New Scan" button:** `.btn-primary`, `Link` to `/dashboard/scan`
- **Height:** 64px

---

### PAGE 1: LANDING PAGE [REDESIGN]

**Route:** `/` → `src/app/page.tsx`  
**Status:** EXISTS — complete visual rewrite, keep route structure

---

#### SECTION 1.1 — HERO

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Top Nav — see Global Component above]                                │
│                                                                         │
│                                                                         │
│                    Your AI-Built App                                     │  ← --text-display, --text-primary
│                    Isn't Safe Yet.                                       │  ← "Safe" uses .gradient-text
│                                                                         │
│           Automated security analysis for Android apps                  │  ← --text-body-lg, --text-secondary
│           built with AI. Upload your APK. Get a comprehensive           │
│           security report in minutes.                                   │
│                                                                         │
│        [ 🔍 Analyze Your First APK — Free ]    [ ▶ Watch Demo ]        │  ← .btn-primary large + ghost btn
│                                                                         │
│           Trusted by 2,000+ developers                                  │  ← --text-caption, --text-muted
│        [logo] [logo] [logo] [logo] [logo]                              │  ← Grayscale opacity:40 logos
│                                                                         │
│                      ┌───────────────────────┐                          │
│                      │    HERO VISUAL         │                          │  ← Canva Asset 1 (phone+shield)
│                      │    (illustration)      │                          │
│                      └───────────────────────┘                          │
│                                                                         │
│                          ↓ scroll                                       │  ← Animated chevron, pulse
│                                                                         │
│  ░░░░░░░░░░░░░░░ bg-grid pattern at 3% opacity ░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░ radial gradient: accent at 5% opacity, centered top ░░░░░░░  │
└─────────────────────────────────────────────────────────────────────────┘
  Height: 100vh (full viewport)
  Background: var(--surface-0) + .bg-grid overlay + radial purple glow
```

**Content Hierarchy:**

1. Headline (largest, first read)
2. Subheadline (context)
3. CTA buttons (conversion)
4. Social proof (trust)
5. Hero visual (engagement)

**Animations:**

- Headline: `fadeInUp`, delay 0ms
- Subheadline: `fadeInUp`, delay 100ms
- CTA buttons: `fadeInUp`, delay 200ms
- Social proof: `fadeIn`, delay 400ms
- Hero visual: `fadeIn` + subtle float (translateY ±8px, 6s cycle)
- Background grid: static (no animation, performance)
- Scroll indicator: `pulse` animation on the chevron

**Responsive:**

- Tablet: Stack headline + visual vertically, reduce display to h1 size
- Mobile: `--text-h2` for headline, single CTA button full-width, hide "Watch Demo"

---

#### SECTION 1.2 — PROBLEM STATEMENT

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    ┌─ badge ─────────────┐                              │
│                    │ ⚠️ The Problem      │                              │  ← .badge with --warning-bg
│                    └─────────────────────┘                              │
│                                                                         │
│        AI Writes Code Fast. It Also Writes                              │  ← --text-h2
│              Vulnerabilities Fast.                                      │
│                                                                         │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│   │ 🔑             │  │ 💾             │  │ 🔓             │           │
│   │ Hardcoded      │  │ Insecure       │  │ Missing        │           │
│   │ Secrets        │  │ Storage        │  │ Encryption     │           │
│   │                │  │                │  │                │           │
│   │ AI assistants  │  │ Sensitive data │  │ Network calls  │           │
│   │ frequently     │  │ stored in      │  │ without SSL    │           │
│   │ embed API keys │  │ plaintext      │  │ pinning or     │           │
│   │ directly in    │  │ SharedPrefs    │  │ certificate    │           │
│   │ source code    │  │ accessible to  │  │ validation     │           │
│   │                │  │ any app        │  │                │           │
│   │ ━ CRITICAL ━   │  │ ━ HIGH ━       │  │ ━ HIGH ━       │           │
│   └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                         │
│   padding-top: var(--space-4xl)                                        │
│   padding-bottom: var(--space-4xl)                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Card Design:**

- Background: `var(--surface-2)`
- Border: `1px solid var(--border)`
- On hover: border transitions to `var(--danger-border)`, subtle `var(--glow-danger)` shadow
- Severity strip at bottom: full-width bar colored by severity
- Icon: 48px, `var(--text-muted)` default, `var(--danger)` on card hover
- **Animation:** Cards stagger in with `fadeInUp`, 80ms delay between each. `.stagger-children`

---

#### SECTION 1.3 — HOW IT WORKS

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ┌─ badge ─────────────┐                              │
│                    │ ⚙️ How It Works     │                              │
│                    └─────────────────────┘                              │
│                                                                         │
│           From APK to Full Security Report                              │  ← --text-h2
│                    in 3 Steps                                           │
│                                                                         │
│     ┌────────┐ ─ ─ ─ ─ → ┌────────┐ ─ ─ ─ ─ → ┌────────┐            │
│     │  01    │            │  02    │            │  03    │            │
│     │  ☁️⬆  │            │  🔍   │            │  📄✓  │            │  ← Canva icons
│     │Upload  │            │Analyze │            │Report  │            │
│     │        │            │        │            │        │            │
│     │Drag &  │            │50+ sec │            │AI-     │            │
│     │drop    │            │checks  │            │powered │            │
│     │your APK│            │static &│            │detailed│            │
│     │file    │            │dynamic │            │report  │            │
│     └────────┘            └────────┘            └────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step Numbers:** Oversized `--text-h1`, `var(--accent)` at 15% opacity behind  
**Connector Lines:** Dashed SVG line, `stroke: var(--border)`, `stroke-dasharray: 8 4`  
**Cards:**

- Background: `var(--surface-2)`
- Hover: `translateY(-4px)`, `var(--shadow-md)`, border glow transition
- Step number badge: 32×32px circle, gradient background (`var(--gradient-start)` → `var(--gradient-end)`)  
    **Animation:** Stagger in from left, 150ms delay. Connector lines "draw" in (stroke-dashoffset animation)

---

#### SECTION 1.4 — FEATURES (Bento Grid)

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│     Everything You Need to Ship Secure Android Apps                    │
│                                                                         │
│   ┌──────────────────────────┐  ┌──────────────────────────┐           │
│   │  🔍 Static Analysis      │  │  ⚡ Dynamic Analysis     │           │  ← 2-col span each
│   │  Decompile & scan source │  │  Runtime behavior with   │           │
│   │  • Manifest analysis     │  │  • Frida instrumentation │           │
│   │  • Hardcoded secrets     │  │  • Logcat analysis       │           │
│   │  • Crypto misuse         │  │  • Network traffic       │           │
│   │  • Component exposure    │  │  • Runtime permissions   │           │
│   │                          │  │                          │           │
│   └──────────────────────────┘  └──────────────────────────┘           │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│   │ 🤖 AI      │ │ 🛡️ OWASP  │ │ ✅ 50+     │ │ 📤 Export  │         │  ← 1-col span each
│   │ Reports    │ │ Top 10     │ │ Checks     │ │ & Share    │         │
│   │ MiniMax    │ │ Mobile     │ │ Coverage   │ │ PDF, JSON  │         │
│   │ M2.5       │ │ mapped     │ │            │ │ team share │         │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
  Grid: 4 columns, gap var(--space-lg)
  Large cards: col-span-2
  Small cards: col-span-1
```

**Bento Card Design:**

- Background: `var(--surface-2)`
- Border: `1px solid var(--border)`
- Hover: Gradient border effect (pseudo-element behind, `border-radius` slightly larger, gradient background, visible through 1px gap)
- Large cards: `min-height: 280px`, padding `var(--space-xl)`
- Small cards: `min-height: 200px`, padding `var(--space-lg)`
- Icons: 40px, `var(--accent)` color
- Feature list items: `--text-body-sm`, `var(--text-secondary)`, bullet = small accent dot

**Hover animation on large cards:** A subtle scan-line effect — a horizontal line of `rgba(124,58,237,0.1)` moving top-to-bottom inside the card (CSS `background-position` animation, 3s cycle)

**Mobile:** Stack to single column, all cards full-width

---

#### SECTION 1.5 — REPORT PREVIEW

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│              See What Your Report Looks Like                            │
│                                                                         │
│         ┌─────────────────────────────────────────┐                     │
│         │                                         │                     │
│         │     [SCREENSHOT OF REPORT PAGE]         │ ← Actual screenshot │
│         │     (Figma export or browser capture)   │   of completed      │
│         │     Tilted ~2° with perspective          │   report page       │
│         │     var(--shadow-xl) behind              │                     │
│         │                                         │                     │
│         └─────────────────────────────────────────┘                     │
│                                                                         │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐                           │
│     │ Floating  │  │ Floating  │  │ Floating  │ ← Annotation callouts   │
│     │ callout 1 │  │ callout 2 │  │ callout 3 │   connected to screenshot│
│     │ "AI       │  │ "Code     │  │ "CVSS     │   by thin lines        │
│     │  Insights"│  │  Context" │  │  Scoring" │                         │
│     └──────────┘  └──────────┘  └──────────┘                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Screenshot treatment:**

- CSS `perspective(1200px) rotateY(-3deg) rotateX(2deg)` for slight 3D tilt
- `var(--shadow-xl)` for depth
- Rounded corners `var(--radius-xl)` with overflow hidden
- Optional: Subtle animated gradient border

**Callout cards:**

- `var(--surface-3)` bg, `var(--radius-md)` corners
- Connected to screenshot via SVG lines (thin, `var(--border)`)
- `--text-caption` text
- On scroll-into-view: `fadeInUp` with stagger

---

#### SECTION 1.6 — PRICING

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│              Start Free. Scale When Ready.                              │
│                                                                         │
│             [ Monthly ]  ○──●  [ Annual — Save 20% ]                   │  ← Toggle, pill style
│                                                                         │
│   ┌──────────────┐  ┌══════════════════╗  ┌──────────────┐             │
│   │    Hobby      │  ║   Professional   ║  │  Enterprise   │             │
│   │               │  ║  ★ Most Popular  ║  │               │             │
│   │    Free       │  ║                  ║  │   $99/mo      │             │
│   │               │  ║    $29/mo        ║  │               │             │
│   │  • 3 scans/mo │  ║                  ║  │  • Everything │             │
│   │  • Static only│  ║  • Unlimited     ║  │    in Pro     │             │
│   │  • Basic rpt  │  ║  • Static+Dyn   ║  │  • Team mgmt  │             │
│   │  • Community  │  ║  • AI reports    ║  │  • API access │             │
│   │    support    │  ║  • API access    ║  │  • SSO/SAML   │             │
│   │               │  ║  • Priority      ║  │  • SLA        │             │
│   │               │  ║    support       ║  │  • Dedicated  │             │
│   │               │  ║                  ║  │    support    │             │
│   │  [Start Free] │  ║  [Get Pro →]     ║  │  [Contact Us] │             │
│   └──────────────┘  ╚══════════════════╝  └──────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Pro card (highlighted):**

- Border: `2px solid var(--accent)` with `var(--glow-md)` shadow
- "Most Popular" badge: Gradient bg, positioned top, overlapping card edge by 12px
- Slightly larger scale: `transform: scale(1.03)`
- Background: `var(--surface-3)` (one level brighter than others)

**Other cards:**

- Border: `1px solid var(--border)`
- Background: `var(--surface-2)`
- CTA buttons: Secondary style for Hobby, ghost for Enterprise

**Price animation:** On toggle Monthly↔Annual, price numbers animate (count up/down, `--duration-normal`)

**Feature checkmarks:** `Lucide Check` in `var(--success)` for included, `Lucide X` in `var(--text-muted)` for excluded

---

#### SECTION 1.7 — FAQ

text

```
┌──────────────────────────────────────────────────────────────┐
│                Frequently Asked Questions                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ▶ Is my APK data secure?                      [+]   │   │ ← Collapsed
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ▼ What types of vulnerabilities do you detect? [-]  │   │ ← Expanded
│  │                                                      │   │
│  │  Shinodroid checks for 50+ vulnerability types       │   │
│  │  including hardcoded secrets, insecure storage,      │   │
│  │  missing network security, crypto misuse,            │   │
│  │  component exposure, and more — all mapped to        │   │
│  │  OWASP Mobile Top 10.                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ▶ How long does analysis take?                [+]   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ...6-8 total items...                                      │
└──────────────────────────────────────────────────────────────┘
  Max-width: var(--container-md)
  Centered
```

**Accordion design:**

- Item: `var(--surface-2)` bg, `1px solid var(--border)`, `var(--radius-base)` corners
- Gap between items: `var(--space-sm)`
- Question text: `--text-h5` weight 500, `var(--text-primary)`
- Expand icon: `Lucide ChevronDown`, rotates 180° on open, `transition: var(--duration-fast)`
- Answer text: `--text-body`, `var(--text-secondary)`, padding-top `var(--space-md)`
- Expand animation: `max-height` transition + `opacity` fade in, `var(--duration-normal)`

**Questions to include:**

1. Is my APK data secure?
2. What types of vulnerabilities do you detect?
3. How long does analysis take?
4. Do you support AAB (Android App Bundle)?
5. Can I integrate this into my CI/CD pipeline?
6. What makes this different from MobSF?
7. How does the AI report work?
8. What's your data retention policy?

---

#### SECTION 1.8 — FINAL CTA

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░  GRADIENT BG: var(--gradient-start) → var(--gradient-end)  ░░░░░ │
│  ░░░  at 8% opacity overlay on var(--surface-0)                 ░░░░░ │
│  ░░░                                                             ░░░░ │
│  ░░░           Don't Ship Vulnerable Apps.                       ░░░░ │  ← --text-h2, --text-primary
│  ░░░                                                             ░░░░ │
│  ░░░   Join 2,000+ developers who trust Shinodroid to catch     ░░░░ │  ← --text-body-lg, --text-secondary
│  ░░░   security issues before their users do.                    ░░░░ │
│  ░░░                                                             ░░░░ │
│  ░░░        [ 🔍 Start Your Free Security Scan ]                 ░░░░ │  ← .btn-primary large, white
│  ░░░                                                             ░░░░ │
│  ░░░   No credit card required · 3 free scans · 30s setup       ░░░░ │  ← --text-caption, --text-muted
│  ░░░                                                             ░░░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────────────────────┘
  Full-width section
  Padding: var(--space-4xl) top/bottom
  Background: Radial gradient of accent at very low opacity + grid pattern
```

---

#### SECTION 1.9 — FOOTER

text

```
┌─────────────────────────────────────────────────────────────────────────┐
│  border-top: 1px solid var(--border-subtle)                            │
│                                                                         │
│  🛡️ Shinodroid                                                         │
│  AI-powered Android                                                     │
│  security analysis                Product    Resources    Company      │
│                                   Features   Docs         About        │
│                                   Pricing    Blog         Contact      │
│                                   Changelog  API Ref      Careers      │
│                                   Security   Status       Legal        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  © 2025 WORMHOLE Security     [𝕏] [GitHub] [LinkedIn]    Privacy Terms │
│  Built with 🛡️ for the AI-first developer generation                   │
└─────────────────────────────────────────────────────────────────────────┘
  Background: var(--surface-1)
  Max-width content: var(--container-2xl)
  Padding: var(--space-3xl) top, var(--space-xl) bottom
```

---

### PAGE 2: LOGIN [REDESIGN]

**Route:** `/login` → `src/app/login/page.tsx`  
**Status:** EXISTS — visual rewrite, preserve all `@convex-dev/auth` logic

---

text

```
┌──────────────────────────────────┬───────────────────────────────────┐
│                                  │                                   │
│   LEFT PANEL (50%)               │   RIGHT PANEL (50%)               │
│                                  │                                   │
│   bg: gradient                   │   bg: var(--surface-0)            │
│   var(--surface-0) →             │                                   │
│   rgba(124,58,237,0.05)          │                                   │
│                                  │        Welcome back               │ ← --text-h3
│   ┌──────────────────────┐       │                                   │
│   │                      │       │   Sign in to your Shinodroid      │ ← --text-body, --text-secondary
│   │   🛡️ Shinodroid      │       │   account to continue             │
│   │   WORMHOLE Security  │       │                                   │
│   │                      │       │   ┌─────────────────────────┐     │
│   │   (Logo centered)    │       │   │  🐙 Continue with GitHub │     │ ← var(--surface-3) bg
│   │                      │       │   └─────────────────────────┘     │
│   └──────────────────────┘       │                                   │
│                                  │        ──── or ────               │ ← divider with text
│   Floating icons:                │                                   │
│   🔒 🛡️ 🔑 ⚡                    │   Email                          │
│   (very subtle, 8% opacity,     │   ┌─────────────────────────┐     │ ← .input
│    absolute positioned,          │   │ you@example.com         │     │
│    slow float animation)         │   └─────────────────────────┘     │
│                                  │                                   │
│                                  │   Password                        │
│                                  │   ┌─────────────────────────┐     │
│                                  │   │ ••••••••          [👁️]  │     │ ← .input + show/hide
│                                  │   └─────────────────────────┘     │
│                                  │                                   │
│                                  │   ☐ Remember me    Forgot pwd?   │
│   ┌──────────────────────┐       │                                   │
│   │  "Shinodroid caught  │       │   ┌─────────────────────────┐     │
│   │   3 critical vulns   │       │   │      Sign In →          │     │ ← .btn-primary full-width
│   │   in our app that    │       │   └─────────────────────────┘     │
│   │   AI completely      │       │                                   │
│   │   missed."           │       │   Don't have an account?          │
│   │   — Alex R., Founder │       │   Sign up →                       │ ← Link, --accent color
│   └──────────────────────┘       │                                   │
│   (testimonial card, glass bg)   │                                   │
│                                  │                                   │
└──────────────────────────────────┴───────────────────────────────────┘
  Full viewport height: 100vh
  Mobile (< 768px): Left panel hidden, right panel full-width with
  logo at top + small gradient bg accent
```

**States:**

1. **Default:** As shown above
2. **Loading:** "Sign In" button shows spinner, inputs disabled, `opacity: 0.7` on form
3. **Error:** Red inline message below the relevant input OR a toast notification at top of right panel. Input border → `var(--danger)`, subtle `var(--glow-danger)`
4. **Success:** Brief "Welcome back!" message, then redirect (handled by existing auth logic)

**What to preserve:** ALL `signIn` function calls, `useAuthActions`, `ConvexClientProvider` wrapping. Only change the JSX structure and styling.

**Animation:**

- Right panel form elements: `fadeInUp` with stagger (50ms per element)
- Left panel floating icons: Slow random drift `translateY(±10px)`, `duration: 8s`, different delays
- Testimonial card: `fadeIn` with 600ms delay

---

### PAGE 3: SIGNUP [REDESIGN]

**Route:** `/signup` → `src/app/signup/page.tsx`  
**Status:** EXISTS — same layout as login with differences noted

---

**Identical to Login layout** with these changes:

- Heading: "Create your account"
- Subheading: "Start analyzing your Android apps for security vulnerabilities"
- Additional field: "Full Name" input above Email
- Password field includes **strength indicator**:
    
    text
    
    ```
    Password
    ┌─────────────────────────┐
    │ ••••••••          [👁️]  │
    └─────────────────────────┘
    ████████░░░░░░░░░░░░ Strong  ← 4 segments, colored by strength
    ```
    
    - Weak (1/4): `var(--danger)` + "Weak"
    - Fair (2/4): `var(--warning)` + "Fair"
    - Good (3/4): `var(--info)` + "Good"
    - Strong (4/4): `var(--success)` + "Strong"
- CTA: "Create Account →"
- Bottom: "Already have an account? Sign in →"
- Terms text below button: `--text-caption`, `--text-muted`, "By creating an account, you agree to our Terms of Service and Privacy Policy"
- Left panel testimonial different quote

---

### PAGE 4: DASHBOARD [REDESIGN]

**Route:** `/dashboard` → `src/app/dashboard/page.tsx`  
**Status:** EXISTS — redesign within existing `dashboard-shell.tsx` wrapper

---

text

```
┌──── Sidebar ────┬─────────────────────────────────────────────────────────────┐
│                  │  ┌── Top Bar ──────────────────────────────────────────────┐│
│  (see Global     │  │  Good morning, Alex 👋              🔔(3)  [+ New Scan]││
│   Component)     │  └────────────────────────────────────────────────────────┘│
│                  │                                                             │
│                  │  ┌─ Stat ──┐ ┌─ Stat ──┐ ┌─ Stat ──┐ ┌─ Stat ──┐         │
│                  │  │Total    │ │Avg      │ │Critical │ │Monthly  │         │
│                  │  │Scans    │ │Score    │ │Issues   │ │Usage    │         │
│                  │  │         │ │         │ │         │ │         │         │
│                  │  │  47     │ │  74     │ │  12     │ │ 8/10    │         │
│                  │  │ ↑ 12%   │ │ [gauge] │ │ ↓ 3     │ │ [bar]   │         │
│                  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                  │                                                             │
│                  │  ┌── Recent Scans (60%) ────────┐ ┌── Vuln Dist (40%) ──┐ │
│                  │  │                               │ │                     │ │
│                  │  │  App Name    Score  Vulns  Date│ │   ┌─────────┐      │ │
│                  │  │  ─────────────────────────────│ │   │  DONUT  │      │ │
│                  │  │  MyApp.apk   🟢 87  2H 4M  2h│ │   │  CHART  │      │ │
│                  │  │  ShopApp     🟡 62  1C 3H  1d│ │   │         │      │ │
│                  │  │  GameApp     🔴 34  3C 5H  3d│ │   └─────────┘      │ │
│                  │  │  ...                          │ │   Legend:           │ │
│                  │  │                               │ │   🔴 Critical: 6   │ │
│                  │  │  [View All History →]         │ │   🟠 High: 14     │ │
│                  │  │                               │ │   🟡 Medium: 23   │ │
│                  │  ├───────────────────────────────┤ │   🔵 Low: 8       │ │
│                  │  │  Score Trend                  │ │   ⚪ Info: 4       │ │
│                  │  │  ┌─────────────────────────┐  │ │                     │ │
│                  │  │  │  📈 LINE CHART          │  │ ├─────────────────────┤ │
│                  │  │  │  (last 10 scans)        │  │ │  Quick Actions      │ │
│                  │  │  └─────────────────────────┘  │ │  📤 Upload APK      │ │
│                  │  │                               │ │  📄 Latest Report   │ │
│                  │  └───────────────────────────────┘ │  📊 View Trends    │ │
│                  │                                     ├─────────────────────┤ │
│                  │                                     │  Plan Usage         │ │
│                  │                                     │  Free Plan          │ │
│                  │                                     │  ████░░░░ 8/10     │ │
│                  │                                     │  [Upgrade to Pro]   │ │
│                  │                                     └─────────────────────┘ │
└──────────────────┴─────────────────────────────────────────────────────────────┘
```

**Stat Cards (4 across):**

- Background: `var(--surface-2)`
- Border: `1px solid var(--border)`
- Padding: `var(--space-lg)`
- Label: `--text-caption`, `var(--text-muted)`, uppercase, `--text-overline-ls`
- Value: `--text-h3`, `var(--text-primary)`, font-weight 700
- Trend indicator: Small arrow + percentage, green for up/good, red for up/bad (critical issues going up is bad)
- Avg Score card: Small inline SVG gauge ring (48px diameter) colored by score tier
- Monthly Usage card: Thin progress bar below the number, `var(--accent)` fill
- **Animation:** Numbers count up from 0 on mount, `var(--duration-slower)`. Stagger cards 60ms.

**Recent Scans Table:**

- Card container: `var(--surface-2)`, `var(--radius-base)`
- Table header: `--text-caption`, `var(--text-muted)`, uppercase, no bg, bottom border `var(--border-subtle)`
- Table rows: `padding: var(--space-md) var(--space-lg)`, bottom border `var(--border-subtle)`, hover bg `var(--surface-3)`
- Score badge: Pill shape `var(--radius-full)`, colored bg at 10% + text at 100%:
    - 86-100: success colors, "A"
    - 71-85: info colors, "B"
    - 51-70: warning colors, "C"
    - 31-50: high/orange colors, "D"
    - 0-30: danger colors, "F"
- Vulnerability mini-bar: Segmented horizontal bar showing C/H/M/L as colored segments, proportional width, `height: 6px`, `border-radius: var(--radius-full)`
- Status: "Completed" in `var(--success)`, "Scanning" with pulse animation, "Failed" in `var(--danger)`
- Clickable rows → navigate to `/dashboard/scan/[id]`
- "View All History →" link: `var(--accent)`, hover underline

**Score Trend Chart:**

- Use Recharts `<LineChart>` or `<AreaChart>`
- Line: `stroke: var(--accent)`, `strokeWidth: 2`
- Area fill: Linear gradient from `var(--accent)` at 20% opacity top to 0% bottom
- Grid: `stroke: var(--border-subtle)`
- Axis labels: `--text-caption`, `var(--text-muted)`
- Tooltip: `var(--surface-4)` bg, `var(--shadow-lg)`, shows scan name + score + date
- Dots on line: `fill: var(--accent)`, `r: 4`, on hover `r: 6` with glow

**Vulnerability Distribution Donut:**

- Use Recharts `<PieChart>` with `innerRadius={60} outerRadius={80}`
- Colors: `--critical-text`, `--danger-text` (high), `--warning-text`, `--info-text`, `--text-muted`
- Center: Total count in `--text-h4`
- Legend: Right-aligned, dot + label + count, `--text-body-sm`
- Hover: Segment expands slightly (`outerRadius += 4`), tooltip

**Quick Actions Card:**

- Background: `var(--surface-2)`
- Each action: Icon (24px, `var(--text-secondary)`) + label, full-width clickable row
- Hover: Icon → `var(--accent)`, bg → `var(--surface-3)`
- Links to respective pages

**Plan Usage Card:**

- Progress bar: `var(--surface-3)` track, `var(--accent)` fill
- Label: "8 of 10 scans used" in `--text-body-sm`
- "Upgrade to Pro" button: `.btn-secondary` small

**Empty State (new user, no scans):**

text

```
┌──────────────────────────────────────┐
│                                      │
│       [Empty State Illustration]     │  ← Canva Asset 3
│                                      │
│    Welcome to Shinodroid! 🛡️         │  ← --text-h4
│                                      │
│    Upload your first APK to start    │  ← --text-body, --text-secondary
│    analyzing it for security issues  │
│                                      │
│    [ 📤 Upload Your First APK ]      │  ← .btn-primary
│                                      │
└──────────────────────────────────────┘
  Centered in main content area
  Max-width: var(--container-xs)
```

**Skeleton Loading State:**

- Each stat card: `.skeleton` rectangles for value (120×32px) and label (80×16px)
- Table: `.skeleton` rows (5 rows), each with rectangular blocks matching column widths
- Charts: `.skeleton` circles (donut) and rectangle (line chart area)
- All skeletons use `var(--shimmer)` animation

**Data source:** `useQuery(api.scans.list)` — already wired. Compute stats client-side from the scans array.

---

### PAGE 5: APK UPLOAD [REDESIGN]

**Route:** `/dashboard/scan` → `src/app/dashboard/scan/page.tsx`  
**Status:** EXISTS — visual redesign, preserve all upload + mutation logic

---

text

```
┌──── Sidebar ────┬────────────────────────────────────────────────────────┐
│                  │                                                        │
│                  │  Dashboard > New Scan                                  │ ← Breadcrumb
│                  │                                                        │
│                  │  Start a New Security Scan                             │ ← --text-h3
│                  │  Upload your Android APK for comprehensive analysis   │ ← --text-body, --text-secondary
│                  │                                                        │
│                  │  ┌─── max-width: var(--container-sm), centered ──────┐│
│                  │  │                                                    ││
│                  │  │  ╔════════════════════════════════════════════╗    ││
│                  │  │  ║                                            ║    ││  ← Dashed border
│                  │  │  ║                                            ║    ││     animated dash rotation
│                  │  │  ║              ☁️⬆                           ║    ││  ← Cloud icon, 64px
│                  │  │  ║                                            ║    ││     float animation (subtle)
│                  │  │  ║     Drag & drop your APK file here        ║    ││  ← --text-body, --text-primary
│                  │  │  ║                                            ║    ││
│                  │  │  ║              — or —                        ║    ││  ← --text-caption, --text-muted
│                  │  │  ║                                            ║    ││
│                  │  │  ║         [ Browse Files ]                   ║    ││  ← .btn-secondary
│                  │  │  ║                                            ║    ││
│                  │  │  ║     .apk files up to 100MB                ║    ││  ← --text-caption, --text-muted
│                  │  │  ║                                            ║    ││
│                  │  │  ╚════════════════════════════════════════════╝    ││
│                  │  │                                                    ││
│                  │  │  ── After file selected: ──                       ││
│                  │  │                                                    ││
│                  │  │  ┌────────────────────────────────────────────┐   ││
│                  │  │  │  📦 MyApp.apk                      [✕]    │   ││ ← File info card
│                  │  │  │  45.2 MB · application/vnd.android.apk   │   ││
│                  │  │  │  ████████████████████░░░░ 78%             │   ││ ← Upload progress
│                  │  │  │  Uploading... 2.3 MB/s                    │   ││
│                  │  │  └────────────────────────────────────────────┘   ││
│                  │  │                                                    ││
│                  │  │         [ 🔍 Start Security Analysis ]            ││ ← .btn-primary large
│                  │  │                                                    ││
│                  │  │  Estimated time: ~3-5 minutes                     ││ ← --text-caption
│                  │  │                                                    ││
│                  │  └────────────────────────────────────────────────────┘│
│                  │                                                        │
│                  │  ┌──────┐ ┌──────┐ ┌──────┐                           │
│                  │  │🔒 APK│ │🚫 We │ │✅    │                           │ ← Trust badges row
│                  │  │encryp│ │never │ │OWASP │                           │
│                  │  │ted & │ │share │ │compli│                           │
│                  │  │deleted│ │your  │ │ant   │                           │
│                  │  │after │ │app   │ │      │                           │
│                  │  │scan  │ │      │ │      │                           │
│                  │  └──────┘ └──────┘ └──────┘                           │
│                  │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
```

**Dropzone States:**

1. **Empty (default):**
    
    - Border: `2px dashed var(--border)`, `border-radius: var(--radius-xl)`
    - Background: `var(--surface-1)` — slightly different from card to draw attention
    - Min-height: 320px
    - Dash animation: None (static dashes at rest)
2. **Drag over (file hovering):**
    
    - Border: `2px dashed var(--accent)`, transitions to solid
    - Background: `rgba(124, 58, 237, 0.05)`
    - Box shadow: `var(--glow-md)`
    - Cloud icon: Scales up to 1.1, color → `var(--accent)`
    - CSS: `animation: pulse-glow 1.5s infinite`
    - Text changes: "Drop your APK file here" (bolder)
3. **File selected (uploading):**
    
    - Dropzone collapses, replaced by file info card
    - File card: `var(--surface-2)`, `var(--radius-base)`, icon + name + size + remove button
    - Progress bar: `height: 4px`, `var(--surface-3)` track, `var(--accent)` fill with shimmer overlay
    - Upload speed text: `--text-caption`, `var(--text-muted)`
4. **Upload complete:**
    
    - Progress bar → full green `var(--success)`, then fades away
    - Checkmark icon animates in (scale 0→1.2→1, spring)
    - "Start Security Analysis" button appears with `fadeInUp`
5. **Error (wrong file type / too large):**
    
    - Border: `2px dashed var(--danger)`
    - Error message below: `var(--danger-text)` with `Lucide AlertCircle` icon
    - "Only .apk files under 100MB are supported"

**Trust Badges:**

- Three badges in a row, centered
- Each: `var(--surface-2)` bg, `1px solid var(--border)`, `var(--radius-md)`
- Icon (20px) + text (`--text-caption`, `var(--text-secondary)`)
- Padding: `var(--space-sm) var(--space-md)`

**Existing logic to preserve:**

- `useMutation(api.scans.create)` call
- File validation (size, type checking)
- `generateUploadUrl` for Convex file storage
- Navigation to `/dashboard/scan/[id]` after creation

---

### PAGE 6: SCAN DETAIL + REPORT [REDESIGN — MOST CRITICAL PAGE]

**Route:** `/dashboard/scan/[id]` → `src/app/dashboard/scan/[id]/page.tsx`  
**Status:** EXISTS — this is the crown jewel page, complete visual overhaul

This page has THREE distinct states based on `scan.status`:

---

#### STATE A: ANALYSIS IN PROGRESS (`status === "pending" || "scanning"`)

text

```
┌──── Sidebar ────┬────────────────────────────────────────────────────────┐
│                  │                                                        │
│                  │  Dashboard > Scans > MyApp.apk                        │
│                  │                                                        │
│                  │  ┌── App Info Bar ──────────────────────────────────┐  │
│                  │  │  📦 MyApp.apk · 45.2 MB · Started 2m ago       │  │
│                  │  │                           Elapsed: 02:34 ⏱️      │  │
│                  │  └─────────────────────────────────────────────────┘  │
│                  │                                                        │
│                  │  ┌── Analysis Pipeline ─────────────────────────────┐  │
│                  │  │                                                  │  │
│                  │  │  ✅ Upload & Validation ········· 0:03           │  │
│                  │  │  │                                               │  │
│                  │  │  ✅ APK Decompilation ··········· 0:12           │  │
│                  │  │  │                                               │  │
│                  │  │  ✅ Manifest Analysis ··········· 0:08           │  │
│                  │  │  │                                               │  │
│                  │  │  🔵 Static Code Analysis ········ In Progress   │  │ ← Pulsing glow
│                  │  │  │  ████████████░░░░░░░░░ 62%                   │  │
│                  │  │  │  Scanning 2,418 / 3,891 files...             │  │
│                  │  │  │                                               │  │
│                  │  │  ⏳ Dynamic Runtime Analysis ···· Pending        │  │
│                  │  │  │                                               │  │
│                  │  │  ⏳ AI Report Generation ········ Pending        │  │
│                  │  │                                                  │  │
│                  │  └─────────────────────────────────────────────────┘  │
│                  │                                                        │
│                  │  ┌── Live Findings ─────────────────────────────────┐  │
│                  │  │  Findings So Far: 27                             │  │
│                  │  │  ┌─ Summary Bar ──────────────────────────────┐  │  │
│                  │  │  │ 🔴 3  🟠 7  🟡 12  🔵 5  ⚪ 0            │  │  │
│                  │  │  └────────────────────────────────────────────┘  │  │
│                  │  │                                                  │  │
│                  │  │  🔴 Hardcoded AWS Secret Key                    │  │ ← New finding slides in
│                  │  │     ApiService.java · Insecure Data Storage     │  │
│                  │  │  🟠 Exported Activity without permission        │  │
│                  │  │     AndroidManifest.xml · Component Exposure    │  │
│                  │  │  🟡 Logging sensitive data                      │  │
│                  │  │     UserManager.java · Information Disclosure   │  │
│                  │  │  ...and 24 more                                 │  │
│                  │  │                                                  │  │
│                  │  └─────────────────────────────────────────────────┘  │
│                  │                                                        │
│                  │  ┌── Did You Know? ─────────────────────────────────┐  │
│                  │  │  💡 73% of AI-generated Android apps have at    │  │
│                  │  │  least one hardcoded API key in their source.   │  │
│                  │  │  ● ○ ○ ○                                        │  │ ← Auto-rotate tips
│                  │  └─────────────────────────────────────────────────┘  │
│                  │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
```

**Pipeline Step Design:**

Each step is a row with:

- **Connector line:** Vertical line, 2px wide
    - Completed: `var(--success)`, solid
    - Active→Pending boundary: Gradient from `var(--accent)` to `var(--border)`
    - Pending: `var(--border)`, dashed
- **Step indicator circle:** 28px diameter
    - Completed: `var(--success)` bg, white checkmark icon (12px)
    - Active: `var(--accent)` bg, `animation: pulse-glow 2s infinite`, spinner icon or pulsing dot
    - Pending: `var(--surface-3)` bg, `var(--border)` border, clock or empty
    - Failed: `var(--danger)` bg, X icon
- **Step label:** `--text-body`, `var(--text-primary)` for active/complete, `var(--text-muted)` for pending
- **Duration/Status:** Right-aligned, `--text-caption`, `var(--text-muted)` for time, `var(--accent)` for "In Progress"
- **Sub-progress (active step only):**
    - Progress bar: `height: 3px`, `var(--surface-3)` track, `var(--accent)` fill
    - Detail text: `--text-caption`, `var(--text-secondary)`, e.g., "Scanning 2,418 / 3,891 files..."

**Live Findings Feed:**

- Card: `var(--surface-2)`, `var(--radius-base)`
- Summary bar: Horizontal, segmented, shows count per severity as colored pills
- Each finding row: `padding: var(--space-sm) var(--space-md)`, severity dot (8px circle) + title + source
- New findings: `animation: slideInRight var(--duration-normal)` + brief highlight flash (`var(--accent)` bg at 5%, fading out)
- Max 5 visible, then "...and N more" in `--text-caption`
- **Real-time:** Uses Convex reactive `useQuery` — findings appear as backend discovers them

**"Did You Know?" Card:**

- `var(--surface-2)` bg, `var(--radius-base)`
- Auto-rotates every 8 seconds
- Progress dots at bottom
- Content: Security facts/tips (`--text-body-sm`, `var(--text-secondary)`)
- Transition: `fadeIn` crossfade

**Elapsed Timer:** Updates every second (client-side `setInterval`), shows `MM:SS` format

---

#### STATE B: COMPLETED REPORT (`status === "completed"`)

text

```
┌──── Sidebar ────┬────────────────────────────────────────────────────────┐
│                  │                                                        │
│                  │  ┌── Report Header (sticky) ───────────────────────┐  │
│                  │  │                                                  │  │
│                  │  │  📦 MyApp         ┌─────────┐   [📥 PDF]       │  │
│                  │  │  com.example.app  │  Score   │   [📋 JSON]      │  │
│                  │  │  v2.1.3           │         │   [🔗 Share]     │  │
│                  │  │  Scanned Dec 15   │   67    │   [🔄 Rescan]    │  │
│                  │  │  Duration: 4m 23s │   C     │                   │  │
│                  │  │                   │  [GAUGE]│                   │  │
│                  │  │                   └─────────┘                   │  │
│                  │  │                                                  │  │
│                  │  │  [ Overview ] [ Vulnerabilities ] [ Dynamic ]   │  │ ← Tabs
│                  │  └─────────────────────────────────────────────────┘  │
│                  │                                                        │
│                  │  ═══════════════════════════════════════════════════   │
│                  │                                                        │
│                  │              (Tab content below)                       │
│                  │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
```

**Report Header:**

- Position: `sticky top-0 z-30` within content area (below global top bar)
- Background: `var(--surface-0)` with `backdrop-filter: blur(12px)`, bottom border `var(--border-subtle)`
- Left: APK icon (placeholder 48px colored square) + App name (`--text-h4`) + package (`--text-caption`, `--text-muted`, monospace) + version badge + scan date
- Center: **Score Gauge** (see component spec below)
- Right: Action buttons row, each `.btn-secondary` small with icon

**Score Gauge Component:**

text

```
         ┌───────────┐
        ╱   ███████   ╲
       │  ██       ██  │      Ring: SVG circle, 120px diameter
       │ ██   67    ██ │      Stroke: 8px
       │  ██       ██  │      Color: Score-tier gradient
        ╲   ███████   ╱       Center: Number (--text-h2, bold)
         └───────────┘        Below number: Grade letter (--text-caption)
              C                Gap in ring at bottom (270° arc)
```

- SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset`
- **Mount animation:** Ring fills from 0 to target over `var(--duration-slower)` with `var(--ease-out)`
- Number counts up from 0 simultaneously
- Ring color determined by score tier:
    - 0-30: `var(--gradient-score-critical)` → red glow
    - 31-50: `var(--gradient-score-high)` → orange glow
    - 51-70: `var(--gradient-score-medium)` → yellow glow
    - 71-85: `var(--gradient-score-good)` → blue glow
    - 86-100: `var(--gradient-score-excellent)` → green glow

**Tabs:**

- Style: Underline tabs
- Each tab: `padding: var(--space-sm) var(--space-md)`, `--text-body-sm`, `font-weight: 500`
- Default: `var(--text-secondary)`, no underline
- Active: `var(--text-primary)`, bottom border `2px solid var(--accent)`, subtle text glow
- Hover (non-active): `var(--text-primary)`
- Tab switch animation: Underline slides to active tab position (animated `left` + `width` of pseudo-element)
- Content: Crossfade `opacity` + subtle `translateY(4px → 0)`, `var(--duration-fast)`

---

**OVERVIEW TAB:**

text

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌── Executive Summary ──────────────────────────────────────┐  │
│  │  This application has MODERATE security risk. 3 critical  │  │ ← AI-generated
│  │  vulnerabilities require immediate attention, including    │  │    from reportJson
│  │  hardcoded credentials and exported components. The app   │  │
│  │  lacks certificate pinning and stores sensitive data in   │  │
│  │  plaintext SharedPreferences.                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Stat ──┐ ┌─ Stat ──┐ ┌─ Stat ──┐ ┌─ Stat ──┐             │
│  │Score    │ │Total    │ │Critical/│ │OWASP   │             │
│  │  67/100 │ │Vulns    │ │High     │ │Coverage│             │
│  │  [gauge]│ │  27     │ │  8      │ │  8/10  │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  ┌── Severity Distribution ──────────────────────────────────┐  │
│  │  ████ 3 │████████ 5 │████████████████████ 12 │████ 5│██ 2│  │ ← Segmented bar
│  │  Crit    High         Medium                  Low    Info │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── Top Critical Findings ──────────────────────────────────┐  │
│  │                                                            │  │
│  │  🔴 Hardcoded AWS Secret Key                               │  │
│  │  CVSS 9.1 · Insecure Data Storage · ApiService.java       │  │
│  │  [View Details →]                                          │  │
│  │  ─────────────────────────────────────────────────────     │  │
│  │  🔴 SQL Injection via ContentProvider                      │  │
│  │  CVSS 8.9 · Injection · DataProvider.java                 │  │
│  │  [View Details →]                                          │  │
│  │  ─────────────────────────────────────────────────────     │  │
│  │  🔴 Debug Mode Enabled in Production                      │  │
│  │  CVSS 7.5 · Security Misconfiguration · AndroidManifest   │  │
│  │  [View Details →]                                          │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Executive Summary:**

- `var(--surface-2)` bg, left border `3px solid var(--accent)`, `var(--radius-base)`
- Text: `--text-body`, `var(--text-secondary)`, `line-height: var(--text-body-lh)`
- Source: `scan.reportJson` or `scan.aiReportStorageId` (AI-generated)

**Severity Distribution Bar:**

- Full-width horizontal bar, `height: 32px`, `border-radius: var(--radius-full)`
- Segments are proportionally sized by count
- Each segment: colored bg, white count number centered (if width allows), tooltip on hover
- Colors: Critical=`var(--critical-text)`, High=`var(--danger)`, Medium=`var(--warning)`, Low=`var(--info)`, Info=`var(--text-muted)`
- **Animation:** Segments grow from 0 width on mount, staggered left to right, `var(--duration-slower)`

**Top Critical Findings:**

- Card: `var(--surface-2)`
- Each finding: Left severity dot (10px, colored), title (`--text-body`, `var(--text-primary)`, weight 500), metadata below (`--text-caption`, `var(--text-muted)`), CVSS badge (pill, `var(--danger-bg)`)
- "View Details →" link: `var(--accent)`, switches to Vulnerabilities tab and scrolls to finding
- Divider: `1px solid var(--border-subtle)` between items

---

**VULNERABILITIES TAB:**

text

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌── Filters ────────────────────────────────────────────────┐  │
│  │  🔍 [Search vulnerabilities...]                           │  │
│  │  Severity: [All▾] Category: [All▾] Sort: [Severity ↓▾]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── Finding Card (Collapsed) ────────────────────────────────┐ │
│  │ 🔴 CRITICAL │ Hardcoded AWS Secret Key            [▼]     │ │
│  │ CVSS: 9.1  │ Insecure Data Storage │ ApiService.java      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌── Finding Card (Expanded) ─────────────────────────────────┐ │
│  │ 🔴 CRITICAL │ Hardcoded AWS Secret Key            [▲]     │ │
│  │ CVSS: 9.1  │ Insecure Data Storage │ ApiService.java      │ │
│  │ ─────────────────────────────────────────────────────────  │ │
│  │                                                            │ │
│  │ DESCRIPTION:                                               │ │
│  │ A hardcoded AWS access key was found in the source code.  │ │
│  │ This exposes your AWS infrastructure to unauthorized       │ │
│  │ access by anyone who decompiles the APK.                  │ │
│  │                                                            │ │
│  │ LOCATION:                                                  │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ 45 │ public class ApiService {                      │   │ │ ← Code block
│  │ │ 46 │   private static final String                  │   │ │    with syntax
│  │ │ 47▸│   AWS_KEY = "AKIAIOSFODNN7EXAMPLE";  ⚠️       │   │ │    highlighting
│  │ │ 48 │   private static final String                  │   │ │
│  │ │ 49 │   AWS_SECRET = "wJalrXUtnFEMI/...";           │   │ │
│  │ │                                          [📋 Copy]  │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │                                                            │ │
│  │ 🛡️ REMEDIATION:                                           │ │
│  │ 1. Remove hardcoded credentials immediately               │ │
│  │ 2. Use Android Keystore or encrypted SharedPreferences    │ │
│  │ 3. Implement server-side credential management            │ │
│  │ 4. Rotate the exposed AWS keys                            │ │
│  │                                                            │ │
│  │ 📚 REFERENCES:                                             │ │
│  │ • OWASP M9: Reverse Engineering                           │ │
│  │ • CWE-798: Hardcoded Credentials                          │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌── Finding Card (Collapsed) ────────────────────────────────┐ │
│  │ 🟠 HIGH     │ Exported Activity without Permission  [▼]   │ │
│  │ CVSS: 7.2  │ Component Exposure │ AndroidManifest.xml     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ... more findings ...                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Filter Bar:**

- Background: `var(--surface-2)`, `var(--radius-base)`, `padding: var(--space-md)`
- Search: `.input` with `Lucide Search` icon, `placeholder: "Search vulnerabilities..."`
- Severity filter: Dropdown/multi-select with colored severity dots
- Category filter: Dropdown with category names
- Sort: Dropdown (Severity ↓, CVSS ↓, Category A-Z)
- **Mobile:** Stack filters vertically, collapsible "Filters" section

**Finding Card — Collapsed:**

- Background: `var(--surface-2)`, `var(--radius-base)`, border `1px solid var(--border)`
- Left: Severity badge — colored pill (`var(--radius-xs)`, severity bg/text colors)
- Center: Title (`--text-body`, weight 500), then below: CVSS pill + category tag + file path in monospace
- Right: Expand chevron, rotates 180° on open
- Hover: `bg: var(--surface-3)`, `cursor: pointer`
- Left accent: `4px solid` severity color (vertical strip on left edge)
- Margin between cards: `var(--space-sm)`

**Finding Card — Expanded:**

- Same header as collapsed, chevron rotated
    
- Divider below header: `1px solid var(--border-subtle)`
    
- **Expand animation:** `max-height` from 0 + `opacity` 0→1, `var(--duration-normal) var(--ease-out)`
    
- Sections within expanded card:
    
    **Description:** `--text-body-sm`, `var(--text-secondary)`, `padding: var(--space-md) 0`
    
    **Code Block:**
    
    - Background: `var(--surface-1)` (darker than card, for contrast)
    - Border: `1px solid var(--border-subtle)`, `var(--radius-md)`
    - Font: `var(--font-mono)`, `var(--text-code)` size
    - Line numbers: `var(--text-muted)`, right-aligned, `padding-right: var(--space-md)`, border-right `1px solid var(--border-subtle)`
    - Highlighted line (vulnerability): `bg: var(--danger-bg)`, left border `3px solid var(--danger)`
    - Warning icon (⚠️) at end of highlighted line in `var(--danger)`
    - "Copy" button: Top-right of code block, `.btn-secondary` small with `Lucide Copy` icon
    - Max-height: 200px with scroll if needed
    
    **Remediation:**
    
    - Label: `--text-caption`, `var(--text-muted)`, uppercase, with shield icon
    - Numbered list: `--text-body-sm`, `var(--text-secondary)`
    - Each step: Number in `var(--accent)` + text
    
    **References:**
    
    - Label: `--text-caption`, `var(--text-muted)`, uppercase
    - Links: `var(--accent)`, hover underline, `--text-body-sm`
    - OWASP categories: Pill badges with `var(--info-bg)` bg

**Data mapping to Convex schema:**

- `finding.severity` → severity badge color
- `finding.title` → card title
- `finding.category` → category tag
- `finding.description` → expanded description
- `finding.recommendation` → remediation section
- `finding.cvssScore` → CVSS pill
- `finding.owaspCategory` → reference badges

---

**DYNAMIC ANALYSIS TAB:**

text

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Dynamic Runtime Analysis Results                               │ ← --text-h5
│  Powered by Frida instrumentation & Logcat analysis             │ ← --text-caption
│                                                                 │
│  ┌── Runtime Findings ────────────────────────────────────────┐ │
│  │  (Same card format as Static findings above)               │ │
│  │  But sourced from dynamicReportStorageId                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌── Frida Script Output ─────────────────────────────────────┐ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  (Monospace output, scrollable code block)           │  │ │ ← var(--font-mono)
│  │  │  [2024-12-15 10:23:45] Hooking SSL methods...       │  │ │
│  │  │  [2024-12-15 10:23:46] Certificate validation       │  │ │
│  │  │  bypassed at X509TrustManager.checkServerTrusted    │  │ │
│  │  │  ...                                                 │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌── Logcat Analysis ─────────────────────────────────────────┐ │
│  │  (Same format as Frida output)                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal-style output blocks:**

- Background: `#0d0d12` (slightly darker than surface-0)
- Font: `var(--font-mono)`, `var(--text-code)` size
- Border: `1px solid var(--border)`, `var(--radius-md)`
- Top bar: `var(--surface-2)` with three colored dots (🔴🟡🟢, 8px each) — terminal chrome
- Max-height: 400px with vertical scroll
- Timestamps in `var(--text-muted)`, warnings in `var(--warning)`, errors in `var(--danger)`

---

#### STATE C: FAILED (`status === "failed"`)

text

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          [Error State Illustration]                      │  ← Canva Asset 4
│                                                         │
│     Analysis Failed                                     │  ← --text-h4, --danger
│                                                         │
│     Something went wrong during the security analysis.  │  ← --text-body, --text-secondary
│     This could be due to an unsupported APK format      │
│     or a temporary server issue.                        │
│                                                         │
│     [ 🔄 Retry Analysis ]   [ ← Back to Dashboard ]    │  ← .btn-primary + .btn-secondary
│                                                         │
└─────────────────────────────────────────────────────────┘
  Centered, max-width: var(--container-xs)
```

---

### PAGE 7: SCAN HISTORY [REDESIGN]

**Route:** `/dashboard/reports` → `src/app/dashboard/reports/page.tsx`  
**Status:** EXISTS — visual redesign

---

text

```
┌──── Sidebar ────┬──────────────────────────────────────────────────────┐
│                  │                                                      │
│                  │  Scan History                                        │ ← --text-h3
│                  │                                                      │
│                  │  ┌─ Stats ─┐ ┌─ Stats ─┐ ┌─ Stats ─┐              │
│                  │  │Total: 47│ │Month: 12│ │Avg: 74  │              │ ← Inline stat pills
│                  │  └─────────┘ └─────────┘ └─────────┘              │
│                  │                                                      │
│                  │  ┌── Filter Bar ──────────────────────────────────┐  │
│                  │  │ 🔍 [Search app name...]  [Status▾] [Score▾]   │  │
│                  │  │                              [Date▾] [Sort▾]  │  │
│                  │  └───────────────────────────────────────────────┘  │
│                  │                                                      │
│                  │  ┌── Scan Row ────────────────────────────────────┐  │
│                  │  │  📦 MyApp.apk  v2.1.3                         │  │
│                  │  │  🟢 87 (A)  │ ██░░ 0C 2H 4M 3L │ 2h ago     │  │
│                  │  │  Duration: 4m 23s  │ ✅ Completed │ [→]       │  │
│                  │  └───────────────────────────────────────────────┘  │
│                  │                                                      │
│                  │  ┌── Scan Row ────────────────────────────────────┐  │
│                  │  │  📦 ShopApp.apk  v1.0.0                       │  │
│                  │  │  🟡 62 (C)  │ ████ 1C 3H 8M 2L │ 1 day ago  │  │
│                  │  │  Duration: 5m 11s  │ ✅ Completed │ [→]       │  │
│                  │  └───────────────────────────────────────────────┘  │
│                  │                                                      │
│                  │  ... more rows ...                                   │
│                  │                                                      │
│                  │  ┌── Pagination ──────────────────────────────────┐  │
│                  │  │  Showing 1-10 of 47    [< Prev] 1 2 3 [Next >]│  │
│                  │  └───────────────────────────────────────────────┘  │
│                  │                                                      │
└──────────────────┴──────────────────────────────────────────────────────┘
```

**Stat Pills (top):**

- Inline flex, gap `var(--space-sm)`
- Each: `var(--surface-2)` bg, `var(--radius-full)`, `padding: var(--space-xs) var(--space-md)`
- Label + value, `--text-caption`, label in `--text-muted`, value in `--text-primary`

**Scan Row Design:**

- Background: `var(--surface-2)`, `var(--radius-base)`, `border: 1px solid var(--border)`
- Margin between rows: `var(--space-sm)`
- Hover: `bg: var(--surface-3)`, `border-color: var(--border-strong)`, `cursor: pointer`
- Click → navigate to `/dashboard/scan/[id]`
- Layout: CSS Grid, 3 rows on mobile, 1 row on desktop
- Score: Same colored pill as dashboard table
- Severity mini-bar: Same as dashboard (6px height colored segments)
- Status badge: Pill with icon + text
    - Completed: `var(--success-bg)`, `var(--success-text)`, checkmark icon
    - Scanning: `var(--info-bg)`, `var(--info-text)`, spinner icon (animated)
    - Failed: `var(--danger-bg)`, `var(--danger-text)`, X icon
    - Pending: `var(--surface-3)`, `var(--text-muted)`, clock icon
- Arrow (→): `Lucide ChevronRight`, `var(--text-muted)`, hover → `var(--text-primary)`

**Empty State:** Same pattern as dashboard empty state (illustration + text + CTA)

**Animation:** Rows stagger in with `fadeInUp`, 40ms delay between each

---

### PAGE 8: SETTINGS [REDESIGN]

**Route:** `/dashboard/settings` → `src/app/dashboard/settings/page.tsx`  
**Status:** EXISTS — redesign to multi-section layout

---

text

```
┌──── Sidebar ────┬──────────────────────────────────────────────────────┐
│                  │                                                      │
│                  │  Settings                                            │ ← --text-h3
│                  │                                                      │
│                  │  ┌── Vertical Tabs ──┬── Tab Content ─────────────┐ │
│                  │  │                   │                             │ │
│                  │  │  👤 Profile   ←   │  Profile Settings          │ │
│                  │  │  🔒 Security      │                             │ │
│                  │  │  🔔 Notifications │  ┌────────────────────────┐│ │
│                  │  │  🎨 Appearance    │  │  [Avatar]              ││ │
│                  │  │                   │  │  Upload new photo      ││ │
│                  │  │                   │  └────────────────────────┘│ │
│                  │  │                   │                             │ │
│                  │  │                   │  Full Name                 │ │
│                  │  │                   │  ┌────────────────────────┐│ │
│                  │  │                   │  │ Alex Johnson           ││ │
│                  │  │                   │  └────────────────────────┘│ │
│                  │  │                   │                             │ │
│                  │  │                   │  Email                     │ │
│                  │  │                   │  ┌────────────────────────┐│ │
│                  │  │                   │  │ alex@example.com  🔒   ││ │ ← Locked
│                  │  │                   │  └────────────────────────┘│ │
│                  │  │                   │                             │ │
│                  │  │                   │  [Save Changes]            │ │
│                  │  │                   │                             │ │
│                  │  └───────────────────┴─────────────────────────────┘│
│                  │                                                      │
└──────────────────┴──────────────────────────────────────────────────────┘
```

**Vertical Tabs (left):**

- Width: 220px
- Each tab: `padding: var(--space-sm) var(--space-md)`, `var(--radius-sm)`, full width
- Default: `var(--text-secondary)`, transparent bg
- Active: `var(--text-primary)`, `bg: var(--surface-3)`, left border `3px solid var(--accent)`
- Icon (20px) + label
- Mobile (< 768px): Switch to horizontal scrollable tabs at top

**Profile Tab:** As shown — avatar, name, email (read-only), save button  
**Security Tab:** Change password form (current + new + confirm), 2FA toggle (future)  
**Notifications Tab:** Toggle switches for email preferences  
**Appearance Tab:** Theme info (dark only note), density option

**Form inputs:** Use existing `.input` class with `:focus` → `border-color: var(--accent)`, `box-shadow: var(--glow-sm)`

---

### PAGE 9: PRICING [NEW]

**Route:** `/pricing` → `src/app/pricing/page.tsx`  
**Status:** NEW FILE

---

Same design as Landing Page Section 1.6 (Pricing) but as a full standalone page:

- Top nav (public nav, not dashboard sidebar)
- Hero: "Simple, Transparent Pricing" + "Start free, upgrade when you need more power"
- Pricing cards (same as landing page spec)
- Feature comparison table below cards (full matrix)
- FAQ specific to billing
- CTA section
- Footer

---

### PAGE 10: DOCS / HOW IT WORKS [NEW]

**Route:** `/docs` → `src/app/docs/page.tsx`  
**Status:** NEW FILE — Simple initial version

---

- Top nav (public)
- Sidebar (doc navigation) + content area
- Sections:
    1. Getting Started (how to sign up, first scan)
    2. Understanding Your Report (what each section means)
    3. Vulnerability Categories (list of all check types)
    4. API Documentation (coming soon placeholder)
- Style: Clean, readable, `max-width: var(--container-lg)` for content
- Code blocks for any technical content
- Future: MDX-based content

---


