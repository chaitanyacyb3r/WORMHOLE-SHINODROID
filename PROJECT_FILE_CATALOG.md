# Project File Catalog

Scope:
- This catalog covers the repo's first-party and current local workspace files.
- It intentionally excludes vendor/build output under `node_modules/`, `web/.next/`, and `.git/`.
- Descriptions for binaries like PDFs, PNGs, ICOs, and WEBMs are inferred from filenames plus the source code/docs that reference them.

## Top-Level

- `### Java.txt`: copied reference notes for Frida's Java API.
- `.dockerignore`: trims Docker build context and keeps secrets/artifacts out of images.
- `.env.example`: safe template showing required environment variables and defaults.
- `.env.local`: local Convex deployment/site config for development.
- `.gitattributes`: forces LF endings for shell/Docker-related files.
- `.gitignore`: keeps secrets, build output, mobile binaries, reports, and temp files out of git.
- `ARCHITECTURE.md`: long-form technical architecture and data/control-flow documentation.
- `Dockerfile.worker`: production container image for the Node/Python scan worker.
- `README.md`: main setup/run guide for the overall Shinodroid platform.
- `ShinobiDroid-PitchDeck-2026.pdf`: exported investor/business pitch deck PDF at repo root.
- `Untitled-2.txt`: copied GitHub/Objection page content used as rough reference notes.
- `custom-hooks-generator.mjs`: generates app-specific Frida hooks from MobSF findings and template patterns.
- `docker-compose.override.yml`: development overrides for hot-reload source mounts and dev runtime settings.
- `docker-compose.yml`: primary multi-service stack for web, worker, MobSF, Ollama, and ZAP.
- `dynamic-analyzer.mjs`: main emulator/ADB/Frida automation pipeline for dynamic analysis.
- `gen-pitch-deck.cjs`: CommonJS helper that pulls markdown from an external artifacts location and converts it to PDF.
- `gen-pitch-deck.js`: older Node helper doing the same pitch-deck conversion flow as the `.cjs` variant.
- `generate-dynamic-pdf.mjs`: builds a styled dynamic-analysis PDF from Frida results.
- `harden-firewall.ps1`: Windows firewall hardening script for blocking sensitive ports from external access.
- `orchestrator.mjs`: discovers engines, runs them in ordered phases, and merges findings/context.
- `package-lock.json`: lockfile pinning root Node dependencies.
- `package.json`: root package manifest for the worker/watcher side of the project.
- `setup-emulator.ps1`: automated emulator + Frida server bootstrap script.
- `start.ps1`: Windows production launcher for the Dockerized stack.
- `start.sh`: Bash production launcher for the Dockerized stack.
- `supabase-worker.mjs`: scan worker that polls Convex, downloads APKs, runs engines, uploads reports, and updates scan state.
- `test-charts.html`: browser test page for Mermaid chart styling.
- `test-charts.md`: markdown source used to test Mermaid chart rendering.
- `test-charts.pdf`: generated PDF output of the Mermaid chart test.
- `ui-explorer.mjs`: emulator UI exploration helper with monkey fuzzing, login detection, and proxy helpers.
- `verify-zap.mjs`: quick health-check script that pings ZAP, runs a small spider, and confirms alerts work.

## `ai_claude_sonnet_6_search_srs/`

- `ai_claude_sonnet_6_search_srs/SRS Claude Sonnet 6 Search.md`: early draft SRS for Shinodroid.
- `ai_claude_sonnet_6_search_srs/SRS-Final-Corrected.md`: more polished/finalized SRS document.

## `docs_ai/`

- `docs_ai/doc1.md`: design-system specification for colors, typography, spacing, and tokens.
- `docs_ai/doc1.pdf`: exported PDF of `doc1.md`.
- `docs_ai/doc2.md`: page-by-page UI spec for the app experience.
- `docs_ai/doc2.pdf`: exported PDF of `doc2.md`.
- `docs_ai/doc3.md`: asset/illustration prompt doc for generated visuals and UI art direction.
- `docs_ai/doc3.pdf`: exported PDF of `doc3.md`.
- `docs_ai/doc4.md`: Figma prompt pack for generating design-system/pages in Figma via MCP.
- `docs_ai/doc4.pdf`: exported PDF of `doc4.md`.
- `docs_ai/doc5.md`: implementation prompt pack for applying the UI redesign in code.
- `docs_ai/doc5.pdf`: exported PDF of `doc5.md`.
- `docs_ai/doc6.md`: end-to-end execution checklist for the redesign rollout.
- `docs_ai/doc6.pdf`: exported PDF of `doc6.md`.

## `engines/`

- `engines/_engine-interface.mjs`: shared engine contract plus helpers for normalized finding objects/severity.
- `engines/ai.engine.mjs`: last-phase AI triage/report engine using Ollama to write detailed markdown/PDF reports.
- `engines/androwarn.engine.mjs`: wraps Androwarn static behavior analysis and maps results to normalized findings.
- `engines/firebase.engine.mjs`: scans MobSF output for Firebase URLs/API keys and probes for open cloud services.
- `engines/frida.engine.mjs`: wraps `dynamic-analyzer.mjs` and dynamic PDF generation in engine form.
- `engines/logcat.engine.mjs`: dumps logcat and flags leaked secrets/tokens/PII.
- `engines/mobsf.engine.mjs`: wraps the MobSF static scan flow exposed by `watcher.mjs`.
- `engines/zap.engine.mjs`: drives OWASP ZAP spider/active scan, maps alerts, and stores an HTML report.

## `figmadocs/`

- `figmadocs/Analysis Progress.png`: exported screenshot/reference for an analysis-progress design.
- `figmadocs/authpages.pdf`: exported auth page designs.
- `figmadocs/color.pdf`: exported color/design-token reference.
- `figmadocs/components.pdf`: exported component library/reference.
- `figmadocs/dashboard.pdf`: exported dashboard design.
- `figmadocs/historynsetttings.pdf`: exported scan-history/settings design.
- `figmadocs/landingpage.pdf`: exported landing page design.
- `figmadocs/report.pdf`: exported report-detail design.
- `figmadocs/shinodroid.pdf`: exported overall brand/design reference.
- `figmadocs/shinodroid.png`: image version of the Shinodroid design/brand reference.
- `figmadocs/spacingnlayout.pdf`: exported spacing/layout system reference.
- `figmadocs/typography.pdf`: exported typography scale reference.
- `figmadocs/uploadpage.pdf`: exported upload/new-scan page design.

## `pitch-deck/`

- `pitch-deck/Premium-corporate-logo-mark-for-a-venture-backed-cybersecurity-SaaS-company-A-single-bold-geometric--2026-04-06T14-08-54.png`: generated logo concept asset for the pitch deck.
- `pitch-deck/Shinodroid-Pitch-Deck-2026.pdf`: generated PDF version of the deck from the `pitch-deck/` sources.
- `pitch-deck/generate-pdf.mjs`: Puppeteer script that turns `print.html` into the PDF deck.
- `pitch-deck/index.html`: web-view version of the investor pitch deck.
- `pitch-deck/newPremium-corporate-logo-mark-for-a-venture-backed-cybersecurity-SaaS-company-A-single-bold-geometric--2026-04-06T14-08-54.png`: alternate logo concept asset.
- `pitch-deck/print.html`: print-optimized 1920x1080 HTML source for PDF generation.
- `pitch-deck/wormholesecurity.png`: brand/logo asset used inside the pitch deck.

## `reporting/`

- `reporting/README.md`: usage guide for the markdown+Mermaid-to-PDF converter.
- `reporting/convert.js`: Node/Puppeteer converter from markdown with Mermaid to styled PDF.
- `reporting/mcp_explained.md`: sample markdown document explaining MCP, used to test/report the converter.
- `reporting/mcp_explained.pdf`: generated PDF output of `mcp_explained.md`.
- `reporting/package-lock.json`: lockfile for the reporting tool dependencies.
- `reporting/package.json`: package manifest for the markdown-to-PDF converter.

## `scripts/`

- `scripts/PintooR.js`: aggressive Frida root-detection bypass script with many package/binary/process hooks.
- `scripts/ROOTER.js`: root-detection bypass script similar to `PintooR.js`, focused on hiding rooted indicators.
- `scripts/SHINOBI-AUTH.js`: Frida monitor for authentication/biometric/account/WebView auth events.
- `scripts/SHINOBI-CRYPTO.js`: Frida monitor for crypto APIs, key generation/use, and weak cryptographic behavior.
- `scripts/SHINOBI-NETWORK.js`: Frida monitor for HTTP/network behavior and cleartext/transport-relevant evidence.
- `scripts/SHINOBI-PLATFORM.js`: Frida monitor for platform/security-sensitive Android APIs and dangerous capabilities.
- `scripts/SHINOBI-RESILIENCE.js`: Frida script for resilience/tamper/root/anti-analysis related checks and bypass signals.
- `scripts/SHINOBI-STORAGE.js`: Frida monitor for storage, preferences, DB, clipboard, and file-access behavior.
- `scripts/SSL-BYE.js`: large universal SSL pinning bypass script for many Android libraries/frameworks.
- `scripts/test-engines.mjs`: engine test harness for interface validation, availability checks, and end-to-end testing.
- `scripts/test-orchestrator.mjs`: simple smoke test for engine discovery/orchestrator wiring.

## `web/` Root

- `web/.dockerignore`: trims Docker context for the Next.js app image.
- `web/.env.local`: local web/Convex/runtime env file; contains site URLs and deployment keys.
- `web/.env.local.example`: safe template for public web environment variables.
- `web/.gitignore`: standard Next.js ignore file for local build/dev artifacts.
- `web/Dockerfile`: multi-stage Dockerfile for a standalone Next.js production image.
- `web/README.md`: default create-next-app README; mostly scaffold leftover.
- `web/auth.config.ts`: minimal placeholder auth config with no providers; likely vestigial beside Convex auth config.
- `web/docker-entrypoint.sh`: runtime env injection script for replacing inlined `NEXT_PUBLIC_*` placeholders after build.
- `web/eslint.config.mjs`: ESLint config for Next.js/TypeScript.
- `web/next-env.d.ts`: Next.js-generated type reference file.
- `web/next.config.ts`: Next.js config with standalone output and security headers/CSP.
- `web/package-lock.json`: lockfile for the web app dependencies.
- `web/package.json`: package manifest for the Next.js frontend.
- `web/postcss.config.mjs`: PostCSS config enabling Tailwind v4.
- `web/setup_tools.ps1`: local or Docker lab launcher for MobSF, emulator, ZAP, Convex, Next.js, and worker.
- `web/supabase-dynamic-migration.sql`: old Supabase migration adding dynamic-analysis fields.
- `web/supabase-engine-migration.sql`: old Supabase migration adding engine/MASVS fields.
- `web/supabase-schema.sql`: old full Supabase schema for users/scans/findings/storage.
- `web/tsconfig.json`: TypeScript config for the Next.js app with path aliases.

## `web/convex/`

- `web/convex/README.md`: default Convex scaffold README; mostly generic docs.
- `web/convex/admin.ts`: local maintenance mutation for forcing stuck `scanning` scans to `failed`.
- `web/convex/auth.config.ts`: Convex auth provider/domain config.
- `web/convex/auth.ts`: Convex auth setup with Password and GitHub providers.
- `web/convex/findings.ts`: scan findings query plus worker-only batch insert mutation.
- `web/convex/http.ts`: mounts Convex Auth HTTP routes.
- `web/convex/scans.ts`: core scan queries/mutations plus worker-facing internal scan functions.
- `web/convex/schema.ts`: Convex data model for scans and findings plus auth tables.
- `web/convex/storage.ts`: upload URL generation and authenticated report/file URL lookup.
- `web/convex/tsconfig.json`: Convex TypeScript config.
- `web/convex/users.ts`: current-user query and profile update mutation.
- `web/convex/_generated/api.d.ts`: generated typed API references for Convex functions.
- `web/convex/_generated/api.js`: generated runtime API reference helper for Convex.
- `web/convex/_generated/dataModel.d.ts`: generated table/id/data-model typings.
- `web/convex/_generated/server.d.ts`: generated typed server helpers for query/mutation/action builders.
- `web/convex/_generated/server.js`: generated runtime builders for Convex server functions.

## `web/public/`

- `web/public/file.svg`: small generic file icon from starter assets.
- `web/public/globe.svg`: small generic globe icon from starter assets.
- `web/public/hero-bg.svg`: large decorative cyber-style hero/background SVG.
- `web/public/lock-main.png`: main body of the animated lock illustration used by `HeroShield3D`.
- `web/public/lock-top.png`: top shackle piece of the animated lock illustration.
- `web/public/logo.png`: main Shinodroid logo/brand image.
- `web/public/next.svg`: default Next.js logo asset; probably leftover.
- `web/public/vercel.svg`: default Vercel logo asset; probably leftover.
- `web/public/window.svg`: small generic browser-window icon from starter assets.
- `web/public/videos/blackhole.webm`: looping background video asset for atmospheric UI sections.
- `web/public/videos/encryption-bg.webm`: looping background video used behind the hero lock/encryption motif.
- `web/public/videos/skills-bg.webm`: looping background video for another marketing/feature section.

## `web/src/`

- `web/src/middleware.ts`: Convex auth cookie middleware plus lightweight in-memory rate limiting.
- `web/src/app/ConvexClientProvider.tsx`: wraps the app with a `ConvexAuthProvider` client.
- `web/src/app/favicon.ico`: browser tab icon for the app.
- `web/src/app/globals.css`: large global design system, utility classes, animations, and shared styling.
- `web/src/app/layout.tsx`: root app layout with metadata, fonts, and the Convex provider.
- `web/src/app/page.tsx`: public landing page with animated hero, features, pricing, FAQ, and marketing sections.
- `web/src/app/api/dynamic-report/[scanId]/route.ts`: authenticated redirect endpoint for dynamic report downloads.
- `web/src/app/api/report/[scanId]/route.ts`: authenticated redirect endpoint for static report downloads.
- `web/src/app/components/AnimatedSection.tsx`: reusable scroll-triggered reveal/stagger animation components.
- `web/src/app/components/CyberParticles.tsx`: canvas particle background effect.
- `web/src/app/components/HeroShield3D.tsx`: hero lock/encryption visual using images, video, and motion.
- `web/src/app/components/ParallaxSection.tsx`: reusable parallax/scale/slide-on-scroll wrappers.
- `web/src/app/components/StarField3D.tsx`: React Three Fiber starfield background.
- `web/src/app/dashboard/dashboard-shell.tsx`: authenticated dashboard shell with sidebar/nav/logout wrapper.
- `web/src/app/dashboard/layout.tsx`: dashboard layout that mounts `DashboardShell`.
- `web/src/app/dashboard/page.tsx`: dashboard home with scan metrics, grade/score logic, recent activity, and summary UI.
- `web/src/app/dashboard/reports/page.tsx`: reports/history page with search and scan listing.
- `web/src/app/dashboard/scan/page.tsx`: new scan/upload page with file validation, upload progress, and scan creation.
- `web/src/app/dashboard/scan/[id]/page.tsx`: detailed scan page with overview/findings/dynamic tabs, download links, and controls.
- `web/src/app/dashboard/settings/page.tsx`: settings/account/subscription/API-access page.
- `web/src/app/login/page.tsx`: login page using Convex Auth password/GitHub flows.
- `web/src/app/signup/page.tsx`: signup page with password-strength meter and Convex Auth signup flow.

## High-Level Read of the Repo

- Primary runtime path today: `web/` + `web/convex/` + `supabase-worker.mjs` + `orchestrator.mjs` + `engines/`.
- Dynamic-analysis core: `dynamic-analyzer.mjs`, `ui-explorer.mjs`, and the Frida scripts in `scripts/`.
- Reporting core: `engines/ai.engine.mjs`, `generate-dynamic-pdf.mjs`, and `reporting/convert.js`.
- Business/design collateral: `pitch-deck/`, `figmadocs/`, `docs_ai/`, and the SRS folders.

## Things That Look Legacy, Duplicated, or Non-Core

- `watcher.mjs` and the `mobsf.engine.mjs` wrapper suggest an older MobSF-driven pipeline still coexists with the newer Convex worker flow.
- `web/supabase-*.sql` are legacy now that the active backend code is Convex-based.
- `web/README.md`, `web/convex/README.md`, and some `web/public/*` SVG assets are mostly scaffold leftovers.
- `gen-pitch-deck.js` and `gen-pitch-deck.cjs` are near-duplicates.
- `scripts/ROOTER.js` and `scripts/PintooR.js` overlap heavily as root-bypass scripts.
