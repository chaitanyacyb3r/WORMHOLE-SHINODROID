# DOCUMENT 6: EXECUTION_CHECKLIST.md

## Complete Step-by-Step Execution Checklist

text

```
═══════════════════════════════════════════════════════
PHASE 1: DESIGN (Estimated: 2-3 days)
═══════════════════════════════════════════════════════

FIGMA (Claude.ai + Figma MCP):
☐ 1.1 Run Figma Prompt 1 → Colors, Typography, Spacing pages
☐ 1.2 Run Figma Prompt 2 → Core UI components
☐ 1.3 Run Figma Prompt 3 → Security-specific components
☐ 1.4 Run Figma Prompt 4 → Landing page full design
☐ 1.5 Run Figma Prompt 5 → Dashboard page
☐ 1.6 Run Figma Prompt 6 → Upload page (3 states)
☐ 1.7 Run Figma Prompt 7 → Analysis progress page
☐ 1.8 Run Figma Prompt 8 → Report page (overview + vulnerabilities)
☐ 1.9 Run Figma Prompt 9 → Auth pages (login + signup)
☐ 1.10 Run Figma Prompt 10 → History + Settings pages
☐ 1.11 Review ALL designs for visual consistency
☐ 1.12 Export reference screenshots for implementation

CANVA (Claude.ai + Canva MCP):
☐ 1.13 Generate Asset 1: Hero illustration
☐ 1.14 Generate Assets 2: How-it-works icons (3)
☐ 1.15 Generate Assets 3-5: State illustrations (3)
☐ 1.16 Generate Asset 6: Auth background pattern
☐ 1.17 Generate Assets 7: Feature icons (8)
☐ 1.18 Generate Assets 8: Trust badges (3)
☐ 1.19 Generate Asset 9: OG image
☐ 1.20 Generate Assets 10: Favicon set
☐ 1.21 Generate Assets 11: Logo variations
☐ 1.22 Export all assets at 2x resolution
☐ 1.23 Organize in public/ directory structure
☐ 1.24 Optimize images (TinyPNG or sharp)

═══════════════════════════════════════════════════════
PHASE 2: FOUNDATION (Estimated: 1 day)
═══════════════════════════════════════════════════════

☐ 2.1 Git: Create branch `ui-overhaul`
☐ 2.2 Git: Commit current state as safety checkpoint
☐ 2.3 Run Implementation Prompt 1 → Install packages + design system
☐ 2.4 Verify: npm run dev works
☐ 2.5 Verify: npx convex dev works
☐ 2.6 Verify: All existing pages load
☐ 2.7 Git: Commit "chore: install UI dependencies and design tokens"

═══════════════════════════════════════════════════════
PHASE 3: COMPONENTS (Estimated: 2 days)
═══════════════════════════════════════════════════════

☐ 3.1 Run Implementation Prompt 2 → Base UI components (7)
☐ 3.2 Verify: Import each component in a test page, render OK
☐ 3.3 Git: Commit "feat: add base UI components"

☐ 3.4 Run Implementation Prompt 3 → Security components (5)
☐ 3.5 Verify: ScoreGauge renders with different scores
☐ 3.6 Verify: FindingCard expands/collapses
☐ 3.7 Verify: PipelineStep renders all 4 states
☐ 3.8 Git: Commit "feat: add security-specific components"

☐ 3.9 Run Implementation Prompt 4 → Layout components (6)
☐ 3.10 Verify: New sidebar renders and navigates correctly
☐ 3.11 Verify: Dashboard shell still wraps content properly
☐ 3.12 Verify: Mobile sidebar overlay works
☐ 3.13 Git: Commit "feat: add layout components and new sidebar"

☐ 3.14 Run Implementation Prompt 5 → Chart components (2)
☐ 3.15 Verify: Charts render with sample data
☐ 3.16 Git: Commit "feat: add chart components"

═══════════════════════════════════════════════════════
PHASE 4: PAGE REDESIGNS (Estimated: 3-4 days)
═══════════════════════════════════════════════════════

☐ 4.1 Run Implementation Prompt 6 → Dashboard redesign
☐ 4.2 TEST: Dashboard shows stats, recent scans, charts
☐ 4.3 TEST: Empty state shows when no scans
☐ 4.4 TEST: Skeleton loading shows while data fetches
☐ 4.5 TEST: All links navigate correctly
☐ 4.6 Git: Commit "redesign: dashboard page"

☐ 4.7 Redesign Upload page
☐ 4.8 TEST: File drag-and-drop works
☐ 4.9 TEST: File validation works (reject non-APK, >100MB)
☐ 4.10 TEST: Upload progress shows
☐ 4.11 TEST: "Start Analysis" creates scan via Convex mutation
☐ 4.12 TEST: Redirects to scan/[id] after creation
☐ 4.13 Git: Commit "redesign: upload page"

☐ 4.14 Redesign Scan Detail / Report page (MOST CRITICAL)
☐ 4.15 TEST: Pending state shows pipeline with progress
☐ 4.16 TEST: Pipeline updates in real-time (Convex reactive)
☐ 4.17 TEST: Completed state shows full report
☐ 4.18 TEST: Score gauge animates and shows correct tier
☐ 4.19 TEST: Tabs switch between Overview/Vulnerabilities/Dynamic
☐ 4.20 TEST: Finding cards expand/collapse with animation
☐ 4.21 TEST: Severity filter works in Vulnerabilities tab
☐ 4.22 TEST: Failed state shows error with retry
☐ 4.23 TEST: Download PDF/JSON buttons work (if implemented)
☐ 4.24 Git: Commit "redesign: scan detail and report page"

☐ 4.25 Redesign Scan History page
☐ 4.26 TEST: All scans listed with correct data
☐ 4.27 TEST: Click row navigates to scan detail
☐ 4.28 TEST: Status badges show correct state
☐ 4.29 Git: Commit "redesign: scan history page"

☐ 4.30 Redesign Settings page
☐ 4.31 TEST: Profile info displays correctly
☐ 4.32 TEST: Save changes works
☐ 4.33 Git: Commit "redesign: settings page"

☐ 4.34 Run Implementation Prompt 8 → Auth pages
☐ 4.35 TEST: Login with email/password
☐ 4.36 TEST: Login with GitHub OAuth
☐ 4.37 TEST: Signup creates account
☐ 4.38 TEST: Password strength indicator
☐ 4.39 TEST: Error messages display
☐ 4.40 TEST: Redirects work after auth
☐ 4.41 Git: Commit "redesign: auth pages"

☐ 4.42 Run Implementation Prompt 7 → Landing page
☐ 4.43 TEST: All 9 sections render
☐ 4.44 TEST: Scroll animations trigger
☐ 4.45 TEST: Pricing toggle works
☐ 4.46 TEST: FAQ accordion works
☐ 4.47 TEST: Mobile responsive layout
☐ 4.48 TEST: Nav links work
☐ 4.49 Git: Commit "redesign: landing page"

═══════════════════════════════════════════════════════
PHASE 5: POLISH (Estimated: 1-2 days)
═══════════════════════════════════════════════════════

☐ 5.1 Run Implementation Prompt 9 → Animations & polish
☐ 5.2 TEST: Page transitions smooth
☐ 5.3 TEST: Number count-up animations
☐ 5.4 TEST: Skeleton loading states
☐ 5.5 TEST: Hover effects on all interactive elements
☐ 5.6 TEST: Focus-visible rings for keyboard navigation
☐ 5.7 TEST: prefers-reduced-motion disables animations
☐ 5.8 Git: Commit "polish: animations and micro-interactions"

☐ 5.9 Add proper favicons and meta tags to layout.tsx
☐ 5.10 Add OG image meta tags
☐ 5.11 Update page titles and descriptions
☐ 5.12 Git: Commit "chore: meta tags and favicons"

═══════════════════════════════════════════════════════
PHASE 6: QUALITY ASSURANCE (Estimated: 1 day)
═══════════════════════════════════════════════════════

RESPONSIVE TESTING:
☐ 6.1 Test ALL pages at 1440px (desktop)
☐ 6.2 Test ALL pages at 1024px (tablet landscape)
☐ 6.3 Test ALL pages at 768px (tablet portrait)
☐ 6.4 Test ALL pages at 375px (mobile)
☐ 6.5 Fix any layout breaks

CROSS-BROWSER:
☐ 6.6 Test in Chrome
☐ 6.7 Test in Firefox
☐ 6.8 Test in Safari
☐ 6.9 Test in Edge

BACKEND REGRESSION:
☐ 6.10 Full signup → login → upload → scan → report flow works
☐ 6.11 Convex real-time updates still work on scan progress
☐ 6.12 AI report generation still triggers and displays
☐ 6.13 File upload size limits still enforced
☐ 6.14 Auth session persistence works
☐ 6.15 Sign out works correctly

PERFORMANCE:
☐ 6.16 Run Lighthouse audit — target 90+ on all scores
☐ 6.17 Check bundle size — no massive regressions
☐ 6.18 Verify images use next/image (lazy loading, optimization)
☐ 6.19 Verify fonts load with next/font (no FOUT)

ACCESSIBILITY:
☐ 6.20 Run axe-core audit on all pages
☐ 6.21 Verify keyboard navigation works (tab through all interactive)
☐ 6.22 Verify screen reader announces content correctly
☐ 6.23 Verify color contrast meets WCAG AA (4.5:1 for text)
☐ 6.24 Verify all images have alt text
☐ 6.25 Verify form inputs have labels

═══════════════════════════════════════════════════════
PHASE 7: SHIP IT (Estimated: 1 day)
═══════════════════════════════════════════════════════

☐ 7.1 Git: Squash-merge ui-overhaul into main
☐ 7.2 Final full test on main branch
☐ 7.3 Deploy to staging environment
☐ 7.4 Test on staging
☐ 7.5 Get feedback from 3-5 target users
☐ 7.6 Iterate on critical feedback
☐ 7.7 Deploy to production
☐ 7.8 Monitor for errors (check Convex dashboard, browser console)
☐ 7.9 Celebrate 🎉

TOTAL ESTIMATED TIME: 10-14 days (solo developer)
```

---