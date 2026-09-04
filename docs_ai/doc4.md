# DOCUMENT 4: FIGMA_PROMPTS.md

## Self-Contained Prompts for Claude.ai Connected to Figma MCP

> **How to use:** Open Claude.ai → Connect Figma MCP → Paste each prompt one at a time in sequence. Wait for completion before moving to the next.

---

### FIGMA PROMPT 1: Design System Foundation

text

```
You are connected to Figma. Create a new Figma file called
"Shinodroid Design System — WORMHOLE Security".

Create the following pages in this file:

━━━ PAGE 1: "🎨 Colors" ━━━

Create color style groups. For each color, create a 120×120 rectangle
swatch with the HEX value as a text label below it.

Group: "Surface/"
  Surface-0: #0a0a0f
  Surface-1: #12121a
  Surface-2: #181825
  Surface-3: #1e1e2e
  Surface-4: #252538
  Surface-5: #2d2d42

Group: "Accent/"
  Accent: #7c3aed
  Accent Hover: #8b5cf6
  Accent Glow: rgba(124, 58, 237, 0.3)

Group: "Text/"
  Primary: #e4e4ef
  Secondary: #9ca3b0
  Muted: #6b7280

Group: "Border/"
  Subtle: #1e1e2e
  Default: #2a2a3a
  Strong: #3a3a50
  Interactive: rgba(124, 58, 237, 0.2)

Group: "Semantic/"
  Success: #10b981
  Success Light: #34d399
  Warning: #f59e0b
  Warning Light: #fbbf24
  Danger: #ef4444
  Danger Light: #f87171
  Info: #3b82f6
  Info Light: #60a5fa
  Critical: #dc2626

Group: "Gradient/"
  Create 3 gradient rectangles (300×80 each):
  1. "Brand": #7c3aed → #ec4899 (horizontal)
  2. "Cyber": #7c3aed → #3b82f6 → #06b6d4 (horizontal)
  3. "Stealth": rgba(124,58,237,0.5) → rgba(236,72,153,0) (horizontal)

Group: "Score/"
  Critical (0-30): #ef4444
  High (31-50): #f97316
  Medium (51-70): #f59e0b
  Good (71-85): #3b82f6
  Excellent (86-100): #10b981

Arrange all swatches in organized rows with group labels above each row.

━━━ PAGE 2: "📝 Typography" ━━━

Create a typography specimen sheet. Use Inter for sans-serif,
JetBrains Mono for monospace.

For each level, create a text element showing the style name,
size, weight, and a sample sentence:

Display: 61px / weight 800 / line-height 1.08 / letter-spacing -0.035em
  Sample: "Your AI-Built App Isn't Safe Yet"

H1: 49px / weight 700 / line-height 1.12 / letter-spacing -0.03em
  Sample: "Security Dashboard"

H2: 39px / weight 700 / line-height 1.16 / letter-spacing -0.025em
  Sample: "Start Free. Scale When Ready."

H3: 31px / weight 600 / line-height 1.2 / letter-spacing -0.02em
  Sample: "Start a New Security Scan"

H4: 25px / weight 600 / line-height 1.28 / letter-spacing -0.015em
  Sample: "Vulnerability Details"

H5: 20px / weight 600 / line-height 1.32 / letter-spacing -0.01em
  Sample: "Recent Scan Results"

Body Large: 18px / weight 400 / line-height 1.6 / letter-spacing -0.005em
  Sample: "Upload your Android APK for comprehensive security analysis powered by AI."

Body: 16px / weight 400 / line-height 1.6 / letter-spacing 0
  Sample: "A hardcoded AWS access key was found in the source code. This exposes your infrastructure."

Body Small: 14px / weight 400 / line-height 1.5 / letter-spacing 0.005em
  Sample: "Scanned 2 hours ago · Duration: 4m 23s · 27 findings"

Caption: 12px / weight 500 / line-height 1.4 / letter-spacing 0.02em
  Sample: "CRITICAL · CVSS 9.1 · INSECURE DATA STORAGE"

Overline: 11px / weight 600 / line-height 1.4 / letter-spacing 0.08em
  Sample: "VULNERABILITY CATEGORY"

Code: JetBrains Mono / 13px / weight 400 / line-height 1.6
  Sample: "private static final String AWS_KEY = \"AKIAIOSFODNN7\";"

Set all text colors to #e4e4ef on a #0a0a0f background.

━━━ PAGE 3: "📐 Spacing & Layout" ━━━

Create a spacing reference:
- Show rectangles of each spacing value filled with #7c3aed at 20%:
  2xs=2px, xs=4px, sm=8px, md=12px, base=16px, lg=24px, xl=32px,
  2xl=48px, 3xl=64px, 4xl=96px
- Label each with name and px value

Create border radius reference:
- Rounded rectangles (100×60 each) showing each radius:
  xs=4px, sm=6px, md=8px, base=12px, lg=16px, xl=20px, 2xl=24px, full=9999px

Create layout grid references:
- Desktop: 1440px frame with 12-col grid, 24px gutters, 80px margins
- Tablet: 768px frame with 8-col grid, 16px gutters, 40px margins
- Mobile: 375px frame with 4-col grid, 16px gutters, 20px margins
```

---

### FIGMA PROMPT 2: Core UI Components

text

```
Continue in the same Figma file. Create a new page:

━━━ PAGE 4: "🧩 Components" ━━━

All components must use Auto Layout. All backgrounds dark theme.
Base background for the page: #0a0a0f.

COMPONENT SET 1: BUTTONS
Create a component set "Button" with these variants:

Property: Variant = Primary | Secondary | Ghost | Danger | Success
Property: Size = sm (32px h) | md (40px h) | lg (48px h)
Property: State = default | hover | active | disabled | loading

Primary button:
- Background: #7c3aed (default), #8b5cf6 (hover), #6d28d9 (active), #7c3aed at 40% (disabled)
- Text: #ffffff, Inter 14px weight 500
- Border-radius: 6px
- Padding: 8px 16px (sm), 10px 20px (md), 12px 24px (lg)
- Loading state: Replace text with a 16px spinner circle

Secondary button:
- Background: transparent
- Border: 1px solid #2a2a3a (default), 1px solid #3a3a50 (hover)
- Text: #e4e4ef
- Hover background: #1e1e2e

Ghost button:
- Background: transparent (default), #1e1e2e (hover)
- Text: #9ca3b0 (default), #e4e4ef (hover)
- No border

Danger button:
- Background: #ef4444 (default), #f87171 (hover)
- Text: #ffffff

Success button:
- Background: #10b981 (default), #34d399 (hover)
- Text: #ffffff

COMPONENT SET 2: INPUTS
Create "Input" component set:

Property: State = default | focused | filled | error | disabled
Property: Size = sm | md | lg

Default:
- Background: #12121a
- Border: 1px solid #2a2a3a
- Border-radius: 6px
- Text: #e4e4ef, 14px
- Placeholder: #6b7280
- Height: 36px (sm), 40px (md), 48px (lg)
- Padding: 8px 12px

Focused:
- Border: 1px solid #7c3aed
- Box shadow effect: 0 0 0 3px rgba(124, 58, 237, 0.15)

Error:
- Border: 1px solid #ef4444
- Include error message text below: #f87171, 12px

Include variants with:
- Left icon (search icon example)
- Right icon (eye icon for password)
- Label text above (12px, #9ca3b0, weight 500)
- Helper text below (12px, #6b7280)

COMPONENT SET 3: CARDS
Create "Card" component set:

Property: Variant = Default | Elevated | Glass | Interactive

Default:
- Background: #181825
- Border: 1px solid #2a2a3a
- Border-radius: 12px
- Padding: 24px (use auto layout)

Elevated:
- Same as default + drop shadow: 0 4px 12px rgba(0,0,0,0.4)

Glass:
- Background: rgba(24, 24, 37, 0.60)
- Border: 1px solid rgba(255,255,255,0.06)
- Use "Layer blur" effect: 16px

Interactive:
- Same as default
- Hover state: Background #1e1e2e, border #3a3a50

All cards: Include optional header, body, and footer slots
using auto layout vertical.

COMPONENT SET 4: BADGES
Create "Badge" component set:

Property: Severity = critical | high | medium | low | info
Property: Size = sm | md

Critical:
- Background: rgba(220, 38, 38, 0.10)
- Text: #ef4444
- Border: 1px solid rgba(220, 38, 38, 0.25)

High:
- Background: rgba(239, 68, 68, 0.08)
- Text: #f87171
- Border: 1px solid rgba(239, 68, 68, 0.20)

Medium:
- Background: rgba(245, 158, 11, 0.08)
- Text: #fbbf24
- Border: 1px solid rgba(245, 158, 11, 0.20)

Low:
- Background: rgba(59, 130, 246, 0.08)
- Text: #60a5fa
- Border: 1px solid rgba(59, 130, 246, 0.20)

Info:
- Background: rgba(156, 163, 176, 0.08)
- Text: #9ca3b0
- Border: 1px solid rgba(156, 163, 176, 0.20)

All badges: border-radius 4px, padding 2px 8px (sm) / 4px 12px (md),
font: Inter 11px weight 600, uppercase, letter-spacing 0.05em

COMPONENT SET 5: STATUS BADGES
Create "StatusBadge" component:

Property: Status = completed | scanning | failed | pending

Completed: Green dot (8px circle #10b981) + "Completed" text #34d399
Scanning: Blue dot (animated pulse) + "Scanning" text #60a5fa
Failed: Red dot + "Failed" text #f87171
Pending: Gray dot + "Pending" text #6b7280

Font: 12px, weight 500. Border-radius: 9999px (pill).
Background: respective color at 8% opacity.
Padding: 4px 12px.
```

---

### FIGMA PROMPT 3: Security-Specific Components

text

```
Continue in the same file, same "🧩 Components" page.

COMPONENT SET 6: SCORE GAUGE
Create "ScoreGauge" component:

Property: Size = sm (64px) | md (120px) | lg (160px)
Property: ScoreTier = critical | high | medium | good | excellent

Structure:
- SVG circle ring with gap at bottom (270° arc)
- Stroke width: 6px (sm), 8px (md), 10px (lg)
- Track: #1e1e2e (background ring)
- Fill: Colored by tier:
  critical: #ef4444, high: #f97316, medium: #f59e0b,
  good: #3b82f6, excellent: #10b981
- Center: Score number (Inter Bold, sized proportionally)
- Below number: Grade letter (A/B/C/D/F) in caption size

Create 5 variants showing different fill amounts:
- Score 23 (critical tier, ~23% filled, red)
- Score 42 (high tier, ~42% filled, orange)
- Score 67 (medium tier, ~67% filled, yellow)
- Score 78 (good tier, ~78% filled, blue)
- Score 93 (excellent tier, ~93% filled, green)

Outer glow: subtle colored shadow matching tier color at 20% opacity

COMPONENT SET 7: SEVERITY DISTRIBUTION BAR
Create "SeverityBar" component:

- Total width: 100% (auto layout fill)
- Height: 32px
- Border-radius: 9999px (fully rounded)
- 5 colored segments side by side, proportionally sized:
  Critical segment: #ef4444
  High segment: #f97316  
  Medium segment: #f59e0b
  Low segment: #3b82f6
  Info segment: #6b7280
- Each segment shows count number in white, centered (hide if too narrow)
- Labels below each segment in respective color, 11px

Create example with: 3 Critical, 5 High, 12 Medium, 5 Low, 2 Info

COMPONENT SET 8: PIPELINE STEP
Create "PipelineStep" component:

Property: Status = pending | active | completed | failed

Structure (vertical, each step is a row):
- Left: Connector line (vertical, 2px) + Status circle (28px)
- Right: Step label + status text / time

Pending:
- Circle: #1e1e2e fill, #2a2a3a border
- Label: #6b7280
- Connector line below: dashed #2a2a3a

Active:
- Circle: #7c3aed fill with outer glow ring (animated pulse reference)
- Label: #e4e4ef
- Sub-text: Progress percentage in #7c3aed
- Progress bar below label: 3px height, #7c3aed fill on #1e1e2e track
- Connector line above: solid #10b981 (from completed)
- Connector line below: gradient #7c3aed → #2a2a3a

Completed:
- Circle: #10b981 fill, white checkmark icon (12px)
- Label: #9ca3b0
- Time: right-aligned, #6b7280, 12px
- Connector line: solid #10b981

Failed:
- Circle: #ef4444 fill, white X icon (12px)
- Label: #f87171
- Error text: #f87171, 12px

COMPONENT SET 9: FINDING CARD
Create "FindingCard" component:

Property: State = collapsed | expanded
Property: Severity = critical | high | medium | low | info

Collapsed (height ~72px):
- Background: #181825
- Left accent border: 4px solid [severity color]
- Border: 1px solid #2a2a3a
- Border-radius: 12px
- Content: Severity badge (component) + Title (16px, #e4e4ef, 500) + 
  CVSS pill + Category tag + File path (monospace, 13px, #6b7280)
- Right: Chevron down icon, #6b7280

Expanded (variable height):
- Same header as collapsed but chevron rotated 180°
- Divider: 1px solid #1e1e2e
- Description section: 14px, #9ca3b0
- Code block section:
  - Background: #0d0d12
  - Border: 1px solid #2a2a3a
  - Border-radius: 8px
  - Top bar: #181825 with three dots (red #ef4444, yellow #f59e0b, green #10b981, each 8px circles)
  - Line numbers: #6b7280, right border 1px solid #1e1e2e
  - Code: JetBrains Mono 13px, #e4e4ef
  - Highlighted line: background rgba(239,68,68,0.08), left border 3px solid #ef4444
  - Copy button: top-right, ghost button style
- Remediation section:
  - Label: "REMEDIATION" overline style
  - Numbered list, 14px, #9ca3b0
  - Numbers in #7c3aed
- References section:
  - OWASP badge pills using info-style badge component
  - CWE reference links in #7c3aed

COMPONENT SET 10: STAT CARD (Dashboard)
Create "StatCard" component:

- Background: #181825
- Border: 1px solid #2a2a3a
- Border-radius: 12px
- Padding: 24px
- Auto layout vertical, gap 8px

Content:
- Label: 11px, #6b7280, uppercase, weight 600, letter-spacing 0.08em
- Value: 31px, #e4e4ef, weight 700
- Trend row: Arrow icon (up green / down red, 14px) + percentage (14px, colored) + sparkline placeholder

Create variants:
- "Total Scans" with value "47" and green up arrow "↑ 12%"
- "Avg Score" with mini score gauge (sm size) instead of number
- "Critical Issues" with value "12" and red indicator
- "Monthly Usage" with progress bar instead of trend (8/10)

COMPONENT SET 11: NAVIGATION SIDEBAR
Create "Sidebar" component:

Property: State = expanded (260px) | collapsed (72px)

Expanded:
- Background: #12121a
- Right border: 1px solid #1e1e2e
- Width: 260px
- Top: Logo (icon + "Shinodroid" wordmark), padding 20px
- Nav items (auto layout vertical, gap 4px, padding 0 12px):
  Each item: 40px height, 6px radius, padding 10px 16px
  - Icon (20px) + Label (14px, weight 500)
  - Default: icon #6b7280, text #9ca3b0, transparent bg
  - Hover: bg #181825, text #e4e4ef
  - Active: bg rgba(124,58,237,0.1), text #7c3aed, icon #7c3aed,
    left border 3px solid #7c3aed
- Bottom section (pinned):
  - Divider: 1px solid #1e1e2e
  - User row: Avatar (32px circle) + Name (14px, #e4e4ef) + 
    Plan badge ("Free" in outline style)
  - Collapse button: chevron-left, #6b7280

Collapsed:
- Width: 72px
- Only icons visible, centered
- Logo: icon only
- No text labels
- Tooltip on hover (show label)

Nav items:
  1. Dashboard (LayoutDashboard icon)
  2. New Scan (Upload icon)
  3. Scan History (Clock icon)
  4. Settings (Settings icon)
```

---

### FIGMA PROMPT 4: Landing Page Full Design

text

```
Create a new page in the file:

━━━ PAGE 5: "🖥️ Landing Page" ━━━

Frame: 1440×6000px (tall scrolling page), background #0a0a0f.

Design the complete landing page following this exact specification.
Use the components we created on the Components page.

SECTION 1 — NAVIGATION BAR (0–64px from top):
- Sticky header bar, full width, height 64px
- Background: rgba(18, 18, 26, 0.85) with backdrop blur
- Bottom border: 1px solid #1e1e2e
- Content max-width: 1280px, centered, padding 0 40px
- Left: Shield icon (24px, #7c3aed) + "Shinodroid" text (Inter 18px, 
  weight 700, #e4e4ef), gap 8px
- Center: Nav links "Features" "Pricing" "Docs" — 14px, #9ca3b0, 
  gap 32px
- Right: "Sign In" ghost button + "Start Free →" primary button (md size)

SECTION 2 — HERO (64px–764px, full viewport 700px height):
- Background: #0a0a0f
- Overlay: Radial gradient from center-top, #7c3aed at 5% opacity, 
  400px radius, fading to transparent
- Grid pattern overlay: Subtle grid lines in #2a2a3a at 3% opacity,
  40px grid spacing
- Content centered, max-width 800px:
  - Headline: "Your AI-Built App" (line 1) + "Isn't Safe Yet." (line 2)
    Display size (61px), weight 800, #e4e4ef
    "Safe" word has gradient text effect (#7c3aed → #ec4899)
    Line-height: 1.08, letter-spacing: -0.035em
  - Gap: 24px
  - Subheadline: "Automated security analysis for Android apps built 
    with AI. Upload your APK. Get a comprehensive security report 
    in minutes."
    18px, weight 400, #9ca3b0, line-height 1.6, max-width 600px, centered
  - Gap: 32px
  - Button row (centered, gap 16px):
    "🔍 Analyze Your First APK — Free" (primary button, lg size)
    "▶ Watch Demo" (ghost button, lg size)
  - Gap: 48px
  - Social proof: "Trusted by 2,000+ developers" (12px, #6b7280)
  - Below: 5 gray rectangles (placeholder company logos), 
    80×24px each, #2a2a3a fill, gap 24px, opacity 40%
  - Gap: 64px
  - Placeholder for hero illustration: 600×400px rectangle with 
    dashed border #2a2a3a, text "Hero Illustration" centered
  - Bottom: Scroll indicator chevron icon, #6b7280, centered

SECTION 3 — PROBLEM STATEMENT (starts at y ~900px):
- Padding: 96px top and bottom
- Centered content, max-width 1080px
- Badge: "⚠️ The Problem" — #f59e0b text on rgba(245,158,11,0.08) bg,
  4px radius, padding 4px 12px, 11px weight 600
- Gap: 16px
- Headline: "AI Writes Code Fast. It Also Writes Vulnerabilities Fast."
  39px, weight 700, #e4e4ef, centered
- Gap: 48px
- 3 cards in a row (gap 24px):
  Each card 340×280px (auto-resize by content):
  - Background: #181825
  - Border: 1px solid #2a2a3a
  - Border-radius: 16px
  - Padding: 32px
  - Icon placeholder: 48px circle, #1e1e2e fill, icon in #6b7280
  - Gap: 16px
  - Title: 20px, weight 600, #e4e4ef
  - Gap: 8px
  - Description: 14px, #9ca3b0, line-height 1.5
  - Gap: 16px
  - Bottom: Severity badge (critical for card 1, high for cards 2+3)
  
  Card 1: Icon 🔑, Title "Hardcoded Secrets", 
    Desc "AI assistants frequently embed API keys, tokens, and credentials directly in source code, leaving them exposed to anyone who decompiles the APK.",
    Badge: Critical
  Card 2: Icon 💾, Title "Insecure Storage",
    Desc "Sensitive user data stored in plaintext SharedPreferences or SQLite databases, accessible to any app on the device.",
    Badge: High
  Card 3: Icon 🔓, Title "Missing Encryption",
    Desc "Network calls without SSL pinning or certificate validation, making the app vulnerable to man-in-the-middle attacks.",
    Badge: High

SECTION 4 — HOW IT WORKS (next section):
- Padding: 96px top and bottom
- Badge: "⚙️ How It Works" — #7c3aed text on rgba(124,58,237,0.08) bg
- Headline: "From APK to Full Security Report in 3 Steps"
  39px, weight 700, #e4e4ef
- Gap: 64px
- 3 step columns (gap 48px), connected by dashed lines:
  
  Each step column (width ~320px, centered content):
  - Step number: "01" / "02" / "03" — 49px, weight 700, #7c3aed at 15% opacity (behind)
  - Icon placeholder: 80×80px rectangle, dashed border, for Canva asset
  - Gap: 16px  
  - Title: "Upload" / "Analyze" / "Report" — 25px, weight 600, #e4e4ef
  - Gap: 8px
  - Description: 14px, #9ca3b0, centered, line-height 1.5
    "Drag & drop your APK file or browse from your device"
    "Our engine performs 50+ static and dynamic security checks automatically"
    "Get an AI-powered detailed report with prioritized fixes and code context"
  
  Connector lines between steps: Dashed line (#2a2a3a), 
  stroke-dasharray 8 4, horizontal, vertically centered with icons

SECTION 5 — FEATURES BENTO GRID (next section):
- Padding: 96px top and bottom
- Badge: "✨ Features"
- Headline: "Everything You Need to Ship Secure Android Apps"
  39px, weight 700, #e4e4ef
- Gap: 48px
- Bento grid: 4 columns, gap 24px

  Row 1 (2 large cards, each span 2 columns):
  
  Card "Static Analysis" (col-span-2, min-height 280px):
  - Background: #181825, border: 1px solid #2a2a3a, radius 16px
  - Padding: 32px
  - Icon placeholder: 40px, for Canva asset
  - Title: "Static Analysis" — 20px, weight 600, #e4e4ef
  - Description: 14px, #9ca3b0
  - Feature list (4 items): bullet dot in #7c3aed + text
    "Manifest analysis & component exposure detection"
    "Hardcoded secrets & credential scanning"
    "Cryptographic misuse identification"
    "Code quality & best practice validation"

  Card "Dynamic Analysis" (col-span-2, min-height 280px):
  - Same structure
  - Title: "Dynamic Analysis"
  - Features:
    "Frida instrumentation for runtime behavior"
    "Logcat output analysis & sensitive data detection"
    "Network traffic inspection"
    "Runtime permission usage monitoring"

  Row 2 (4 small cards, each span 1 column):
  
  Each card (min-height 200px, padding 24px):
  
  Card "AI Reports": Icon placeholder, "AI-Powered Reports",
    "Intelligent remediation suggestions powered by MiniMax M2.5"
  Card "OWASP": Icon placeholder, "OWASP Top 10",
    "All findings mapped to OWASP Mobile Security standards"
  Card "50+ Checks": Icon placeholder, "50+ Security Checks",
    "Comprehensive coverage across all vulnerability categories"
  Card "Export": Icon placeholder, "Export & Share",
    "Download as PDF or JSON. Share reports with your team."

SECTION 6 — REPORT PREVIEW (next section):
- Padding: 96px top and bottom
- Headline: "See What Your Report Looks Like" — centered
- Gap: 48px
- Large rectangle placeholder: 900×540px, #181825 bg, 
  border 1px solid #2a2a3a, border-radius 20px
  Label centered: "Report Page Screenshot"
  Apply slight rotation: -2° tilt
  Shadow: 0 16px 48px rgba(0,0,0,0.6)
- 3 small annotation cards below (glass style):
  160×64px each, rgba(24,24,37,0.6) bg, 1px solid rgba(255,255,255,0.06),
  8px radius
  "🤖 AI Insights" / "📝 Code Context" / "📊 CVSS Scoring"
  12px, #9ca3b0

SECTION 7 — PRICING (next section):
- Padding: 96px top and bottom
- Badge: "💎 Pricing"
- Headline: "Start Free. Scale When Ready."
- Gap: 16px
- Toggle: Pill-shaped toggle "Monthly" / "Annual — Save 20%"
  Background: #181825, active side: #7c3aed, 32px height
- Gap: 48px
- 3 pricing cards (gap 24px):

  Card "Hobby" (380×auto):
  - Background: #181825, border: 1px solid #2a2a3a, radius 16px
  - Padding: 32px
  - Plan name: "Hobby" — 20px, weight 600, #e4e4ef
  - Price: "Free" — 39px, weight 700, #e4e4ef
  - Divider: 1px solid #1e1e2e
  - Features (with check icons #10b981):
    ✅ 3 scans per month
    ✅ Static analysis only
    ✅ Basic security report
    ✅ Community support
    ✗ Dynamic analysis (✗ in #6b7280)
    ✗ AI-powered reports
    ✗ API access
  - CTA: Secondary button "Start Free"

  Card "Professional" (380×auto, HIGHLIGHTED):
  - Background: #1e1e2e (one level brighter)
  - Border: 2px solid #7c3aed
  - Box shadow: 0 0 16px rgba(124,58,237,0.3)
  - Transform: Scale 1.03 (slightly larger)
  - "Most Popular" badge: Gradient bg (#7c3aed → #ec4899), #ffffff text,
    positioned centered on top edge, overlapping by 14px, pill shape,
    padding 4px 16px, 11px weight 600
  - Plan name: "Professional"
  - Price: "$29" — 39px, weight 700 + "/mo" in 16px #6b7280
  - All features checked ✅ including Dynamic and AI reports
  - CTA: Primary button "Get Pro →"

  Card "Enterprise" (380×auto):
  - Same as Hobby styling
  - Plan name: "Enterprise"
  - Price: "$99/mo"
  - All features + Team management, SSO/SAML, SLA, Dedicated support
  - CTA: Secondary button "Contact Us"

SECTION 8 — FAQ (next section):
- Padding: 96px top and bottom
- Headline: "Frequently Asked Questions" — centered
- Gap: 48px
- Max-width: 768px, centered
- 6 accordion items stacked vertically, gap 8px:
  Each: #181825 bg, 1px solid #2a2a3a, 12px radius, padding 20px 24px
  Question: 16px, weight 500, #e4e4ef
  Chevron icon right-aligned, #6b7280
  
  Show item 2 in expanded state:
  - Question visible
  - Chevron rotated 180°
  - Answer: 14px, #9ca3b0, padding-top 12px, line-height 1.6
  
  Questions:
  1. "Is my APK data secure?"
  2. "What types of vulnerabilities do you detect?" (expanded)
  3. "How long does analysis take?"
  4. "Can I integrate this into my CI/CD pipeline?"
  5. "What makes this different from MobSF?"
  6. "How does the AI report generation work?"

SECTION 9 — FINAL CTA (next section):
- Full width
- Background: #0a0a0f with radial gradient overlay of #7c3aed at 6%
  from center, and grid pattern at 3% opacity
- Padding: 96px top and bottom
- Centered content:
  - Headline: "Don't Ship Vulnerable Apps." — 39px, weight 700, #e4e4ef
  - Gap: 16px
  - Subtext: "Join 2,000+ developers who trust Shinodroid to catch 
    security issues before their users do." — 18px, #9ca3b0
  - Gap: 32px
  - CTA: "🔍 Start Your Free Security Scan" — Primary button, lg
  - Gap: 16px
  - Small text: "No credit card required · 3 free scans · 30s setup"
    — 12px, #6b7280

SECTION 10 — FOOTER (last section):
- Background: #12121a
- Top border: 1px solid #1e1e2e
- Padding: 64px 40px top, 32px 40px bottom
- Max-width content: 1280px, centered
- Row 1: Logo (left) + 4 link columns (right):
  Logo: Shield icon + "Shinodroid" + "AI-powered Android security analysis" (12px, #6b7280)
  Columns (gap 64px):
    Product: Features, Pricing, Changelog, Security
    Resources: Docs, Blog, API Reference, Status
    Company: About, Contact, Careers, Legal
    — Column headers: 11px, #6b7280, uppercase, weight 600, letter-spacing 0.08em
    — Links: 14px, #9ca3b0
- Divider: 1px solid #1e1e2e
- Row 2: "© 2025 WORMHOLE Security" (12px, #6b7280) left
  Social icons (Twitter, GitHub, LinkedIn) center
  "Privacy · Terms" right
- Bottom text: "Built with 🛡️ for the AI-first developer generation" (12px, #6b7280, centered)
```

---

### FIGMA PROMPT 5: Dashboard Page

text

```
Create a new page:

━━━ PAGE 6: "🖥️ Dashboard" ━━━

Frame: 1440×900px, background #0a0a0f.

LEFT SIDEBAR (0–260px):
Use the Sidebar component in expanded state with "Dashboard" as active item.

MAIN CONTENT AREA (260px–1440px):

TOP BAR (full width of content area, height 64px):
- Background: #0a0a0f, bottom border 1px solid #1e1e2e
- Left: "Good morning, Alex 👋" — 20px, weight 600, #e4e4ef
- Right: Bell icon (20px, #6b7280) with red dot (8px, #ef4444, 
  positioned top-right of bell) + Primary button "New Scan" (md)
- Padding: 0 32px

CONTENT (below top bar, padding 32px):

ROW 1 — STAT CARDS (4 cards, gap 24px, auto-fill width):
Use StatCard components:
  1. Total Scans: "47", trend "↑ 12%" in green
  2. Avg Security Score: mini gauge showing 74 (good tier, blue)
  3. Critical Issues: "12", small red dot indicator
  4. Monthly Usage: "8/10", progress bar 80% fill in #7c3aed

ROW 2 — MAIN CONTENT (gap 24px):

LEFT COLUMN (60% width):

  CARD 1: "Recent Scans"
  - Card background: #181825, 1px solid #2a2a3a, 12px radius
  - Header: "Recent Scans" (16px, weight 600, #e4e4ef) left,
    "View All →" link (#7c3aed, 14px) right
  - Padding: 24px
  - Table with 5 rows:
    Column headers: "App Name" "Score" "Vulnerabilities" "Date" "Status"
    Headers: 11px, #6b7280, uppercase, weight 600
    
    Row 1: "📦 MyApp.apk" | 🟢 87 (A) pill | severity bar (0C 2H 4M 3L) | "2h ago" | ✅ Completed
    Row 2: "📦 ShopApp.apk" | 🟡 62 (C) pill | (1C 3H 8M 2L) | "1 day ago" | ✅ Completed
    Row 3: "📦 GameApp.apk" | 🔴 34 (F) pill | (3C 5H 12M 4L) | "3 days ago" | ✅ Completed
    Row 4: "📦 SocialApp.apk" | 🔵 — | — | "5m ago" | 🔵 Scanning
    Row 5: "📦 FinanceApp.apk" | 🟢 91 (A) pill | (0C 0H 2M 5L) | "1 week ago" | ✅ Completed
    
    Rows: 48px height, bottom border #1e1e2e, hover bg #1e1e2e
    Score pills: 24px height, colored bg at 10%, respective text color, radius 9999px
    Severity bars: 6px height, radius 9999px, segmented colors

  CARD 2: "Security Score Trend" (below Recent Scans, gap 24px)
  - Same card style
  - Header: "Security Score Trend"
  - Chart area: 100% width, 200px height
  - Placeholder: Draw a simple line chart with 7 points going:
    65 → 58 → 72 → 68 → 74 → 81 → 74
  - Line: #7c3aed, 2px stroke
  - Area fill below line: gradient #7c3aed at 15% → transparent
  - Grid lines: #1e1e2e, horizontal only (4 lines)
  - X axis: "Mon" "Tue" "Wed" "Thu" "Fri" "Sat" "Sun" (12px, #6b7280)
  - Y axis: "50" "65" "80" "95" (12px, #6b7280)
  - Dots on line: 6px circles, #7c3aed fill, #0a0a0f stroke 2px

RIGHT COLUMN (40% width):

  CARD 1: "Vulnerability Distribution"
  - Card style, header "Vulnerability Distribution"
  - Donut chart: 160px outer diameter, 96px inner
  - Segments: Critical #ef4444, High #f97316, Medium #f59e0b,
    Low #3b82f6, Info #6b7280
  - Center of donut: "51" total count, 25px weight 700
  - Legend (right of chart, vertical):
    🔴 Critical: 6
    🟠 High: 14
    🟡 Medium: 23
    🔵 Low: 8
    ⚪ Info: 4
    Each: 12px, color dot (8px) + label #9ca3b0 + count #e4e4ef

  CARD 2: "Quick Actions" (below, gap 24px)
  - 3 action rows, each: Icon (20px, #6b7280) + Label (14px, #9ca3b0)
    Clickable, hover: icon → #7c3aed, bg → #1e1e2e
    "📤 Upload New APK"
    "📄 View Latest Report"
    "📊 View All Trends"

  CARD 3: "Plan Usage" (below, gap 24px)
  - "Free Plan" badge: outline style, #9ca3b0
  - "8 of 10 scans used" — 14px, #9ca3b0
  - Progress bar: 8px height, #1e1e2e track, #7c3aed fill at 80%
  - "Upgrade to Pro" — Secondary button, sm

Also create a second frame variant: "Dashboard — Empty State"
Same sidebar and top bar, but main content shows:
- Centered illustration placeholder (400×300, dashed border)
- "Welcome to Shinodroid! 🛡️" — 25px, weight 600, #e4e4ef
- "Upload your first APK to start analyzing it for security issues"
  — 14px, #9ca3b0
- Primary button "📤 Upload Your First APK"
```

---

### FIGMA PROMPT 6: Upload Page

text

```
Create a new page:

━━━ PAGE 7: "🖥️ Upload Page" ━━━

Frame: 1440×900px, background #0a0a0f.
Sidebar (same as dashboard, "New Scan" active).

MAIN CONTENT (padding 32px):

Breadcrumb: "Dashboard" (#7c3aed) > "New Scan" (#6b7280)
  — 12px, weight 500, chevron separator

Gap: 8px

Title: "Start a New Security Scan" — 31px, weight 600, #e4e4ef
Subtitle: "Upload your Android APK for comprehensive security analysis"
  — 16px, #9ca3b0

Gap: 32px

Centered container (max-width 640px):

DROPZONE (empty state):
- Width: 100%, height: 320px
- Border: 2px dashed #2a2a3a
- Border-radius: 20px
- Background: #12121a
- Content centered vertically:
  - Cloud upload icon: 64px, #6b7280
  - Gap: 16px
  - "Drag & drop your APK file here" — 16px, #e4e4ef
  - Gap: 8px
  - "— or —" — 12px, #6b7280
  - Gap: 8px
  - "Browse Files" button (secondary, md)
  - Gap: 16px
  - ".apk files up to 100MB" — 12px, #6b7280

Gap: 24px

Below dropzone, centered:
"🔍 Start Security Analysis" — Primary button, lg, full width (640px max)
- Initially shown as disabled (opacity 40%)

Gap: 12px
"Estimated time: ~3-5 minutes for standard scan" — 12px, #6b7280, centered

Gap: 48px

TRUST BADGES ROW (3 badges, centered, gap 16px):
Each badge: #181825 bg, 1px solid #2a2a3a, 8px radius, padding 12px 16px
  "🔒 APK encrypted & deleted after analysis" — 12px, #9ca3b0
  "🚫 We never share or distribute your app" — 12px, #9ca3b0
  "✅ OWASP Mobile Top 10 compliant" — 12px, #9ca3b0

---

Also create a SECOND FRAME: "Upload Page — File Selected"

Same layout but dropzone is replaced by:

FILE INFO CARD:
- Background: #181825, 1px solid #2a2a3a, 12px radius, padding 20px 24px
- Row: APK file icon (32px, purple tint) + "MyApp.apk" (14px, #e4e4ef, weight 500) + 
  "45.2 MB" (14px, #6b7280) + [✕ remove button ghost]
- Below: Progress bar (4px height, #1e1e2e track, #7c3aed fill at 78%), 
  shimmer overlay effect
- Below: "Uploading... 2.3 MB/s" (12px, #6b7280)

"Start Security Analysis" button is now ENABLED (full opacity, interactive)

---

Also create a THIRD FRAME: "Upload Page — Drag Over"

Same layout but dropzone has:
- Border: 2px dashed #7c3aed (animated would be noted)
- Background: rgba(124, 58, 237, 0.04)
- Box shadow: 0 0 16px rgba(124, 58, 237, 0.15)
- Cloud icon: scale 1.1, color #7c3aed
- Text changes to: "Drop your APK file here" — weight 600
```

---

### FIGMA PROMPT 7: Analysis In-Progress Page

text

```
Create a new page:

━━━ PAGE 8: "🖥️ Analysis Progress" ━━━

Frame: 1440×1000px, background #0a0a0f.
Sidebar (same as dashboard, "New Scan" active).

MAIN CONTENT (padding 32px):

Breadcrumb: "Dashboard" > "Scans" > "MyApp.apk"

APP INFO BAR:
- Background: #181825, 1px solid #2a2a3a, 12px radius, padding 16px 24px
- "📦 Analyzing: MyApp.apk" (16px, weight 500, #e4e4ef) + 
  "45.2 MB" (14px, #6b7280) on left
- "Started 2m ago · Elapsed: 02:34 ⏱️" on right (14px, #6b7280)

Gap: 32px

ANALYSIS PIPELINE (centered, max-width 640px):

Card: "Analysis Pipeline" header (16px, weight 600)
Background: #181825, padding 32px

6 pipeline steps, vertical layout, connected by vertical lines:

Step 1: "📦 Upload & Validation"
- Status: COMPLETED
- Circle: 28px, #10b981 fill, white checkmark (12px)
- Label: 14px, #9ca3b0
- Time: "0:03" right-aligned, 12px, #6b7280
- Connector below: 2px solid #10b981, height 24px

Step 2: "🔓 APK Decompilation"
- Status: COMPLETED (same style as step 1)
- Time: "0:12"

Step 3: "📋 Manifest Analysis"
- Status: COMPLETED
- Time: "0:08"

Step 4: "🔍 Static Code Analysis"
- Status: ACTIVE
- Circle: 28px, #7c3aed fill, outer glow ring (noted as animated)
- Label: 14px, weight 500, #e4e4ef
- Status text: "In Progress" — 12px, #7c3aed
- Below label: Progress bar 3px, #1e1e2e track, #7c3aed fill at 62%
- Sub-text: "Scanning 2,418 / 3,891 files..." — 12px, #6b7280
- Connector above: solid #10b981
- Connector below: gradient line #7c3aed → #2a2a3a, height 24px

Step 5: "⚡ Dynamic Runtime Analysis"
- Status: PENDING
- Circle: 28px, #1e1e2e fill, #2a2a3a border
- Label: 14px, #6b7280
- Connector: dashed #2a2a3a

Step 6: "🤖 AI Report Generation"
- Status: PENDING (same as step 5)
- No connector below (last step)

Gap: 32px

LIVE FINDINGS FEED:

Card: Background #181825, padding 24px

Header row: "Findings So Far" (16px, weight 600, #e4e4ef) left,
  "27" count badge (20px, weight 700, #e4e4ef) right

Summary bar (below header, gap 12px):
Severity pills in a row (gap 8px):
  "🔴 3" — critical badge style
  "🟠 7" — high badge style  
  "🟡 12" — medium badge style
  "🔵 5" — low badge style
  "⚪ 0" — info badge style

Divider: 1px solid #1e1e2e

Finding rows (5 visible, gap 4px):
Each: padding 8px 12px, 6px radius, hover bg #1e1e2e

Row 1: 🔴 dot (10px) + "Hardcoded AWS Secret Key" (14px, #e4e4ef) + 
  "ApiService.java" (12px, #6b7280, monospace, right-aligned)
Row 2: 🟠 dot + "Exported Activity without permission" + "AndroidManifest.xml"
Row 3: 🟡 dot + "Logging sensitive data in debug mode" + "UserManager.java"
Row 4: 🟠 dot + "WebView JavaScript enabled" + "MainActivity.java"
Row 5: 🟡 dot + "Weak hash algorithm (MD5)" + "CryptoUtil.java"

"...and 22 more" — 12px, #6b7280, centered, padding-top 8px

Gap: 24px

DID YOU KNOW CARD:
Card: Background #181825, padding 20px
  "💡" emoji + "Did you know?" (12px, weight 600, #6b7280, uppercase)
  Gap: 8px
  "73% of AI-generated Android apps have at least one hardcoded API key 
  in their source code." — 14px, #9ca3b0
  Gap: 12px
  4 dots (8px circles, first filled #7c3aed, others #2a2a3a) — pagination indicator
```

---

### FIGMA PROMPT 8: Report Page (Completed Scan)

text

```
Create a new page:

━━━ PAGE 9: "🖥️ Report Page" ━━━

Frame: 1440×1800px (tall page), background #0a0a0f.
Sidebar (same as dashboard, "Scan History" active).

MAIN CONTENT:

REPORT HEADER (sticky reference — full width of content area):
- Background: #0a0a0f, bottom border 1px solid #1e1e2e
- Height: 100px, padding 20px 32px
- Left section:
  - App icon: 48px rectangle, #7c3aed/20% fill, 8px radius
  - "MyApp" — 25px, weight 600, #e4e4ef
  - "com.example.myapp" — 13px, monospace, #6b7280
  - "v2.1.3" — 12px badge, outline style
  - "Scanned Dec 15 · Duration: 4m 23s" — 12px, #6b7280
- Center:
  - ScoreGauge component, md size (120px), showing score 67, medium tier
- Right section (button row, gap 8px):
  - "📥 PDF" — Secondary button, sm
  - "📋 JSON" — Secondary button, sm
  - "🔗 Share" — Secondary button, sm
  - "🔄 Rescan" — Ghost button, sm

TABS (below header, padding 0 32px):
- 3 tabs: "Overview" (active) | "Vulnerabilities" | "Dynamic Analysis"
- Active tab: #e4e4ef text, bottom border 2px solid #7c3aed
- Inactive: #6b7280 text, no border
- Tab height: 44px, gap between tabs: 0, each tab padding 0 24px
- Full-width bottom border: 1px solid #1e1e2e

═══════════════════════════════════════
OVERVIEW TAB CONTENT (padding 32px):
═══════════════════════════════════════

EXECUTIVE SUMMARY CARD:
- Background: #181825, radius 12px
- Left border: 3px solid #7c3aed
- Padding: 24px 24px 24px 28px
- Text: "This application has MODERATE security risk. 3 critical 
  vulnerabilities require immediate attention, including hardcoded 
  credentials and exported components without proper permission checks. 
  The app lacks SSL certificate pinning and stores sensitive user data 
  in plaintext SharedPreferences." — 14px, #9ca3b0, line-height 1.6

Gap: 24px

STAT CARDS ROW (4 cards, gap 16px):
- "Overall Score": ScoreGauge sm showing 67/C
- "Total Vulnerabilities": "27" large number
- "Critical/High": "8" with red accent
- "OWASP Coverage": "8/10" with progress dots

Gap: 24px

SEVERITY DISTRIBUTION BAR:
Use SeverityBar component:
  3 Critical | 5 High | 12 Medium | 5 Low | 2 Info
Full width, 32px height, #0a0a0f at radius 9999px

Gap: 24px

TOP CRITICAL FINDINGS CARD:
Background: #181825, padding 24px, radius 12px
Header: "Top Critical Findings" — 16px, weight 600
3 finding preview rows:

Row 1:
  🔴 dot (10px) + "Hardcoded AWS Secret Key" (14px, weight 500, #e4e4ef)
  "CVSS 9.1" pill (#ef4444 bg 10%, #ef4444 text) + 
  "Insecure Data Storage" tag (#181825 bg, #6b7280 text, border) +
  "ApiService.java" monospace 12px #6b7280
  "View Details →" link (#7c3aed, 12px) right-aligned

Divider: 1px solid #1e1e2e between rows

Row 2: 🔴 + "SQL Injection via ContentProvider" + CVSS 8.9 + etc.
Row 3: 🔴 + "Debug Mode Enabled in Production" + CVSS 7.5 + etc.

═══════════════════════════════════════

Also create a SEPARATE FRAME: "Report — Vulnerabilities Tab"
Same header and tabs, but "Vulnerabilities" tab is active.

FILTER BAR:
- Background: #181825, padding 16px, radius 12px, margin-bottom 24px
- Row: Search input (with magnifying glass icon, placeholder "Search vulnerabilities...") +
  Severity dropdown ("All Severities ▾") +
  Category dropdown ("All Categories ▾") +
  Sort dropdown ("Severity ↓ ▾")
- All dropdowns: #12121a bg, #2a2a3a border, 6px radius, 14px, #9ca3b0

FINDING CARDS (3 shown):

Card 1 — EXPANDED (Critical):
Use FindingCard component in expanded/critical variant.
Show full expanded content with:
  - Title: "Hardcoded AWS Secret Key"
  - CVSS: 9.1
  - Category: Insecure Data Storage
  - Description text
  - Code block with 5 lines, line 47 highlighted red
  - 4 remediation steps
  - 2 reference links (OWASP M9, CWE-798)

Card 2 — COLLAPSED (High):
Use FindingCard component in collapsed/high variant.
  "Exported Activity without Permission Check"
  CVSS 7.2 · Component Exposure · AndroidManifest.xml

Card 3 — COLLAPSED (Medium):
  "Logging Sensitive Data in Debug Mode"
  CVSS 5.3 · Information Disclosure · UserManager.java
```

---

### FIGMA PROMPT 9: Auth Pages

text

```
Create a new page:

━━━ PAGE 10: "🖥️ Auth Pages" ━━━

FRAME 1: "Login" (1440×900px)

Split into two halves:

LEFT PANEL (0–720px):
- Background: #0a0a0f
- Overlay: Radial gradient #7c3aed at 5% from center-left
- Background pattern: Subtle hexagonal grid lines, #7c3aed at 6% opacity
- Centered content:
  - Shield icon (48px, #7c3aed) + "Shinodroid" (24px, weight 700, #e4e4ef)
  - Below: "by WORMHOLE Security" (12px, #6b7280)
- Floating security icons (absolute positioned, scattered):
  - Lock icon at 8% opacity, #7c3aed, position top-right area
  - Shield icon at 6% opacity, #3b82f6, position bottom-left
  - Key icon at 7% opacity, #ec4899, position top-left
  - Code brackets at 5% opacity, #06b6d4, position bottom-right
- Bottom (120px from bottom, centered, max-width 400px):
  Testimonial card: rgba(24,24,37,0.6) bg, 1px solid rgba(255,255,255,0.06),
  12px radius, padding 20px
  Quote: "Shinodroid caught 3 critical vulnerabilities in our app that 
  our AI coding assistant completely missed." (14px, italic, #9ca3b0)
  Author: "— Alex R., Startup Founder" (12px, #6b7280)

RIGHT PANEL (720–1440px):
- Background: #0a0a0f
- Centered form content, max-width 380px, vertically centered:
  
  - "Welcome back" — 31px, weight 600, #e4e4ef
  - Gap: 8px
  - "Sign in to your Shinodroid account" — 14px, #9ca3b0
  - Gap: 32px
  
  - GitHub button: Full width, 44px height, #1e1e2e bg, 
    1px solid #2a2a3a, 6px radius
    GitHub icon (20px) + "Continue with GitHub" (14px, #e4e4ef)
    Hover: bg #252538
  
  - Gap: 24px
  - Divider with text: Line — "or" — Line
    Lines: 1px solid #1e1e2e, "or" text: 12px, #6b7280
  - Gap: 24px
  
  - "Email" label (12px, #9ca3b0, weight 500)
  - Email input (md, default state, placeholder "you@example.com")
  - Gap: 16px
  
  - "Password" label + "Forgot?" link right-aligned (#7c3aed, 12px)
  - Password input (md, with eye icon right side)
  - Gap: 8px
  
  - Checkbox row: ☐ "Remember me" (14px, #9ca3b0)
  - Gap: 24px
  
  - "Sign In →" Primary button, full width, lg
  - Gap: 16px
  
  - "Don't have an account? Sign up →" (14px, #9ca3b0, "Sign up →" in #7c3aed)

---

FRAME 2: "Sign Up" (1440×900px)

Same layout as Login with changes:
- Right panel heading: "Create your account"
- Subheading: "Start analyzing your Android apps for security vulnerabilities"
- Additional field: "Full Name" input above Email
- Password has strength indicator below:
  4 segments (120px total, 4 bars with 4px gap), 3px height each
  Show 3 of 4 filled: first 3 in #10b981 (green), last 1 in #1e1e2e
  "Strong" text right of bars in #10b981, 12px
- CTA: "Create Account →" Primary button
- Bottom: "Already have an account? Sign in →"
- Additional small text below button:
  "By creating an account, you agree to our Terms of Service and 
  Privacy Policy" — 11px, #6b7280, centered
- Left panel: Different testimonial quote
```

---

### FIGMA PROMPT 10: Scan History & Settings Pages

text

```
Create a new page:

━━━ PAGE 11: "🖥️ History & Settings" ━━━

FRAME 1: "Scan History" (1440×900px)
Sidebar with "Scan History" active.

MAIN CONTENT (padding 32px):

Title: "Scan History" — 31px, weight 600, #e4e4ef

Stat pills row (gap 8px):
  "Total: 47" pill — #181825 bg, 9999px radius, padding 4px 16px, 12px
  "This Month: 12" pill
  "Avg Score: 74" pill

Gap: 24px

Filter bar:
  Background: #181825, padding 16px, radius 12px
  Search input (with icon) + Status dropdown + Score dropdown + 
  Date dropdown + Sort dropdown

Gap: 16px

Scan rows (5 rows, gap 8px):

Each row: Background #181825, 1px solid #2a2a3a, 12px radius, 
  padding 16px 24px, hover bg #1e1e2e

Row layout (flexbox, items center):
  Left: APK icon (32px, purple tint) + Column: App name (14px, weight 500, #e4e4ef) 
  + "v2.1.3" (12px, #6b7280)
  Middle: Score pill + Severity mini-bar (100px wide, 6px height) + 
  Date (12px, #6b7280) + Duration (12px, #6b7280)
  Right: Status badge (completed/scanning/failed) + Chevron right icon

Row 1: MyApp.apk v2.1.3, 🟢87(A), severity bar, "2 hours ago", "4m 23s", ✅ Completed
Row 2: ShopApp.apk v1.0, 🟡62(C), severity bar, "1 day ago", "5m 11s", ✅ Completed
Row 3: GameApp.apk v3.2, 🔴34(F), severity bar, "3 days ago", "6m 02s", ✅ Completed
Row 4: SocialApp.apk v0.9, —, —, "5 min ago", "—", 🔵 Scanning (pulse)
Row 5: FinanceApp.apk v2.0, 🟢91(A), severity bar, "1 week ago", "3m 45s", ✅ Completed

Pagination (below rows, gap 16px):
  "Showing 1-10 of 47" (12px, #6b7280) left
  Page buttons: [< Prev] [1] [2] [3] [...] [5] [Next >]
  Active page: #7c3aed bg, white text
  Others: #181825 bg, #9ca3b0 text, 1px solid #2a2a3a

---

FRAME 2: "Settings" (1440×900px)
Sidebar with "Settings" active.

MAIN CONTENT (padding 32px):

Title: "Settings" — 31px, weight 600, #e4e4ef

Gap: 32px

Two-column layout:

LEFT: Vertical tabs (width 220px):
  4 tabs stacked vertically (gap 4px):
  "👤 Profile" — ACTIVE: bg #1e1e2e, text #e4e4ef, left border 3px #7c3aed
  "🔒 Security" — text #9ca3b0
  "🔔 Notifications" — text #9ca3b0
  "🎨 Appearance" — text #9ca3b0
  Each: padding 10px 16px, 6px radius, 14px

RIGHT: Tab content (remaining width):

Profile tab content:
  Card: #181825, padding 32px, radius 12px

  "Profile Settings" — 20px, weight 600, #e4e4ef
  Gap: 24px

  Avatar section: 64px circle (#7c3aed/20% bg, "AJ" initials in #7c3aed) +
    "Upload new photo" link (#7c3aed, 14px) beside it
  Gap: 24px

  "Full Name" label + Input with value "Alex Johnson"
  Gap: 16px
  "Email" label + Input with value "alex@example.com" + lock icon 
    (read-only indicator)
  Gap: 24px

  "Save Changes" — Primary button, md
```