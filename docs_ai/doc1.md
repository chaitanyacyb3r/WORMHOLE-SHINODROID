# DOCUMENT 1: DESIGN_SYSTEM.md

## Shinodroid Enhanced Design System — WORMHOLE Security

### Philosophy

Every token below follows three principles:

1. **Layered Depth** — Dark UIs live or die by surface hierarchy. Each background level is exactly `+8 lightness` on the HSL scale, creating a physically intuitive sense of depth (things closer to you are lighter).
2. **Restrained Glow** — Purple glow is the signature. It's used sparingly — only on interactive states and active elements — so when it appears, it means something.
3. **Ninja Precision** — Spacing, type, and motion are mathematically derived from base units. Nothing is arbitrary.

---

### 1. COLOR PALETTE EXTENSION

Add these to your existing `globals.css` `:root` block:

CSS

```
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SHINODROID DESIGN SYSTEM — Extended Tokens v2.0
   Add below your EXISTING custom properties in globals.css
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

:root {
  /* ─── SURFACE LAYERS (for modals, popovers, nested cards) ─── 
     Each layer is +8 L on HSL from --bg-primary (240 20% 4%)
     Reason: Human eyes perceive depth through luminance steps.
     4 layers lets you nest card-in-card-in-modal without collision. */
  --surface-0: #0a0a0f;          /* HSL 240 20% 4%  — page bg (= --bg-primary) */
  --surface-1: #12121a;          /* HSL 240 18% 8%  — section bg (= --bg-secondary) */
  --surface-2: #181825;          /* HSL 240 16% 12% — card bg (= --bg-card) */
  --surface-3: #1e1e2e;          /* HSL 245 14% 15% — nested card / popover */
  --surface-4: #252538;          /* HSL 245 12% 18% — modal / dropdown */
  --surface-5: #2d2d42;          /* HSL 245 11% 22% — tooltip / elevated overlay */

  /* ─── BORDER EXTENSION ─── */
  --border-subtle: #1e1e2e;      /* HSL 245 14% 15% — barely visible dividers */
  --border-default: #2a2a3a;     /* (existing --border) */
  --border-strong: #3a3a50;      /* HSL 245 12% 27% — emphasized borders */
  --border-interactive: #7c3aed33; /* accent at 20% opacity — form focus rings */

  /* ─── SEMANTIC BACKGROUND OVERLAYS ───
     These are used as bg on severity sections, alert banners, etc.
     Very low opacity so they tint the surface without overwhelming. */
  --success-bg: rgba(16, 185, 129, 0.08);   /* #10b981 at 8% */
  --success-border: rgba(16, 185, 129, 0.20);
  --success-text: #34d399;                    /* lighter green for readability */

  --warning-bg: rgba(245, 158, 11, 0.08);
  --warning-border: rgba(245, 158, 11, 0.20);
  --warning-text: #fbbf24;

  --danger-bg: rgba(239, 68, 68, 0.08);
  --danger-border: rgba(239, 68, 68, 0.20);
  --danger-text: #f87171;

  --info-bg: rgba(59, 130, 246, 0.08);
  --info-border: rgba(59, 130, 246, 0.20);
  --info-text: #60a5fa;

  --critical-bg: rgba(220, 38, 38, 0.10);   /* deeper red for critical */
  --critical-border: rgba(220, 38, 38, 0.25);
  --critical-text: #ef4444;

  /* ─── SIGNATURE GRADIENTS ───
     Gradient 1 (existing): Purple → Pink (accent → accent-end)
     Gradient 2: Cyber — cooler, for backgrounds and data viz
     Gradient 3: Stealth — subtle, for card borders on hover
     Gradient 4: Score — used on the score gauge ring */
  --gradient-start: #7c3aed;     /* existing */
  --gradient-end: #ec4899;       /* existing */

  --gradient-cyber-start: #7c3aed;
  --gradient-cyber-mid: #3b82f6;
  --gradient-cyber-end: #06b6d4;

  --gradient-stealth-start: rgba(124, 58, 237, 0.5);
  --gradient-stealth-end: rgba(236, 72, 153, 0.0);

  --gradient-score-critical: #ef4444;    /* 0–30 */
  --gradient-score-high: #f97316;        /* 31–50 */
  --gradient-score-medium: #f59e0b;      /* 51–70 */
  --gradient-score-good: #3b82f6;        /* 71–85 */
  --gradient-score-excellent: #10b981;   /* 86–100 */

  /* ─── OVERLAY & SCRIM ─── */
  --overlay-light: rgba(10, 10, 15, 0.5);   /* modal backdrop light */
  --overlay-heavy: rgba(10, 10, 15, 0.80);  /* modal backdrop heavy */
  --scrim: rgba(10, 10, 15, 0.95);          /* full page overlay */


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     2. TYPOGRAPHY SYSTEM
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Scale: Major Third (1.250 ratio)
     Base: 16px
     Reason: Major Third gives enough contrast between heading levels
     without the dramatic jumps of a Perfect Fourth, which can feel
     aggressive in data-dense security UIs. */

  /* Font families (already loaded) */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Display — for hero headlines only */
  --text-display: 3.815rem;       /* 61.04px */
  --text-display-lh: 1.08;
  --text-display-ls: -0.035em;
  --text-display-weight: 800;

  /* H1 — page titles */
  --text-h1: 3.052rem;            /* 48.83px */
  --text-h1-lh: 1.12;
  --text-h1-ls: -0.03em;
  --text-h1-weight: 700;

  /* H2 — section headings */
  --text-h2: 2.441rem;            /* 39.06px */
  --text-h2-lh: 1.16;
  --text-h2-ls: -0.025em;
  --text-h2-weight: 700;

  /* H3 — card titles, subsections */
  --text-h3: 1.953rem;            /* 31.25px */
  --text-h3-lh: 1.2;
  --text-h3-ls: -0.02em;
  --text-h3-weight: 600;

  /* H4 — widget headings */
  --text-h4: 1.563rem;            /* 25.0px */
  --text-h4-lh: 1.28;
  --text-h4-ls: -0.015em;
  --text-h4-weight: 600;

  /* H5 — small headings, labels */
  --text-h5: 1.25rem;             /* 20.0px */
  --text-h5-lh: 1.32;
  --text-h5-ls: -0.01em;
  --text-h5-weight: 600;

  /* Body Large — featured descriptions */
  --text-body-lg: 1.125rem;       /* 18px */
  --text-body-lg-lh: 1.6;
  --text-body-lg-ls: -0.005em;
  --text-body-lg-weight: 400;

  /* Body — default text */
  --text-body: 1rem;              /* 16px */
  --text-body-lh: 1.6;
  --text-body-ls: 0em;
  --text-body-weight: 400;

  /* Body Small — secondary info, timestamps */
  --text-body-sm: 0.875rem;       /* 14px */
  --text-body-sm-lh: 1.5;
  --text-body-sm-ls: 0.005em;
  --text-body-sm-weight: 400;

  /* Caption — labels, badges, metadata */
  --text-caption: 0.75rem;        /* 12px */
  --text-caption-lh: 1.4;
  --text-caption-ls: 0.02em;
  --text-caption-weight: 500;

  /* Overline — section labels, category tags */
  --text-overline: 0.6875rem;     /* 11px */
  --text-overline-lh: 1.4;
  --text-overline-ls: 0.08em;
  --text-overline-weight: 600;

  /* Code — inline code, file paths */
  --text-code: 0.8125rem;         /* 13px */
  --text-code-lh: 1.6;
  --text-code-ls: 0em;
  --text-code-weight: 400;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     3. SPACING SYSTEM
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Base unit: 4px
     Scale: Linear up to md, then jumps for larger values.
     Reason: 4px base aligns with the browser's pixel grid and
     snaps perfectly with Tailwind's default spacing scale. */

  --space-2xs: 0.125rem;   /* 2px  — hairline gaps */
  --space-xs: 0.25rem;     /* 4px  — icon-to-text */
  --space-sm: 0.5rem;      /* 8px  — tight padding */
  --space-md: 0.75rem;     /* 12px — default padding */
  --space-base: 1rem;      /* 16px — standard gap */
  --space-lg: 1.5rem;      /* 24px — section padding */
  --space-xl: 2rem;        /* 32px — card padding */
  --space-2xl: 3rem;       /* 48px — section gap */
  --space-3xl: 4rem;       /* 64px — major sections */
  --space-4xl: 6rem;       /* 96px — page section spacing */

  /* ─── BORDER RADIUS ─── */
  --radius-xs: 4px;        /* small badges, tags */
  --radius-sm: 6px;        /* buttons, inputs */
  --radius-md: 8px;        /* small cards, tooltips */
  --radius-base: 12px;     /* (existing) cards */
  --radius-lg: 16px;       /* (existing) modals, large cards */
  --radius-xl: 20px;       /* featured cards, hero elements */
  --radius-2xl: 24px;      /* landing page sections */
  --radius-full: 9999px;   /* pills, avatars, circular */

  /* ─── CONTAINER WIDTHS ─── */
  --container-xs: 480px;    /* centered forms, small modals */
  --container-sm: 640px;    /* auth pages, upload zone */
  --container-md: 768px;    /* upload page, settings */
  --container-lg: 1024px;   /* content pages, docs */
  --container-xl: 1280px;   /* dashboard, reports */
  --container-2xl: 1440px;  /* landing page, max width */


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     4. ELEVATION SYSTEM
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Dark UIs need subtle shadows with colored tints,
     not the gray shadows used in light themes.
     Each level adds: spread, blur, and vertical offset. */

  /* Non-glow shadows (structural depth) */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6), 0 8px 16px rgba(0, 0, 0, 0.4);

  /* Glow shadows (interactive / accent) */
  --glow-sm: 0 0 8px var(--accent-glow);
  --glow-md: 0 0 16px var(--accent-glow), 0 0 4px var(--accent-glow);
  --glow-lg: 0 0 32px var(--accent-glow), 0 0 8px var(--accent-glow);
  --glow-danger: 0 0 16px rgba(239, 68, 68, 0.25);
  --glow-success: 0 0 16px rgba(16, 185, 129, 0.25);

  /* Colored elevation for score cards */
  --glow-score-critical: 0 0 20px rgba(239, 68, 68, 0.2);
  --glow-score-high: 0 0 20px rgba(249, 115, 22, 0.2);
  --glow-score-medium: 0 0 20px rgba(245, 158, 11, 0.2);
  --glow-score-good: 0 0 20px rgba(59, 130, 246, 0.2);
  --glow-score-excellent: 0 0 20px rgba(16, 185, 129, 0.2);

  /* ─── GLASS MORPHISM ─── */
  --glass-bg: rgba(24, 24, 37, 0.60);        /* --bg-card at 60% */
  --glass-blur: 16px;
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-bg-heavy: rgba(24, 24, 37, 0.85);
  --glass-blur-heavy: 24px;


  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     5. MOTION SYSTEM
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Three curves, each for a specific purpose:
     - ease-out: Elements entering the screen (draws attention)
     - ease-in: Elements leaving (gets out of the way fast)
     - spring: Interactive feedback (buttons, toggles)
     Duration rule: Functional transitions ≤ 200ms.
     Decorative animations can be longer. */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);       /* decelerate — enter */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);            /* accelerate — exit */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoot — interactive */
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);  /* general purpose */

  --duration-instant: 75ms;    /* focus rings, color changes */
  --duration-fast: 150ms;      /* button hover, toggle, tooltip */
  --duration-normal: 250ms;    /* card hover, panel slide, tab switch */
  --duration-slow: 400ms;      /* modal enter, page transition */
  --duration-slower: 600ms;    /* complex animations, chart draw */

  /* ─── ANIMATION KEYFRAMES (add as @keyframes below) ─── */
}

/* ━━━ KEYFRAME ANIMATIONS ━━━ */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
  50% { box-shadow: 0 0 20px var(--accent-glow), 0 0 40px rgba(124, 58, 237, 0.15); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes dash-march {
  to { stroke-dashoffset: -20; }
}

@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ring-fill {
  from { stroke-dashoffset: var(--ring-circumference); }
  to { stroke-dashoffset: var(--ring-target); }
}

/* ━━━ UTILITY CLASSES (extend your existing ones) ━━━ */

.animate-fade-in { animation: fadeIn var(--duration-normal) var(--ease-out) both; }
.animate-fade-in-up { animation: fadeInUp var(--duration-normal) var(--ease-out) both; }
.animate-fade-in-down { animation: fadeInDown var(--duration-normal) var(--ease-out) both; }
.animate-slide-in-right { animation: slideInRight var(--duration-normal) var(--ease-out) both; }
.animate-scale-in { animation: scaleIn var(--duration-slow) var(--ease-spring) both; }
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.animate-shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}

/* Stagger children — apply to parent, add .stagger-child to each child */
.stagger-children .stagger-child:nth-child(1) { animation-delay: 0ms; }
.stagger-children .stagger-child:nth-child(2) { animation-delay: 60ms; }
.stagger-children .stagger-child:nth-child(3) { animation-delay: 120ms; }
.stagger-children .stagger-child:nth-child(4) { animation-delay: 180ms; }
.stagger-children .stagger-child:nth-child(5) { animation-delay: 240ms; }
.stagger-children .stagger-child:nth-child(6) { animation-delay: 300ms; }
.stagger-children .stagger-child:nth-child(7) { animation-delay: 360ms; }
.stagger-children .stagger-child:nth-child(8) { animation-delay: 420ms; }

/* Glass morphism utility */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
}
.glass-heavy {
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur-heavy));
  -webkit-backdrop-filter: blur(var(--glass-blur-heavy));
  border: 1px solid var(--glass-border);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* Reduced motion respect */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Tailwind Config Extension

Add this to your `tailwind.config.ts` to make tokens available as Tailwind utilities:

TypeScript

```
// tailwind.config.ts — EXTEND section (don't replace)
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
          5: 'var(--surface-5)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          interactive: 'var(--border-interactive)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          glow: 'var(--accent-glow)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        base: 'var(--radius-base)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-sm': 'var(--glow-sm)',
        'glow-md': 'var(--glow-md)',
        'glow-lg': 'var(--glow-lg)',
      },
      transitionTimingFunction: {
        'out-expo': 'var(--ease-out)',
        'in-expo': 'var(--ease-in)',
        spring: 'var(--ease-spring)',
        smooth: 'var(--ease-smooth)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      maxWidth: {
        'container-xs': 'var(--container-xs)',
        'container-sm': 'var(--container-sm)',
        'container-md': 'var(--container-md)',
        'container-lg': 'var(--container-lg)',
        'container-xl': 'var(--container-xl)',
        'container-2xl': 'var(--container-2xl)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

---



