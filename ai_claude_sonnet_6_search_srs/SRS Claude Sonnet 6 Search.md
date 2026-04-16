# SOFTWARE REQUIREMENTS SPECIFICATION

---

text

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║              CONFIDENTIAL — WORMHOLE Security                                  ║
║                                                                                ║
║   Product:   Shinodroid 忍ドロイド                                               ║
║   Version:   1.0.0                                                             ║
║   Document:  Software Requirements Specification (SRS)                         ║
║   Standard:  IEEE 830-2024                                                     ║
║   Status:    DRAFT — FOR REVIEW                                                ║
║   Date:      2025                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

|Field|Value|
|---|---|
|**Document ID**|WORMHOLE-SRS-SHINODROID-1.0.0|
|**Product Name**|Shinodroid 忍ドロイド|
|**Organization**|WORMHOLE Security|
|**Product Version**|1.0.0|
|**Document Version**|1.0.0|
|**Classification**|CONFIDENTIAL|
|**Prepared By**|WORMHOLE Security Engineering|
|**Review Status**|Pending Approval|
|**IEEE Standard**|IEEE 830-2024|

---

## REVISION HISTORY

|Version|Date|Author|Description|
|---|---|---|---|
|0.1|2025-01|Engineering Lead|Initial draft — architecture definition|
|0.2|2025-02|Security Architect|Security controls enumeration|
|0.3|2025-03|Full Team|Feature completeness pass|
|1.0.0|2025|WORMHOLE Engineering|First release candidate for SRS|

---

## TABLE OF CONTENTS

text

```
1.   Introduction ................................................................ §1
     1.1  Purpose ............................................................... §1.1
     1.2  Scope ................................................................. §1.2
     1.3  Definitions, Acronyms, and Abbreviations .............................. §1.3
     1.4  References ............................................................ §1.4
     1.5  Overview .............................................................. §1.5

2.   Overall Description ........................................................ §2
     2.1  Product Perspective ................................................... §2.1
     2.2  Product Functions ..................................................... §2.2
     2.3  User Characteristics .................................................. §2.3
     2.4  Constraints ........................................................... §2.4
     2.5  Assumptions and Dependencies .......................................... §2.5

3.   Specific Requirements ...................................................... §3
     3.1  External Interface Requirements ........................................ §3.1
          3.1.1  User Interfaces ................................................. §3.1.1
          3.1.2  Hardware Interfaces ............................................. §3.1.2
          3.1.3  Software Interfaces ............................................. §3.1.3
          3.1.4  Communication Interfaces ........................................ §3.1.4
     3.2  Functional Requirements ................................................ §3.2
     3.3  Non-Functional Requirements ............................................ §3.3
          3.3.1  Performance ..................................................... §3.3.1
          3.3.2  Security ........................................................ §3.3.2
          3.3.3  Reliability ..................................................... §3.3.3
          3.3.4  Availability .................................................... §3.3.4
          3.3.5  Maintainability ................................................. §3.3.5
          3.3.6  Portability ..................................................... §3.3.6
     3.4  Database Requirements .................................................. §3.4
     3.5  Design Constraints ..................................................... §3.5
     3.6  Software System Attributes ............................................. §3.6

4.   Use Cases .................................................................. §4

5.   System Architecture Diagrams ............................................... §5

6.   Data Flow Diagrams ......................................................... §6

7.   Traceability Matrix ........................................................ §7

8.   Appendices ................................................................. §8
     8.1  Glossary .............................................................. §8.1
     8.2  Change History ........................................................ §8.2
```

---

# SECTION 1 — INTRODUCTION

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 1.1 Purpose

This Software Requirements Specification (SRS) document formally defines and specifies all requirements for **Shinodroid 忍ドロイド**, Version 1.0.0, developed by WORMHOLE Security. It is prepared in conformance with IEEE Standard 830-2024, _IEEE Recommended Practice for Software Requirements Specifications_.

This document serves as the authoritative contractual and technical reference for:

- **Engineering teams** responsible for design, implementation, integration, and testing of the Shinodroid platform.
- **Investors and executive stakeholders** requiring a formal understanding of system scope, capability, and architectural integrity.
- **Academic review boards** assessing the technical merit and novelty of the system for research or publication consideration.
- **Quality assurance teams** responsible for validation, verification, and certification activities.
- **Security auditors** evaluating the system's internal security posture and compliance with relevant standards.

The SRS establishes a shared understanding between WORMHOLE Security and all stakeholders, defining _what_ the system shall do, under _what_ constraints, and to _what_ measurable standard of quality. It does not prescribe the internal design or implementation approach beyond constraints necessary to satisfy the requirements herein.

---

## 1.2 Scope

**Product Name:** Shinodroid 忍ドロイド **Organization:** WORMHOLE Security **Version:** 1.0.0

Shinodroid is a full-stack, AI-powered, automated Android application security analysis platform. The system accepts Android Package Kit (APK) files submitted via three distinct interfaces — a web dashboard, a Telegram bot, and a folder-drop mechanism — and subjects each submission to a structured, multi-phase, multi-engine security analysis pipeline.

### What Shinodroid Does

- **Accepts** APK file submissions through web, bot, and filesystem interfaces.
- **Orchestrates** six specialized security analysis engines across four ordered execution phases: static analysis, dynamic instrumentation, network analysis, and AI-powered triage.
- **Produces** standardized security findings conforming to a defined schema, with severity ratings, CVSS scores, and OWASP MASVS category mappings.
- **Generates** professional-grade PDF security reports suitable for executive review, remediation planning, and client deliverable.
- **Exposes** real-time scan status and results through a web-based dashboard with 3D visualization.
- **Enforces** robust security controls at every interface and data pathway to protect both the platform and its users.

### What Shinodroid Does Not Do

- Shinodroid does **not** provide penetration testing against live server infrastructure; it analyzes APK binaries in a controlled emulator environment.
- Shinodroid does **not** guarantee detection of all vulnerabilities; findings are probabilistic and may be subject to false positives/negatives.
- Shinodroid does **not** modify, repack, or distribute analyzed APK files.
- Shinodroid does **not** store APK files persistently after scan completion beyond the lifecycle of the scan record.

### Business Goals

1. Reduce time-to-vulnerability-report for Android application security assessments from days to under one hour.
2. Democratize access to advanced mobile security tooling for organizations without a dedicated mobile AppSec team.
3. Establish a reproducible, auditable, AI-augmented security analysis workflow compliant with OWASP MASVS.

---

## 1.3 Definitions, Acronyms, and Abbreviations

|Term|Definition|
|---|---|
|**APK**|Android Package Kit — the binary distribution format for Android applications.|
|**ADB**|Android Debug Bridge — command-line tool enabling communication with Android emulators and devices.|
|**AI**|Artificial Intelligence — refers herein to LLM-powered triage via MiniMax M2.7.|
|**AVD**|Android Virtual Device — software-emulated Android hardware for dynamic testing.|
|**BaaS**|Backend-as-a-Service — refers to Convex, the managed database/auth backend.|
|**CI/CD**|Continuous Integration / Continuous Delivery.|
|**CVSS**|Common Vulnerability Scoring System — industry standard for vulnerability severity scoring.|
|**DFD**|Data Flow Diagram.|
|**ESM**|ECMAScript Modules — the `.mjs` module format used by the Node.js runtime layer.|
|**Finding**|A discrete security issue identified by an engine, conforming to the `Finding` interface schema.|
|**Frida**|An open-source dynamic instrumentation toolkit.|
|**IPC**|Inter-Process Communication.|
|**LLM**|Large Language Model — refers to MiniMax M2.7 accessed via Ollama.|
|**MASVS**|Mobile Application Security Verification Standard (OWASP).|
|**MobSF**|Mobile Security Framework — an open-source all-in-one mobile security testing framework.|
|**NFR**|Non-Functional Requirement.|
|**Ollama**|A local LLM inference server framework.|
|**OWASP**|Open Web Application Security Project.|
|**PDF**|Portable Document Format.|
|**Scan**|A full lifecycle event from APK submission through engine execution to report generation.|
|**SCA**|Software Composition Analysis — examination of third-party dependencies for known vulnerabilities.|
|**SRS**|Software Requirements Specification.|
|**SSRF**|Server-Side Request Forgery.|
|**SSL/TLS**|Secure Sockets Layer / Transport Layer Security.|
|**UC**|Use Case.|
|**UI**|User Interface.|
|**FR**|Functional Requirement.|
|**Shinodroid**|The AI-powered Android APK security analysis platform described herein.|
|**Worker**|The background Node.js process (`supabase-worker.mjs`) responsible for scan lifecycle management.|
|**Orchestrator**|The `orchestrator.mjs` module responsible for discovering, ordering, and executing analysis engines.|
|**Engine**|A plugin module conforming to `_engine-interface.mjs`, encapsulating a specific analysis tool.|
|**WORMHOLE**|The parent security organization developing and operating the Shinodroid platform.|

---

## 1.4 References

|Ref ID|Document|Source|
|---|---|---|
|[REF-01]|IEEE Std 830-2024, _IEEE Recommended Practice for Software Requirements Specifications_|IEEE|
|[REF-02]|OWASP Mobile Application Security Verification Standard (MASVS)|owasp.org|
|[REF-03]|OWASP Mobile Top 10|owasp.org|
|[REF-04]|CVSS v3.1 Specification|FIRST.org|
|[REF-05]|MobSF v4.4.5 Documentation|github.com/MobSF/Mobile-Security-Framework-MobSF|
|[REF-06]|Frida 16.7.19 Documentation|frida.re|
|[REF-07]|Convex 1.32.0 Documentation|docs.convex.dev|
|[REF-08]|Next.js 16.1.6 Documentation|nextjs.org/docs|
|[REF-09]|React 19.2.3 Documentation|react.dev|
|[REF-10]|Docker Compose Reference|docs.docker.com|
|[REF-11]|Ollama API Documentation|ollama.ai|
|[REF-12]|Telegram Bot API Documentation|core.telegram.org/bots/api|
|[REF-13]|Puppeteer 24.40.0 Documentation|pptr.dev|
|[REF-14]|Androwarn Documentation|github.com/maaaaz/androwarn|
|[REF-15]|Firebase Security Rules Documentation|firebase.google.com/docs/rules|
|[REF-16]|Android Debug Bridge Reference|developer.android.com/tools/adb|
|[REF-17]|CWE — Common Weakness Enumeration|cwe.mitre.org|

---

## 1.5 Overview

The remainder of this document is organized as follows:

- **Section 2** provides the overall product description, including product context, high-level functional summary, user characterization, operational constraints, and system dependencies.
- **Section 3** contains the complete set of specific requirements, including all external interface definitions, functional requirements (FR-001 through FR-052), non-functional requirements (NFR-001 through NFR-032), database schema requirements, design constraints, and system quality attributes.
- **Section 4** enumerates eight formal use cases (UC-001 through UC-008) covering the major operational scenarios.
- **Section 5** provides system architecture diagrams expressed in Mermaid notation.
- **Section 6** provides Level 0 and Level 1 data flow diagrams.
- **Section 7** presents a full requirements-to-use-case traceability matrix.
- **Section 8** contains appendices including the complete glossary and document change history.

---

# SECTION 2 — OVERALL DESCRIPTION

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 2.1 Product Perspective

Shinodroid is a **new, standalone product** developed by WORMHOLE Security. It does not replace or extend any predecessor system. It is, however, designed to integrate with a suite of external tools and services that constitute its operational environment.

### 2.1.1 System Context

Shinodroid operates as the central orchestration layer in a heterogeneous security toolchain. It wraps, coordinates, and augments the outputs of existing open-source tools (MobSF, Frida, Androwarn) and commercial-grade AI inference (MiniMax M2.7 via Ollama) into a unified workflow accessible through standard interfaces.

### 2.1.2 Relationship to External Systems

text

```
[ End User ]
      │
      ├──── Web Browser ────────► [ Next.js Dashboard ] ◄──► [ Convex BaaS ]
      │                                                              │
      ├──── Telegram Client ────► [ Telegram Bot ]                  │
      │                                                              ▼
      └──── Filesystem Drop ────► [ Chokidar Watcher ]     [ Worker Process ]
                                                                     │
                                          ┌──────────────────────────┤
                                          ▼                          ▼
                                   [ MobSF API ]           [ Frida / ADB ]
                                   [ Androwarn ]           [ Logcat ]
                                   [ Firebase Scanner ]    [ AI (Ollama) ]
```

### 2.1.3 Product Interfaces Overview

The system interfaces with:

- **Convex** for persistent database storage, real-time subscriptions, file storage, and authentication.
- **MobSF** for static analysis of APK files.
- **Frida** for dynamic runtime instrumentation.
- **Androwarn** for static behavioral risk assessment.
- **Ollama** (hosting MiniMax M2.7) for AI-powered triage and report generation.
- **Telegram Bot API** for document-based APK submission.
- **Puppeteer** for headless Chromium-based PDF generation.
- **Android Emulator (AVD/BrutDroid)** for dynamic analysis runtime.

---

## 2.2 Product Functions

At the highest level, Shinodroid provides the following primary functions:

|Function ID|Function Name|Description|
|---|---|---|
|F-01|**APK Ingestion**|Accept APK files from web dashboard, Telegram bot, or folder-drop. Validate file type, size, and integrity.|
|F-02|**Scan Lifecycle Management**|Create, track, and update scan records through defined states: `pending → scanning → completed / failed`.|
|F-03|**Multi-Engine Pipeline Orchestration**|Discover and execute registered analysis engines in strict phase order with parallelism where defined.|
|F-04|**Static Analysis**|Analyze APK binary for permissions, vulnerabilities, hardcoded secrets, and behavioral risks using MobSF, Androwarn, and Firebase Scanner.|
|F-05|**Dynamic Instrumentation**|Install APK on emulator, execute Frida instrumentation scripts to bypass and detect SSL pinning, root detection, and other runtime protections.|
|F-06|**Runtime Log Analysis**|Capture and analyze Android logcat output for sensitive data leakage patterns.|
|F-07|**AI-Powered Security Triage**|Send all findings to MiniMax M2.7 for prioritized, contextualized, OWASP-mapped security analysis.|
|F-08|**Report Generation**|Generate machine-readable JSON, human-readable Markdown, and professional PDF reports per scan.|
|F-09|**Finding Storage and Retrieval**|Persist normalized findings to Convex database with severity, OWASP mapping, and engine attribution.|
|F-10|**Web Dashboard**|Provide a real-time, interactive 3D web dashboard for scan submission, monitoring, and report access.|
|F-11|**Telegram Bot Integration**|Allow APK submission and status notification via Telegram messaging.|
|F-12|**User Authentication and Authorization**|Manage user accounts, sessions, and row-level data access through Convex Auth.|
|F-13|**Security Control Enforcement**|Enforce rate limits, file validation, SSRF prevention, and all enumerated security controls throughout the platform.|

---

## 2.3 User Characteristics

Shinodroid is designed to serve the following user classes:

### 2.3.1 Security Analyst (Primary User)

- **Technical Level:** Advanced — proficient in mobile security, Android internals, vulnerability assessment.
- **Primary Interaction:** Web dashboard and/or Telegram bot to submit APKs, review findings, and download reports.
- **Goals:** Rapid, automated triage of Android applications to identify exploitable vulnerabilities and map them to OWASP MASVS.
- **Expected Frequency:** Multiple scans per day.

### 2.3.2 Security Engineer / DevSecOps (Secondary User)

- **Technical Level:** Expert — responsible for platform deployment, pipeline configuration, and integration.
- **Primary Interaction:** Docker Compose deployment, environment configuration, folder-drop automation, CI/CD integration.
- **Goals:** Integrate Shinodroid into automated build pipelines; maintain engine health and availability.
- **Expected Frequency:** Ongoing platform administration.

### 2.3.3 Executive / Compliance Officer (Tertiary User)

- **Technical Level:** Non-technical to moderate.
- **Primary Interaction:** Dashboard report viewer; PDF report recipient.
- **Goals:** Understand application risk posture at an executive level; assess compliance status.
- **Expected Frequency:** Periodic — reviewing completed scan reports.

### 2.3.4 Automated System / CI/CD Pipeline (Non-Human Actor)

- **Technical Level:** N/A — automated.
- **Primary Interaction:** Folder-drop (`APK_INBOX_DIR`), or future REST API.
- **Goals:** Submit APKs programmatically as part of a build or release gate.

---

## 2.4 Constraints

### 2.4.1 Regulatory and Legal Constraints

- **CON-01:** Shinodroid must only be used to analyze APK files for which the submitting user has legal authorization. WORMHOLE Security assumes no liability for unauthorized use.
- **CON-02:** AI-generated reports must include a disclaimer that findings require human expert validation before use in legal or compliance proceedings.

### 2.4.2 Hardware Constraints

- **CON-03:** Dynamic analysis requires a host machine or virtualized environment capable of running Android x86 emulators. Minimum host specification: 16 GB RAM, 8 vCPUs, 100 GB SSD.
- **CON-04:** The `shinodroid-worker` container is allocated a maximum of 2 GB RAM and 2 CPUs in Docker Compose configuration.
- **CON-05:** The `shinodroid-mobsf` container is allocated a maximum of 3 GB RAM.

### 2.4.3 Technology Constraints

- **CON-06:** The runtime environment must be Node.js ≥ 22.0.0 with ESM module support.
- **CON-07:** All Node.js backend modules must use `.mjs` file extension and `import`/`export` ESM syntax.
- **CON-08:** The MobSF instance is required to be accessible at a loopback URL only (SSRF control); external MobSF URLs are rejected.
- **CON-09:** APK file uploads are limited to a maximum size of 100 MB at both the client and server layers.
- **CON-10:** The platform is designed for deployment on x86_64 host architecture. ARM hosts may require image modifications.

### 2.4.4 Interface Constraints

- **CON-11:** Telegram bot access control relies on a configurable chat ID allowlist (`TELEGRAM_ALLOWED_CHATS`). If not configured, all chats are allowed — this is a known operational risk.
- **CON-12:** The system does not provide a public-facing REST API for programmatic APK submission in version 1.0.0; the OpenClaw plugin interface is internal only.

### 2.4.5 Security Constraints

- **CON-13:** Frida instrumentation is performed exclusively on isolated Android emulators; no live device connections are permitted from production deployment.
- **CON-14:** All security-sensitive ports (MobSF: 8000, ADB: 5037, Frida: 27042, Emulator: 5554–5585) must be firewalled from external network access via the included PowerShell hardening script.
- **CON-15:** Docker containers must run as non-root users with `no-new-privileges` security option enabled.

---

## 2.5 Assumptions and Dependencies

### 2.5.1 Assumptions

- **ASM-01:** The APK files submitted for analysis are syntactically valid Android packages (ZIP-based, `PK\x03\x04` magic bytes).
- **ASM-02:** Users submitting APKs have obtained legal authorization to analyze the target application.
- **ASM-03:** An Android Virtual Device (AVD) is pre-configured and running before dynamic analysis phases execute. Shinodroid does not provision AVDs autonomously in version 1.0.0.
- **ASM-04:** Ollama is pre-installed with the MiniMax M2.7 model pulled and available at `OLLAMA_BASE_URL` for AI triage.
- **ASM-05:** The host system has Python 3.x and required Androwarn dependencies installed for the Androwarn engine.
- **ASM-06:** Network connectivity between the worker container and MobSF container is provided by the Docker bridge network.
- **ASM-07:** Users of the platform operate in jurisdictions where security research tooling of this nature is legally permissible.

### 2.5.2 External Dependencies

|Dependency|Version|Criticality|Failure Mode|
|---|---|---|---|
|Convex BaaS|1.32.0|**Critical**|All scan persistence and auth fails; system inoperative.|
|MobSF|v4.4.5|**Critical**|Core static analysis unavailable; scan fails entirely.|
|Ollama + MiniMax M2.7|Cloud|**Non-Critical**|AI report skipped; other reports still generated.|
|Android Emulator (AVD)|Platform-Tools|**Non-Critical**|Dynamic analysis skipped; static reports still generated.|
|Frida|16.7.19|**Non-Critical**|Dynamic instrumentation skipped.|
|Telegram Bot API|Latest|**Non-Critical**|Telegram interface disabled; other interfaces unaffected.|
|Puppeteer|24.40.0|**Non-Critical**|PDF generation fails; Markdown reports still saved.|
|Androwarn|Latest|**Non-Critical**|Engine isolated failure; pipeline continues.|

---

# SECTION 3 — SPECIFIC REQUIREMENTS

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 3.1 External Interface Requirements

### 3.1.1 User Interfaces

#### 3.1.1.1 Web Dashboard (Primary UI)

The primary user interface is a Next.js 16.1.6 / React 19.2.3 web application served on port 3000.

|UI Component|File Path|Description|
|---|---|---|
|Landing Page|`web/app/page.tsx` (62 KB)|Marketing entry point with Three.js 3D visualizations, Framer Motion animations, animated counters, and pricing tiers.|
|Login Page|`web/app/login/page.tsx`|Convex Auth email/password login with session management.|
|Signup Page|`web/app/signup/page.tsx`|User registration with Convex Auth.|
|Main Dashboard|`web/app/dashboard/page.tsx` (41 KB)|Glassmorphism 3D dashboard; scan cards with Recharts severity donut charts; real-time Convex subscriptions.|
|New Scan|`web/app/dashboard/scan/page.tsx`|Drag-and-drop APK upload with real-time progress tracking.|
|Scan Details|`web/app/dashboard/scan/[id]/page.tsx`|Individual scan findings list, severity breakdown, downloadable reports.|
|Reports|`web/app/dashboard/reports/page.tsx`|Full report history; links to static PDF, dynamic PDF, and AI PDF downloads.|
|Settings|`web/app/dashboard/settings/page.tsx`|User profile and plan management.|
|Dashboard Shell|`web/components/dashboard-shell.tsx` (12 KB)|Persistent sidebar navigation, responsive layout, glassmorphism styling.|

**UI Standards:**

- UI must be fully responsive and functional on screen resolutions ≥ 1024×768.
- All interactive elements must provide visual state feedback (hover, loading, error).
- Real-time updates must propagate within 2 seconds of backend state change via Convex subscriptions.
- 3D visualizations must degrade gracefully on browsers without WebGL support.

#### 3.1.1.2 Telegram Bot Interface

- Users interact via the Telegram messaging application.
- APK files are submitted as document attachments to the bot.
- The bot responds with scan initiation confirmation, status updates, and report download links.
- Access is controlled via `TELEGRAM_ALLOWED_CHATS` environment variable.

#### 3.1.1.3 Folder-Drop Interface

- A filesystem directory (`APK_INBOX_DIR`, default: `C:\MobSF-Scans\inbox`) is monitored by chokidar 4.0.0.
- APK files placed in this directory are automatically detected, validated, and submitted for scanning.
- Results are written to `REPORTS_OUTPUT_DIR` (default: `C:\MobSF-Scans\reports`).
- No interactive UI is presented; the interface is purely filesystem-based.

---

### 3.1.2 Hardware Interfaces

|Interface|Requirement|
|---|---|
|**Android Emulator**|ADB communication over TCP port 5555 (default emulator port). The system issues ADB commands via the `adb` CLI binary, which must be present in `PATH`.|
|**Host Filesystem**|Worker process requires read/write access to a temporary directory for APK staging and report output staging.|
|**Network Adapter**|The host must expose a loopback interface (`127.0.0.1`) for inter-service communication between the worker, MobSF, and Ollama.|

---

### 3.1.3 Software Interfaces

|System|Interface Type|Purpose|Version|
|---|---|---|---|
|**Convex BaaS**|REST + WebSocket (Convex client SDK)|Persistent data storage, real-time subscriptions, file storage, authentication|1.32.0|
|**MobSF**|REST API (HTTP JSON)|APK upload, scan trigger, JSON report retrieval, PDF report retrieval|v4.4.5|
|**Ollama**|REST API (HTTP JSON)|LLM inference requests to MiniMax M2.7 model|—|
|**Frida**|frida-tools CLI + Python API|Android runtime instrumentation|16.7.19|
|**ADB**|CLI (`adb` binary)|APK installation, logcat capture, device communication|SDK Platform-Tools|
|**Telegram Bot API**|HTTPS REST (node-telegram-bot-api)|APK document reception, status messaging|0.67.0|
|**Puppeteer**|Node.js library (headless Chromium)|Markdown-to-PDF report conversion|24.40.0 / PuppeteerCore 24.37.5|
|**Androwarn**|CLI (Python subprocess)|Static behavioral analysis|Latest|
|**Docker Engine**|Docker Daemon API|Container lifecycle management (production)|—|
|**Node.js**|Runtime|ESM-based server-side execution|≥22.0.0|

---

### 3.1.4 Communication Interfaces

|Channel|Protocol|Port|Direction|Security|
|---|---|---|---|---|
|Browser ↔ Next.js Dashboard|HTTPS / WSS|3000|Bidirectional|TLS (production)|
|Worker ↔ MobSF|HTTP REST|8000|Worker→MobSF|Loopback only; firewalled externally|
|Worker ↔ Ollama|HTTP REST|11434|Worker→Ollama|Loopback only|
|Worker ↔ Convex|HTTPS / WSS|443|Bidirectional|TLS|
|Worker ↔ ADB|TCP|5037|Worker→ADB|Loopback only; firewalled externally|
|ADB ↔ Emulator|TCP|5554–5585|Bidirectional|Loopback only; firewalled externally|
|Frida ↔ Emulator|TCP|27042|Worker→Emulator|Loopback only; firewalled externally|
|Telegram Client ↔ Bot|HTTPS|443|Bidirectional|TLS (Telegram-enforced)|
|Docker Services ↔ Docker Services|Bridge Network|Internal|Bidirectional|Docker network isolation|

---

## 3.2 Functional Requirements

Requirements are organized by functional area. Each requirement includes: **ID**, **Name**, **Priority** (`M`=Must Have, `S`=Should Have, `C`=Could Have), **Description**, **Input(s)**, **Processing**, and **Output(s)**.

---

### FR-GROUP-01: APK Ingestion

---

**FR-001**

|Field|Detail|
|---|---|
|**ID**|FR-001|
|**Name**|Web APK Upload|
|**Priority**|M|
|**Description**|The system shall allow authenticated users to upload an APK file via the web dashboard using a drag-and-drop or file browser interface.|
|**Input**|APK binary file (`.apk` extension), user session token|
|**Processing**|1. Authenticate user session. 2. Validate file extension (`.apk` only). 3. Validate file size ≤ 100 MB. 4. Upload file to Convex storage. 5. Create scan record in `scans` table with status `pending`. 6. Return scan ID to client.|
|**Output**|Scan record created in Convex; scan ID returned to user.|

---

**FR-002**

|Field|Detail|
|---|---|
|**ID**|FR-002|
|**Name**|Telegram APK Submission|
|**Priority**|S|
|**Description**|The system shall allow users to submit APK files for analysis by uploading them as document attachments to the Shinodroid Telegram bot.|
|**Input**|Telegram document message containing APK file; sending user's chat ID|
|**Processing**|1. Receive document update from Telegram API. 2. Validate sender chat ID against `TELEGRAM_ALLOWED_CHATS` allowlist. 3. Validate file extension (`.apk`). 4. Download file via Telegram Bot API. 5. Validate ZIP magic bytes (`PK\x03\x04`). 6. Validate file size ≤ 100 MB. 7. Submit to scan pipeline. 8. Reply with confirmation message.|
|**Output**|Scan initiated; Telegram confirmation message sent to user.|

---

**FR-003**

|Field|Detail|
|---|---|
|**ID**|FR-003|
|**Name**|Folder-Drop APK Ingestion|
|**Priority**|S|
|**Description**|The system shall automatically detect and process APK files placed in the configured inbox directory (`APK_INBOX_DIR`).|
|**Input**|APK file placed in `APK_INBOX_DIR` filesystem directory|
|**Processing**|1. chokidar 4.0.0 detects new file event. 2. Validate file extension (`.apk`). 3. Validate ZIP magic bytes (`PK\x03\x04`). 4. Validate file size ≤ 100 MB. 5. Submit to scan pipeline. 6. Move/copy file to temp staging directory.|
|**Output**|Scan initiated; reports written to `REPORTS_OUTPUT_DIR`.|

---

**FR-004**

|Field|Detail|
|---|---|
|**ID**|FR-004|
|**Name**|File Type Validation|
|**Priority**|M|
|**Description**|The system shall reject any submitted file that does not conform to the APK file specification at both the extension and binary level.|
|**Input**|Any submitted file|
|**Processing**|1. Check file extension is `.apk`. 2. Read first 4 bytes; validate against ZIP magic bytes `PK\x03\x04`. 3. Reject with descriptive error if either check fails.|
|**Output**|Rejection error message returned to submitter; no scan record created.|

---

**FR-005**

|Field|Detail|
|---|---|
|**ID**|FR-005|
|**Name**|File Size Validation|
|**Priority**|M|
|**Description**|The system shall reject APK files exceeding 100 MB at both the client and server layers.|
|**Input**|APK file|
|**Processing**|Client-side: Check `file.size` before upload initiation. Server-side: Re-validate byte length of received payload. Reject if > 100,000,000 bytes.|
|**Output**|Rejection error message; no scan record created.|

---

### FR-GROUP-02: Scan Lifecycle Management

---

**FR-006**

|Field|Detail|
|---|---|
|**ID**|FR-006|
|**Name**|Scan Record Creation|
|**Priority**|M|
|**Description**|The system shall create a persistent scan record in the Convex `scans` table upon successful APK validation and ingestion.|
|**Input**|Validated APK file reference, authenticated user ID, file metadata|
|**Processing**|Insert record to `scans` table with fields: `userId`, `fileName`, `filePath`, `fileSize`, `status=pending`, `scanType`, `storageId`.|
|**Output**|Scan record persisted; scan ID returned.|

---

**FR-007**

|Field|Detail|
|---|---|
|**ID**|FR-007|
|**Name**|Scan Status Lifecycle Management|
|**Priority**|M|
|**Description**|The system shall manage scan records through a defined state machine: `pending → scanning → completed|
|**Input**|Internal worker state transitions|
|**Processing**|Worker updates `status` field in Convex `scans` table at each lifecycle transition. `completedAt` timestamp is set on terminal states.|
|**Output**|Updated scan record visible in real-time via Convex subscription.|

---

**FR-008**

|Field|Detail|
|---|---|
|**ID**|FR-008|
|**Name**|Worker Scan Polling|
|**Priority**|M|
|**Description**|The scan worker (`supabase-worker.mjs`) shall poll Convex for pending scans every 30 seconds and initiate processing.|
|**Input**|Convex query for scans with `status=pending`|
|**Processing**|1. Poll Convex every 30 seconds. 2. Retrieve first pending scan. 3. Update status to `scanning`. 4. Download APK from Convex storage to temp directory. 5. Execute `runAllEngines()`. 6. Update scan with results.|
|**Output**|Scan transitioned to `scanning`; engine pipeline initiated.|

---

**FR-009**

|Field|Detail|
|---|---|
|**ID**|FR-009|
|**Name**|Concurrent Scan Limit|
|**Priority**|M|
|**Description**|The system shall enforce a maximum of 3 concurrent active (status=`scanning`) scans per authenticated user.|
|**Input**|New scan submission from authenticated user|
|**Processing**|Query Convex for scans with `by_userId_status` index where `userId=currentUser` and `status=scanning`. If count ≥ 3, reject new submission with rate-limit error.|
|**Output**|HTTP 429 / error message to user; no new scan record created.|

---

**FR-010**

|Field|Detail|
|---|---|
|**ID**|FR-010|
|**Name**|Temp File Cleanup|
|**Priority**|M|
|**Description**|The system shall delete all temporary APK files and intermediate analysis artifacts from the temp staging directory upon scan completion or failure, regardless of outcome.|
|**Input**|Scan terminal state (completed or failed)|
|**Processing**|`finally` block in worker process deletes temp directory contents for the scan.|
|**Output**|Temp files removed from host filesystem.|

---

**FR-011**

|Field|Detail|
|---|---|
|**ID**|FR-011|
|**Name**|Error Sanitization|
|**Priority**|M|
|**Description**|The system shall sanitize all error messages before persisting them to the `errorMessage` field of the `scans` table, removing full stack traces and internal path information.|
|**Input**|Raw exception or error object from engine or worker|
|**Processing**|Error message string is passed through sanitization function; stack trace lines, absolute file paths, and module internals are stripped. Sanitized message stored to `scans.errorMessage`.|
|**Output**|Sanitized error message in database; no internal implementation details exposed.|

---

**FR-012**

|Field|Detail|
|---|---|
|**ID**|FR-012|
|**Name**|Worker Auto-Retry on Connectivity Failure|
|**Priority**|S|
|**Description**|The worker shall implement automatic retry logic and shall cease retrying after 3 consecutive connectivity failures, entering a backoff state.|
|**Input**|Convex connectivity failure during polling or mutation|
|**Processing**|Track consecutive failure count. On failure, increment counter and apply exponential backoff. If count ≥ 3, log critical alert and halt polling until manual intervention or connectivity restored.|
|**Output**|Graceful degradation without process crash; alert logged.|

---

### FR-GROUP-03: Engine Orchestration

---

**FR-013**

|Field|Detail|
|---|---|
|**ID**|FR-013|
|**Name**|Engine Auto-Discovery|
|**Priority**|M|
|**Description**|The orchestrator (`orchestrator.mjs`) shall automatically discover all engine modules present in the `engines/` directory that conform to the `_engine-interface.mjs` specification.|
|**Input**|File system scan of `engines/` directory|
|**Processing**|Import each `.engine.mjs` file. Validate presence of `name`, `type`, `version`, `isAvailable()`, and `run()` exports. Register valid engines in orchestrator registry.|
|**Output**|Registry of available engines populated at startup.|

---

**FR-014**

|Field|Detail|
|---|---|
|**ID**|FR-014|
|**Name**|Engine Availability Check|
|**Priority**|M|
|**Description**|Prior to execution, the orchestrator shall invoke `isAvailable()` on each registered engine. Engines reporting unavailable shall be skipped without failing the pipeline.|
|**Input**|Registered engine list|
|**Processing**|Call `engine.isAvailable()`. If `false`, log warning, mark engine as skipped, proceed to next engine.|
|**Output**|Only available engines participate in the pipeline.|

---

**FR-015**

|Field|Detail|
|---|---|
|**ID**|FR-015|
|**Name**|Phased Pipeline Execution|
|**Priority**|M|
|**Description**|The orchestrator shall execute engines in strict phase order. Engines within a phase may execute in parallel or sequentially as defined by phase specification. Subsequent phases do not begin until all engines in the preceding phase have completed or failed.|
|**Input**|Available engine registry; APK path; scan context|
|**Processing**|Phase 1 (Static): MobSF, Androwarn, Firebase — parallel. Phase 2 (Dynamic): Frida, Logcat — sequential. Phase 3 (Network): placeholder engines — sequential. Phase 4 (SCA): placeholder engines — parallel. Phase 5 (AI): AI Engine — last, receives all accumulated findings.|
|**Output**|All findings from all executed engines accumulated in context for Phase 5.|

---

**FR-016**

|Field|Detail|
|---|---|
|**ID**|FR-016|
|**Name**|Engine Isolation on Failure|
|**Priority**|M|
|**Description**|If a single engine throws an unhandled exception during execution, the orchestrator shall catch the error, mark that engine's result as failed, and continue execution of remaining engines in the pipeline.|
|**Input**|Engine `run()` method throwing exception|
|**Processing**|Wrap each `engine.run()` call in try/catch. On catch: log error, record engine as failed with error message, continue to next engine.|
|**Output**|Pipeline continues; failed engine result recorded; other engines unaffected.|

---

**FR-017**

|Field|Detail|
|---|---|
|**ID**|FR-017|
|**Name**|Standardized Engine Result Schema|
|**Priority**|M|
|**Description**|All engines shall return results conforming to the `EngineResult` interface, containing a `findings` array where each element conforms to the `Finding` interface schema.|
|**Input**|Engine analysis output (tool-specific format)|
|**Processing**|Each engine transforms its native tool output into `Finding[]` conforming to: `scan_id`, `title`, `severity`, `severity_order`, `category`, `description`, `recommendation`, `cvss_score`, `owasp_category`, `owasp_masvs`, `engine`.|
|**Output**|Normalized `Finding[]` in `EngineResult`.|

---

### FR-GROUP-04: Static Analysis Engines

---

**FR-018**

|Field|Detail|
|---|---|
|**ID**|FR-018|
|**Name**|MobSF Static Analysis|
|**Priority**|M|
|**Description**|The MobSF engine (`mobsf.engine.mjs`) shall upload the APK to the MobSF REST API, trigger a static analysis scan, and retrieve both the JSON report and PDF report.|
|**Input**|APK file path; MobSF API key; MobSF URL|
|**Processing**|1. `POST /api/v1/upload` with APK multipart payload. 2. `POST /api/v1/scan` with returned file hash. 3. `POST /api/v1/report_json` to retrieve JSON findings. 4. `POST /api/v1/download_pdf` to retrieve PDF. 5. Transform JSON findings to `Finding[]`.|
|**Output**|`Finding[]` from MobSF; `report.json` saved; `report.pdf` saved.|

---

**FR-019**

|Field|Detail|
|---|---|
|**ID**|FR-019|
|**Name**|Androwarn Behavioral Analysis|
|**Priority**|M|
|**Description**|The Androwarn engine (`androwarn.engine.mjs`) shall invoke the Androwarn Python CLI to detect malicious behavioral indicators including telephony abuse, GPS access, and device information leaks.|
|**Input**|APK file path|
|**Processing**|1. Spawn Androwarn Python subprocess with APK path. 2. Parse Androwarn JSON output. 3. Map behavioral indicators to `Finding[]` with appropriate severity ratings.|
|**Output**|`Finding[]` representing behavioral risk indicators.|

---

**FR-020**

|Field|Detail|
|---|---|
|**ID**|FR-020|
|**Name**|Firebase Misconfiguration Scanner|
|**Priority**|M|
|**Description**|The Firebase engine (`firebase.engine.mjs`) shall scan the APK for Firebase/Firestore misconfigurations, including open security rules and exposed API keys.|
|**Input**|APK file path|
|**Processing**|1. Extract `google-services.json` or equivalent configuration from APK. 2. Identify Firebase project IDs and API keys. 3. Test Firestore/Realtime Database endpoints for open read/write rules. 4. Identify hardcoded keys in manifest or resources. 5. Map findings to `Finding[]`.|
|**Output**|`Finding[]` representing Firebase security issues.|

---

### FR-GROUP-05: Dynamic Analysis Engines

---

**FR-021**

|Field|Detail|
|---|---|
|**ID**|FR-021|
|**Name**|APK Installation on Emulator|
|**Priority**|M|
|**Description**|Prior to dynamic analysis, the system shall install the APK on the connected Android emulator using ADB.|
|**Input**|APK file path; ADB device serial (default emulator)|
|**Processing**|Execute `adb install -r <apk_path>`. Verify installation success (exit code 0 and "Success" in stdout).|
|**Output**|APK installed on emulator; ready for dynamic analysis.|

---

**FR-022**

|Field|Detail|
|---|---|
|**ID**|FR-022|
|**Name**|Frida SSL Pinning Bypass|
|**Priority**|M|
|**Description**|The Frida engine (`frida.engine.mjs`) shall execute the `SSL-BYE.js` script (729 lines, 30+ bypass methods) against the running APK to detect and bypass SSL certificate pinning implementations.|
|**Input**|APK package name; running emulator; Frida frida-tools 16.7.19|
|**Processing**|1. Start Frida server on emulator via ADB. 2. Launch target application. 3. Inject `SSL-BYE.js` via `frida -U -l SSL-BYE.js -f <package>`. 4. Monitor for bypass events covering: TrustManager, OkHTTPv3, Conscrypt, Flutter, Cronet, and 25+ additional pinning implementations. 5. Capture results.|
|**Output**|`Finding[]` indicating which SSL pinning mechanisms were detected and bypassed.|

---

**FR-023**

|Field|Detail|
|---|---|
|**ID**|FR-023|
|**Name**|Frida Root Detection Bypass|
|**Priority**|M|
|**Description**|The Frida engine shall execute the `ROOTER.js` script (342 lines) to detect and bypass root detection mechanisms in the target APK.|
|**Input**|APK package name; running emulator|
|**Processing**|Inject `ROOTER.js` to hook: 25 root-indicative package checks; 7 binary path checks; `Runtime.exec()` hooks for `su`, `busybox`, `magisk`. Record which root detection checks were triggered and bypassed.|
|**Output**|`Finding[]` indicating root detection bypass results.|

---

**FR-024**

|Field|Detail|
|---|---|
|**ID**|FR-024|
|**Name**|Frida Security Module Analysis|
|**Priority**|S|
|**Description**|The Frida engine shall execute the SHINOBI suite of specialized Frida scripts to analyze authentication, cryptography, network security, platform security, resilience, and data storage.|
|**Input**|APK package name; running emulator|
|**Processing**|Sequentially inject and execute: `SHINOBI-AUTH.js`, `SHINOBI-CRYPTO.js`, `SHINOBI-NETWORK.js`, `SHINOBI-PLATFORM.js`, `SHINOBI-RESILIENCE.js`, `SHINOBI-STORAGE.js`. Each script reports hooks triggered and sensitive behaviors observed.|
|**Output**|`Finding[]` per script covering respective security domain.|

---

**FR-025**

|Field|Detail|
|---|---|
|**ID**|FR-025|
|**Name**|Logcat Runtime Log Analysis|
|**Priority**|M|
|**Description**|The Logcat engine (`logcat.engine.mjs`) shall capture Android runtime logs from the emulator and analyze them for sensitive data leakage patterns.|
|**Input**|Running emulator with installed APK; ADB connection|
|**Processing**|1. Execute `adb logcat -d` or stream logcat. 2. Filter log output for patterns: credentials in plain text, PII (email, phone), tokens/API keys, cryptographic material, internal IP addresses. 3. Map detections to `Finding[]`.|
|**Output**|`Finding[]` representing sensitive data found in logcat output.|

---

### FR-GROUP-06: AI Triage Engine

---

**FR-026**

|Field|Detail|
|---|---|
|**ID**|FR-026|
|**Name**|AI Engine Finding Aggregation|
|**Priority**|M|
|**Description**|The AI engine (`ai.engine.mjs`, 1106 lines) shall collect all `Finding[]` from all preceding engines before initiating AI analysis.|
|**Input**|Complete accumulated `Finding[]` from Phases 1–4|
|**Processing**|Deduplicate findings by title+engine pair. Sort by `severity_order` descending. Batch into groups of maximum 20 findings per LLM request to prevent token overflow.|
|**Output**|Batched finding sets ready for LLM submission.|

---

**FR-027**

|Field|Detail|
|---|---|
|**ID**|FR-027|
|**Name**|AI Security Report Generation|
|**Priority**|M|
|**Description**|The AI engine shall submit finding batches to the Ollama API (MiniMax M2.7 cloud model) and generate a comprehensive security analysis report in Markdown format.|
|**Input**|Batched `Finding[]`; Ollama endpoint; system prompt|
|**Processing**|1. Construct system prompt positioning AI as "principal-level Android security analyst". 2. Submit batches to `POST /api/generate` with `temperature=0.3`, `max_predict=8192`. 3. Aggregate responses. 4. Generate Markdown report containing: Mermaid dashboard charts (severity pie, engine coverage, category breakdown); executive summary; per-finding deep analysis with exploit scenarios; threat model with attack flow diagrams; OWASP MASVS compliance mapping; prioritized Gantt-chart remediation roadmap.|
|**Output**|`ai-security-analysis.md` saved to scan output directory.|

---

**FR-028**

|Field|Detail|
|---|---|
|**ID**|FR-028|
|**Name**|AI Report PDF Conversion|
|**Priority**|M|
|**Description**|The system shall convert the AI-generated Markdown report to a professionally formatted PDF using Puppeteer.|
|**Input**|`ai-security-analysis.md` file|
|**Processing**|1. Launch headless Chromium via Puppeteer 24.40.0. 2. Render Markdown to HTML with CSS styling. 3. Print to PDF with print-optimized layout. 4. Save as `ai-security-analysis.pdf`.|
|**Output**|`ai-security-analysis.pdf` in scan output directory.|

---

**FR-029**

|Field|Detail|
|---|---|
|**ID**|FR-029|
|**Name**|AI Graceful Degradation|
|**Priority**|M|
|**Description**|If the Ollama endpoint is unavailable or the AI engine fails, the system shall skip AI report generation and mark the scan as completed with AI report absent, without failing the overall scan.|
|**Input**|Ollama connectivity failure or exception during AI engine execution|
|**Processing**|Catch AI engine exception. Log warning. Mark AI engine as `skipped` or `failed` in engine results. Proceed to report storage and scan completion without AI artifacts.|
|**Output**|Scan marked `completed`; static/dynamic reports available; AI report absent; no scan failure.|

---

### FR-GROUP-07: Finding Persistence

---

**FR-030**

|Field|Detail|
|---|---|
|**ID**|FR-030|
|**Name**|Finding Batch Insertion|
|**Priority**|M|
|**Description**|The worker shall insert all findings from all engines into the Convex `findings` table in batches of 50 to respect Convex mutation size limits.|
|**Input**|Complete `Finding[]` from all engines|
|**Processing**|Chunk `Finding[]` into arrays of 50. For each chunk, invoke Convex mutation `insertFindings(chunk)`.|
|**Output**|All findings persisted to `findings` table in Convex.|

---

**FR-031**

|Field|Detail|
|---|---|
|**ID**|FR-031|
|**Name**|Findings DOS Protection Cap|
|**Priority**|M|
|**Description**|The system shall cap the total number of findings inserted per scan at 2000. Findings exceeding this limit shall be truncated, and a warning shall be logged.|
|**Input**|`Finding[]` with length > 2000|
|**Processing**|After all engine results are accumulated, sort by `severity_order` descending. Truncate array to first 2000 elements. Log warning with truncation count.|
|**Output**|Maximum 2000 findings persisted per scan.|

---

**FR-032**

|Field|Detail|
|---|---|
|**ID**|FR-032|
|**Name**|Denormalized Severity Count Update|
|**Priority**|M|
|**Description**|Upon scan completion, the system shall update the `scans` record with denormalized finding counts per severity level.|
|**Input**|Persisted `findings` for the scan|
|**Processing**|Count findings grouped by `severity`. Update `scans.findingsCritical`, `scans.findingsHigh`, `scans.findingsMedium`, `scans.findingsLow`, `scans.findingsInfo` with respective counts.|
|**Output**|`scans` record reflects accurate severity counts for dashboard display without additional query joins.|

---

### FR-GROUP-08: Report Management

---

**FR-033**

|Field|Detail|
|---|---|
|**ID**|FR-033|
|**Name**|Report Upload to Convex Storage|
|**Priority**|M|
|**Description**|The worker shall upload all generated report files to Convex file storage and record the resulting storage IDs in the `scans` record.|
|**Input**|Generated report files (JSON, PDF, AI-PDF)|
|**Processing**|1. Upload `report.pdf` → store `reportStorageId`. 2. Upload `frida-results.json` → store `dynamicReportStorageId`. 3. Upload `ai-security-analysis.pdf` → store `aiReportStorageId`. 4. Update `scans` record with all storage IDs.|
|**Output**|Reports accessible via Convex storage URLs; stored IDs in `scans` record.|

---

**FR-034**

|Field|Detail|
|---|---|
|**ID**|FR-034|
|**Name**|Report Download via Dashboard|
|**Priority**|M|
|**Description**|Authenticated users shall be able to download scan reports (static PDF, dynamic PDF, AI PDF) from the dashboard scan detail and reports pages.|
|**Input**|User-authenticated request for report download; scan ID|
|**Processing**|1. Validate user owns the scan (`userId` match). 2. Resolve storage ID from `scans` record. 3. Generate Convex storage download URL. 4. Redirect or stream file to user.|
|**Output**|Report file downloaded by user.|

---

### FR-GROUP-09: Authentication and Authorization

---

**FR-035**

|Field|Detail|
|---|---|
|**ID**|FR-035|
|**Name**|User Registration|
|**Priority**|M|
|**Description**|The system shall allow new users to create accounts using email and password via the signup interface.|
|**Input**|Email address, password|
|**Processing**|Convex Auth validates email format and password complexity. Creates user record in managed `users` table. Creates session.|
|**Output**|User account created; session established; redirect to dashboard.|

---

**FR-036**

|Field|Detail|
|---|---|
|**ID**|FR-036|
|**Name**|User Authentication|
|**Priority**|M|
|**Description**|The system shall authenticate users via email/password credentials managed by Convex Auth.|
|**Input**|Email, password|
|**Processing**|Convex Auth validates credentials. Creates session record in managed `sessions` table. Returns session token to client.|
|**Output**|Authenticated session; redirect to dashboard.|

---

**FR-037**

|Field|Detail|
|---|---|
|**ID**|FR-037|
|**Name**|Row-Level Authorization|
|**Priority**|M|
|**Description**|All queries and mutations against the `scans` and `findings` tables shall enforce row-level security, verifying that the requesting user's ID matches the `userId` field of the target record.|
|**Input**|Convex query or mutation with user context|
|**Processing**|All Convex query/mutation functions check `ctx.auth.getUserIdentity()`. Compare `identity.subject` with `scan.userId`. Throw `ConvexError` if mismatch.|
|**Output**|Users can only access their own scan and finding records.|

---

### FR-GROUP-10: Rate Limiting

---

**FR-038**

|Field|Detail|
|---|---|
|**ID**|FR-038|
|**Name**|API Rate Limiting|
|**Priority**|M|
|**Description**|The system shall enforce a rate limit of 60 requests per minute per IP address on all API endpoints via in-memory middleware.|
|**Input**|Incoming HTTP requests|
|**Processing**|In-memory rate limiter keyed by `req.ip`. Sliding window: 60 requests per 60-second window. If limit exceeded, return HTTP 429 with `Retry-After` header.|
|**Output**|HTTP 429 response for exceeding clients; normal response for compliant clients.|

---

**FR-039**

|Field|Detail|
|---|---|
|**ID**|FR-039|
|**Name**|SSRF Prevention|
|**Priority**|M|
|**Description**|The system shall restrict the MobSF URL configuration to loopback addresses only (`127.0.0.1` or `::1`), rejecting any configured URL resolving to an external IP address.|
|**Input**|`MOBSF_URL` environment variable value|
|**Processing**|Parse URL. Resolve hostname. Reject if resolved IP is not in loopback range (`127.0.0.0/8` or `::1`).|
|**Output**|SSRF prevented; external MobSF URL configurations cause startup error.|

---

### FR-GROUP-11: Dashboard and Visualization

---

**FR-040**

|Field|Detail|
|---|---|
|**ID**|FR-040|
|**Name**|Real-Time Scan Status Dashboard|
|**Priority**|M|
|**Description**|The dashboard shall display real-time scan status updates without requiring page refresh, using Convex WebSocket subscriptions.|
|**Input**|Convex `useQuery` subscription on `scans` table filtered by `userId`|
|**Processing**|Convex real-time subscription pushes state changes. React component re-renders on data update. Severity donut charts (Recharts) update accordingly.|
|**Output**|Dashboard reflects current scan status within ≤2 seconds of backend state change.|

---

**FR-041**

|Field|Detail|
|---|---|
|**ID**|FR-041|
|**Name**|3D Visualization Landing Page|
|**Priority**|S|
|**Description**|The landing page shall include interactive 3D security visualizations built with Three.js, @react-three/fiber, and @react-three/drei.|
|**Input**|User browser with WebGL support|
|**Processing**|Render Three.js scene with animated security-themed 3D objects. Apply Framer Motion scroll-triggered animations. Display animated statistics counters.|
|**Output**|Animated, interactive 3D landing page.|

---

**FR-042**

|Field|Detail|
|---|---|
|**ID**|FR-042|
|**Name**|Finding Detail View|
|**Priority**|M|
|**Description**|The scan detail page shall display a filterable, sortable list of all findings for a completed scan, including title, severity, category, OWASP mapping, description, and recommendation.|
|**Input**|Authenticated request for scan detail; scan ID|
|**Processing**|Query Convex `findings` table by `by_scanId` index. Present findings with severity color coding. Enable filter by severity, category, engine.|
|**Output**|Paginated, filterable finding list displayed to user.|

---

**FR-043**

|Field|Detail|
|---|---|
|**ID**|FR-043|
|**Name**|OpenClaw Plugin Interface|
|**Priority**|C|
|**Description**|The system shall expose 7 registered OpenClaw plugin tools for MobSF interaction: `mobsf_upload`, `mobsf_scan`, `mobsf_report`, `mobsf_scans`, `mobsf_pdf`, `mobsf_scorecard`, `mobsf_auto_scan`.|
|**Input**|OpenClaw tool invocation with parameters|
|**Processing**|Each tool function maps to corresponding MobSF REST API call. Returns structured JSON response.|
|**Output**|MobSF operation result returned to OpenClaw caller.|

---

### FR-GROUP-12: Reporting Artifacts

---

**FR-044**

|Field|Detail|
|---|---|
|**ID**|FR-044|
|**Name**|JSON Report Generation|
|**Priority**|M|
|**Description**|The system shall produce a `report.json` file containing the complete MobSF static analysis report for each completed scan.|
|**Input**|MobSF API JSON response|
|**Processing**|Save raw MobSF JSON report to scan output directory as `report.json`. Store reference in `scans.reportJson`.|
|**Output**|`report.json` persisted to storage.|

---

**FR-045**

|Field|Detail|
|---|---|
|**ID**|FR-045|
|**Name**|Dynamic Analysis JSON Report|
|**Priority**|M|
|**Description**|The system shall produce a `frida-results.json` file containing all dynamic analysis results including Frida script outputs and Logcat findings.|
|**Input**|Frida engine `EngineResult`; Logcat engine `EngineResult`|
|**Processing**|Serialize combined dynamic analysis findings and metadata to JSON. Save to scan output directory.|
|**Output**|`frida-results.json` persisted to storage.|

---

**FR-046**

|Field|Detail|
|---|---|
|**ID**|FR-046|
|**Name**|OWASP MASVS Compliance Mapping|
|**Priority**|M|
|**Description**|The AI engine shall map each security finding to its corresponding OWASP MASVS category and MSTG control reference in the generated report.|
|**Input**|`Finding[]` with `owasp_category` and `owasp_masvs` fields|
|**Processing**|AI prompt instructs LLM to produce MASVS compliance table covering all relevant MASVS categories. Cross-reference findings with MASVS control identifiers.|
|**Output**|OWASP MASVS compliance section in AI Markdown report.|

---

## 3.3 Non-Functional Requirements

### 3.3.1 Performance

**NFR-001**

|Field|Detail|
|---|---|
|**ID**|NFR-001|
|**Name**|Scan Throughput|
|**Description**|The system shall complete a full 6-engine analysis pipeline for a standard-complexity APK (≤50 MB) within 45 minutes under normal operating conditions.|
|**Measurement**|`scan.completedAt - scan.createdAt ≤ 45 minutes` for 90th percentile of scans.|

**NFR-002**

|Field|Detail|
|---|---|
|**ID**|NFR-002|
|**Name**|Dashboard Load Time|
|**Description**|The main dashboard page shall achieve initial load (Time-to-Interactive) within 3 seconds on a 20 Mbps network connection.|
|**Measurement**|Lighthouse TTI score ≤ 3000 ms.|

**NFR-003**

|Field|Detail|
|---|---|
|**ID**|NFR-003|
|**Name**|Real-Time Update Latency|
|**Description**|Scan status changes shall propagate to all connected dashboard clients within 2 seconds via Convex subscriptions.|
|**Measurement**|Time from Convex mutation commit to client re-render ≤ 2000 ms.|

**NFR-004**

|Field|Detail|
|---|---|
|**ID**|NFR-004|
|**Name**|Worker Memory Consumption|
|**Description**|The worker container (`shinodroid-worker`) shall not consume more than 2 GB RAM under any single scan workload.|
|**Measurement**|Docker stats `MEM USAGE` for `shinodroid-worker` ≤ 2.0 GiB.|

**NFR-005**

|Field|Detail|
|---|---|
|**ID**|NFR-005|
|**Name**|MobSF Request Timeout|
|**Description**|All HTTP requests to the MobSF API shall timeout after 3 minutes via AbortController to prevent indefinite blocking.|
|**Measurement**|AbortController timeout configured at 180,000 ms on all MobSF fetch calls.|

**NFR-006**

|Field|Detail|
|---|---|
|**ID**|NFR-006|
|**Name**|Response Size Limits|
|**Description**|HTTP responses from MobSF and external APIs shall be capped at 20 MB. Response bodies exceeding this limit shall be truncated and an error logged.|
|**Measurement**|`Content-Length` check or streaming byte counter enforced at 20,971,520 bytes.|

**NFR-007**

|Field|Detail|
|---|---|
|**ID**|NFR-007|
|**Name**|Concurrent User Capacity|
|**Description**|The web dashboard shall support a minimum of 50 concurrent authenticated users without degradation in response time exceeding 20% above single-user baseline.|
|**Measurement**|Load test with 50 concurrent simulated users; P95 response time ≤ 1.2× single-user P95.|

---

### 3.3.2 Security

**NFR-008**

|Field|Detail|
|---|---|
|**ID**|NFR-008|
|**Name**|Authentication Coverage|
|**Description**|All dashboard pages except the landing page and login/signup shall require an authenticated session. Unauthenticated requests shall be redirected to the login page.|
|**Measurement**|Automated auth boundary test: 100% of protected routes return 302/401 without valid session.|

**NFR-009**

|Field|Detail|
|---|---|
|**ID**|NFR-009|
|**Name**|Secrets in Environment Variables|
|**Description**|All credentials (API keys, tokens, deploy keys) shall be managed exclusively via environment variables. No secrets shall be hardcoded in source code or committed to version control.|
|**Measurement**|Secret scanning CI check (e.g., truffleHog, gitleaks) finds zero violations.|

**NFR-010**

|Field|Detail|
|---|---|
|**ID**|NFR-010|
|**Name**|Docker Non-Root Execution|
|**Description**|All Docker containers shall run as non-root users with the `no-new-privileges` security option applied.|
|**Measurement**|`docker inspect` confirms `User != root` and `SecurityOpt: no-new-privileges:true` for all containers.|

**NFR-011**

|Field|Detail|
|---|---|
|**ID**|NFR-011|
|**Name**|Network Isolation|
|**Description**|MobSF, ADB, Frida server, and emulator ports (8000, 5037, 27042, 5554–5585) shall not be accessible from external networks.|
|**Measurement**|External port scan from outside the host confirms all listed ports are filtered/closed.|

**NFR-012**

|Field|Detail|
|---|---|
|**ID**|NFR-012|
|**Name**|Path Traversal Prevention|
|**Description**|The system shall reject any file path containing `..` sequences in all file handling contexts (upload paths, report paths, inbox paths).|
|**Measurement**|Fuzz test with 50+ path traversal payloads: all rejected with 400 error.|

**NFR-013**

|Field|Detail|
|---|---|
|**ID**|NFR-013|
|**Name**|Stack Trace Confidentiality|
|**Description**|No exception stack traces, internal module paths, or implementation details shall appear in API responses, database records, or user-facing messages.|
|**Measurement**|Code review confirms all error paths pass through sanitization; penetration test confirms no stack traces in responses.|

**NFR-014**

|Field|Detail|
|---|---|
|**ID**|NFR-014|
|**Name**|TLS in Production|
|**Description**|All external-facing HTTP communication in production deployment shall use TLS 1.2 or higher.|
|**Measurement**|SSL Labs scan of production endpoint achieves grade A or above.|

---

### 3.3.3 Reliability

**NFR-015**

|Field|Detail|
|---|---|
|**ID**|NFR-015|
|**Name**|Engine Fault Tolerance|
|**Description**|The failure of any single non-core engine shall not cause the scan to fail. At minimum, a scan with only MobSF completing shall be marked as `completed`.|
|**Measurement**|Integration test: disable each non-MobSF engine individually; confirm `scan.status=completed` in all cases.|

**NFR-016**

|Field|Detail|
|---|---|
|**ID**|NFR-016|
|**Name**|Data Durability|
|**Description**|All persisted scan records and findings shall survive worker process restart without data loss.|
|**Measurement**|Simulate worker crash mid-scan; verify scan record and all pre-crash findings intact in Convex.|

**NFR-017**

|Field|Detail|
|---|---|
|**ID**|NFR-017|
|**Name**|Worker Connectivity Resilience|
|**Description**|The worker shall tolerate transient Convex connectivity failures and retry with exponential backoff before entering fault state.|
|**Measurement**|Simulate 2 consecutive Convex timeouts; verify worker retries and recovers without restart.|

---

### 3.3.4 Availability

**NFR-018**

|Field|Detail|
|---|---|
|**ID**|NFR-018|
|**Name**|Platform Availability Target|
|**Description**|The Shinodroid platform shall target 99.5% uptime measured on a monthly basis for the web dashboard interface.|
|**Measurement**|External uptime monitoring; monthly downtime ≤ 3.65 hours.|

**NFR-019**

|Field|Detail|
|---|---|
|**ID**|NFR-019|
|**Name**|Health Check Endpoint|
|**Description**|The `shinodroid-web` container shall expose a `/health` HTTP endpoint returning HTTP 200 and JSON status used by Docker Compose health checks.|
|**Measurement**|`docker inspect --format='{{.State.Health.Status}}' shinodroid-web` returns `healthy`.|

---

### 3.3.5 Maintainability

**NFR-020**

|Field|Detail|
|---|---|
|**ID**|NFR-020|
|**Name**|Engine Plugin Architecture|
|**Description**|Adding a new analysis engine shall require only: creating a new `.engine.mjs` file conforming to `_engine-interface.mjs` in the `engines/` directory and assigning it to a pipeline phase. No orchestrator code changes shall be required.|
|**Measurement**|Developer test: new engine discoverable and executing without modifying `orchestrator.mjs`.|

**NFR-021**

|Field|Detail|
|---|---|
|**ID**|NFR-021|
|**Name**|Code Documentation|
|**Description**|All engine modules and the orchestrator shall include JSDoc comments for all exported functions and type definitions.|
|**Measurement**|JSDoc coverage tool reports ≥ 80% documented function signatures.|

**NFR-022**

|Field|Detail|
|---|---|
|**ID**|NFR-022|
|**Name**|Environment-Driven Configuration|
|**Description**|All deployment-specific parameters (URLs, API keys, directory paths, model names) shall be configurable via environment variables without code changes.|
|**Measurement**|All enumerated environment variables in §3.5 are functional when set; defaults apply when not set.|

---

### 3.3.6 Portability

**NFR-023**

|Field|Detail|
|---|---|
|**ID**|NFR-023|
|**Name**|Docker Compose Portability|
|**Description**|The production deployment shall be fully operable via `docker compose up` without manual container configuration steps on any Docker-capable x86_64 Linux or Windows host.|
|**Measurement**|Fresh host deployment test: `docker compose up` produces fully functional platform within 10 minutes.|

**NFR-024**

|Field|Detail|
|---|---|
|**ID**|NFR-024|
|**Name**|Local Development Portability|
|**Description**|Local development shall be operable on Windows, macOS, and Linux hosts with Node.js ≥22.0.0 installed, using only two terminal commands.|
|**Measurement**|`cd web && npm run dev` + `node supabase-worker.mjs` suffices for local dev.|

---

## 3.4 Database Requirements

### 3.4.1 Scans Table

**Table Name:** `scans` **Backend:** Convex (managed NoSQL document store)

|Field|Type|Required|Description|
|---|---|---|---|
|`_id`|ConvexId|Auto|System-generated unique document identifier|
|`_creationTime`|number|Auto|Convex creation timestamp (ms since epoch)|
|`userId`|Id<"users">|Yes|Reference to owning user document|
|`fileName`|string|Yes|Original APK filename submitted by user|
|`filePath`|string|Yes|Logical file path reference within storage|
|`fileSize`|number|Yes|APK file size in bytes|
|`status`|string|Yes|Scan lifecycle state: `pending` \| `scanning` \| `completed` \| `failed`|
|`scanType`|string|No|Scan classification (e.g., `static`, `full`, `dynamic`)|
|`findingsCritical`|number|No|Denormalized count of critical severity findings|
|`findingsHigh`|number|No|Denormalized count of high severity findings|
|`findingsMedium`|number|No|Denormalized count of medium severity findings|
|`findingsLow`|number|No|Denormalized count of low severity findings|
|`findingsInfo`|number|No|Denormalized count of info severity findings|
|`reportUrl`|string|No|Legacy/external report URL field|
|`reportJson`|any|No|Full MobSF JSON report (stored inline for small reports)|
|`errorMessage`|string|No|Sanitized error message if scan failed|
|`storageId`|Id<"_storage">|No|Convex storage ID for uploaded APK file|
|`reportStorageId`|Id<"_storage">|No|Convex storage ID for `report.pdf`|
|`dynamicReportStorageId`|Id<"_storage">|No|Convex storage ID for `frida-results.json`|
|`aiReportStorageId`|Id<"_storage">|No|Convex storage ID for `ai-security-analysis.pdf`|
|`completedAt`|number|No|Timestamp (ms since epoch) when scan reached terminal state|

**Indexes:**

|Index Name|Fields|Purpose|
|---|---|---|
|`by_userId`|`[userId]`|Retrieve all scans for a specific user|
|`by_status`|`[status]`|Retrieve all scans in a given lifecycle state (worker polling)|
|`by_userId_status`|`[userId, status]`|Concurrent scan limit enforcement per user|

---

### 3.4.2 Findings Table

**Table Name:** `findings` **Backend:** Convex

|Field|Type|Required|Description|
|---|---|---|---|
|`_id`|ConvexId|Auto|System-generated unique document identifier|
|`_creationTime`|number|Auto|Convex creation timestamp|
|`scanId`|Id<"scans">|Yes|Reference to parent scan document|
|`title`|string|Yes|Human-readable finding title (e.g., "SSL Certificate Pinning Bypassed")|
|`severity`|string|Yes|Severity level: `critical` \| `high` \| `medium` \| `low` \| `info`|
|`severityOrder`|number|Yes|Numeric severity for sorting: 5=critical, 4=high, 3=medium, 2=low, 1=info|
|`category`|string|Yes|Finding category (e.g., "SSL Pinning", "Static Analysis", "Data Storage")|
|`description`|string|Yes|Evidence, observed behavior, or technical detail|
|`recommendation`|string|Yes|Specific remediation guidance|
|`cvssScore`|number|No|CVSS v3.1 base score (0.0–10.0), null if not available|
|`owaspCategory`|string|No|OWASP Mobile Top 10 category (e.g., "M3: Insecure Communication")|
|`owaspMasvs`|string|No|OWASP MASVS control reference (e.g., "MSTG-NETWORK-1")|
|`engine`|string|Yes|Engine that generated this finding (e.g., "frida", "mobsf", "androwarn")|

**Indexes:**

|Index Name|Fields|Purpose|
|---|---|---|
|`by_scanId`|`[scanId]`|Retrieve all findings for a specific scan|
|`by_severity`|`[severity]`|Filter findings by severity level|

---

### 3.4.3 Auth Tables (Managed by Convex Auth)

|Table|Description|
|---|---|
|`users`|User accounts (email, profile data)|
|`sessions`|Active user sessions with expiry|
|`accounts`|OAuth/provider account links|
|`verificationTokens`|Email verification and password reset tokens|

---

### 3.4.4 Data Constraints

- **DC-01:** `findings.severityOrder` must be consistent with `findings.severity`: critical=5, high=4, medium=3, low=2, info=1.
- **DC-02:** `scans.userId` must reference a valid document in the `users` table.
- **DC-03:** `findings.scanId` must reference a valid document in the `scans` table.
- **DC-04:** `scans.status` must be one of the enumerated state values; no arbitrary states are permitted.
- **DC-05:** Total findings per scan (sum of all `findingsX` fields) must not exceed 2000.
- **DC-06:** `scans.fileSize` must be a positive integer ≤ 100,000,000 (100 MB).

---

## 3.5 Design Constraints

**DC-01:** The backend runtime shall use Node.js ≥22.0.0 with native ESM module support. All backend source files shall use `.mjs` extension.

**DC-02:** The frontend shall be built exclusively with Next.js 16.1.6 and React 19.2.3. No other web frameworks shall be introduced without formal SRS amendment.

**DC-03:** The primary database and authentication backend shall be Convex 1.32.0. Direct SQL or other database technologies are not permitted without formal architecture review.

**DC-04:** All containerized services shall be defined in Docker Compose configuration. Kubernetes or other orchestration platforms are outside scope for version 1.0.0.

**DC-05:** The AI triage layer shall exclusively use Ollama as the LLM inference server. Direct external LLM API calls (OpenAI, Anthropic, etc.) are not permitted in version 1.0.0 to preserve data sovereignty.

**DC-06:** PDF report generation shall use Puppeteer (headless Chromium). No external PDF generation services may be introduced.

**DC-07:** CSS styling shall use TailwindCSS 4.x. Custom CSS shall be minimized to component-specific overrides only.

**DC-08:** All environment variables listed in the configuration table (§1 system overview) shall remain the exclusive configuration mechanism. Configuration files containing secrets are not permitted in the source tree.

**DC-09:** The MobSF engine is the **only mandatory** engine for a scan to be marked `completed`. All other engines are optional contributors.

**DC-10:** The AI engine must always execute **last** in the pipeline, after all other engines have completed or failed.

---

## 3.6 Software System Attributes

|Attribute|Description|
|---|---|
|**Extensibility**|The plugin-based engine architecture allows new analysis engines to be added without modifying core orchestration logic. New engines require only conformance to `_engine-interface.mjs`.|
|**Auditability**|Every scan produces a traceable artifact chain: input APK → engine-attributed findings → AI triage → PDF reports. All records are timestamped and user-attributed.|
|**Observability**|Worker process logs all engine start/stop events, findings counts, errors, and lifecycle transitions. Convex dashboard provides real-time database visibility.|
|**Graceful Degradation**|The system is designed to deliver maximum value even when subsystems are unavailable. Only MobSF is strictly required; all other components degrade gracefully.|
|**Data Sovereignty**|AI inference runs locally via Ollama; no APK data is transmitted to external LLM providers.|
|**Reproducibility**|Pinned dependency versions (`package.json` exact versions) and Docker image tagging ensure reproducible builds and deterministic environments.|
|**Modularity**|Clear separation of concerns: web UI (`web/`), worker (`supabase-worker.mjs`), engines (`engines/`), scripts (`scripts/`), and Convex backend (`convex/`).|

---

# SECTION 4 — USE CASES

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## UC-001: Submit APK via Web Dashboard

|Field|Detail|
|---|---|
|**UC-ID**|UC-001|
|**Name**|Submit APK via Web Dashboard|
|**Actor**|Security Analyst (authenticated user)|
|**Preconditions**|1. User is authenticated with a valid session. 2. User has fewer than 3 active scans. 3. Convex backend is reachable.|
|**Main Flow**|1. User navigates to `dashboard/scan` page. 2. User drags-and-drops or selects an APK file via file browser. 3. Client validates file extension (`.apk`) and size (≤100 MB). 4. Client uploads APK to Convex file storage. 5. System creates scan record with `status=pending`. 6. System displays scan ID and confirmation. 7. User is redirected to scan detail page. 8. Real-time status updates begin appearing via Convex subscription.|
|**Alternative Flows**|**AF-1 (File too large):** At step 3, if file > 100 MB, display client-side error "File exceeds 100 MB limit." No upload initiated. **AF-2 (Wrong extension):** At step 3, if extension ≠ `.apk`, display error "Only .apk files are accepted." **AF-3 (Concurrent scan limit):** At step 5, if user has ≥3 active scans, return HTTP 429 "Maximum 3 concurrent scans reached."|
|**Postconditions**|Scan record created in Convex `scans` table with `status=pending`. APK stored in Convex storage.|
|**Exceptions**|**EX-1 (Convex unavailable):** Upload fails with "Service temporarily unavailable." No scan record created. **EX-2 (Session expired):** User redirected to login page.|

---

## UC-002: Monitor Scan in Real-Time

|Field|Detail|
|---|---|
|**UC-ID**|UC-002|
|**Name**|Monitor Scan Progress in Real-Time|
|**Actor**|Security Analyst|
|**Preconditions**|1. A scan has been submitted (UC-001). 2. User is authenticated. 3. User is viewing the scan detail or dashboard page.|
|**Main Flow**|1. User opens scan detail page (`dashboard/scan/[id]`). 2. Page subscribes to Convex real-time updates for the scan record. 3. As worker processes the scan, `status` transitions from `pending → scanning`. 4. Dashboard displays animated progress indicator. 5. Upon engine completion, severity counts update (e.g., "14 High findings detected"). 6. Upon full completion, `status` transitions to `completed`. 7. Report download buttons appear.|
|**Alternative Flows**|**AF-1 (Scan fails):** `status` transitions to `failed`. Error message displayed. Download buttons absent for failed artifacts.|
|**Postconditions**|User has real-time visibility into scan progress and final status without page refresh.|
|**Exceptions**|**EX-1 (WebSocket disconnection):** Convex client auto-reconnects; status may be stale for ≤30 seconds.|

---

## UC-003: Download Security Report

|Field|Detail|
|---|---|
|**UC-ID**|UC-003|
|**Name**|Download Security Report PDF|
|**Actor**|Security Analyst / Executive|
|**Preconditions**|1. Scan has `status=completed`. 2. At least one report PDF was successfully generated and uploaded. 3. User is authenticated and owns the scan (`userId` match).|
|**Main Flow**|1. User navigates to scan detail page or reports page. 2. User clicks "Download Static Report," "Download Dynamic Report," or "Download AI Report." 3. System validates user ownership of scan. 4. System resolves `reportStorageId` / `dynamicReportStorageId` / `aiReportStorageId` from `scans` record. 5. System generates time-limited Convex storage download URL. 6. Browser downloads PDF.|
|**Alternative Flows**|**AF-1 (AI report unavailable):** If `aiReportStorageId` is null (AI engine failed), "Download AI Report" button is greyed out with tooltip "AI report not available for this scan." **AF-2 (Dynamic report unavailable):** If no emulator was running, dynamic report button shows "Dynamic analysis was skipped."|
|**Postconditions**|PDF report downloaded to user's local machine.|
|**Exceptions**|**EX-1 (Storage URL expired):** User receives 403 from Convex storage. System instructs user to retry.|

---

## UC-004: Submit APK via Telegram Bot

|Field|Detail|
|---|---|
|**UC-ID**|UC-004|
|**Name**|Submit APK via Telegram Bot|
|**Actor**|Security Analyst (Telegram user)|
|**Preconditions**|1. `TELEGRAM_BOT_TOKEN` is configured. 2. Telegram bot is running. 3. User's chat ID is in `TELEGRAM_ALLOWED_CHATS` (or allowlist is not configured).|
|**Main Flow**|1. User opens Telegram and starts a conversation with the Shinodroid bot. 2. User sends an APK file as a document attachment. 3. Bot receives `document` update from Telegram API. 4. Bot validates sender's `chat_id` against allowlist. 5. Bot validates file extension (`.apk`). 6. Bot downloads file via Telegram Bot API. 7. Bot validates ZIP magic bytes and file size. 8. Bot submits APK to scan pipeline. 9. Bot replies: "✅ Scan initiated! Scan ID: [id]. I'll notify you when complete." 10. Upon scan completion, bot sends follow-up message with scan summary and report link.|
|**Alternative Flows**|**AF-1 (Unauthorized chat):** At step 4, if chat ID not in allowlist, bot replies "❌ Unauthorized. This bot is restricted." No scan initiated. **AF-2 (Not an APK):** At step 5, bot replies "❌ Please send an .apk file." **AF-3 (File too large):** Bot replies "❌ File exceeds 100MB limit."|
|**Postconditions**|Scan record created; user notified via Telegram on completion.|
|**Exceptions**|**EX-1 (Telegram API unavailable):** Bot polling fails; queued messages processed on recovery.|

---

## UC-005: Automated Folder-Drop Scan

|Field|Detail|
|---|---|
|**UC-ID**|UC-005|
|**Name**|Trigger Scan via Folder-Drop|
|**Actor**|CI/CD Pipeline / DevSecOps Engineer|
|**Preconditions**|1. Worker process is running with chokidar watching `APK_INBOX_DIR`. 2. `APK_INBOX_DIR` directory exists and is writable. 3. `REPORTS_OUTPUT_DIR` is configured.|
|**Main Flow**|1. CI/CD pipeline copies compiled APK to `APK_INBOX_DIR`. 2. chokidar 4.0.0 detects `add` event for new file. 3. System validates file extension and ZIP magic bytes. 4. System validates file size. 5. System initiates full scan pipeline. 6. On completion, reports written to `REPORTS_OUTPUT_DIR`. 7. CI/CD pipeline reads report artifacts for pass/fail determination.|
|**Alternative Flows**|**AF-1 (Invalid file type):** File is logged as rejected; no scan initiated; invalid file is moved to error subdirectory. **AF-2 (Duplicate file):** If same filename already exists in active scans, system logs warning and deduplicates.|
|**Postconditions**|APK scanned; report artifacts in `REPORTS_OUTPUT_DIR`; CI pipeline can parse results.|
|**Exceptions**|**EX-1 (Disk full):** Worker logs critical error; scan fails; `REPORTS_OUTPUT_DIR` write fails.|

---

## UC-006: View Findings with OWASP Mapping

|Field|Detail|
|---|---|
|**UC-ID**|UC-006|
|**Name**|Review Security Findings with OWASP MASVS Mapping|
|**Actor**|Security Analyst|
|**Preconditions**|1. Scan has `status=completed`. 2. Findings have been persisted to Convex `findings` table. 3. User is authenticated and owns the scan.|
|**Main Flow**|1. User opens scan detail page (`dashboard/scan/[id]`). 2. System queries `findings` table via `by_scanId` index. 3. Findings displayed in severity-sorted list (Critical → High → Medium → Low → Info). 4. Each finding shows: title, severity badge, category, engine attribution, OWASP category, OWASP MASVS reference, description, recommendation. 5. User applies severity filter to focus on critical/high findings. 6. User applies engine filter to view only Frida-detected findings. 7. User exports filtered list to CSV (if implemented).|
|**Alternative Flows**|**AF-1 (No findings):** Page displays "No findings recorded. The application may be well-secured or engines may not have executed." **AF-2 (OWASP field absent):** If finding has null `owaspMasvs`, field shows "N/A."|
|**Postconditions**|Analyst has reviewed findings with full OWASP MASVS context.|
|**Exceptions**|**EX-1 (Large finding set):** If >2000 findings, system notes "Results truncated at 2000 findings per system limit."|

---

## UC-007: Dynamic Analysis with Frida on Emulator

|Field|Detail|
|---|---|
|**UC-ID**|UC-007|
|**Name**|Execute Dynamic Analysis via Frida Instrumentation|
|**Actor**|Scan Worker (automated), DevSecOps Engineer (precondition setup)|
|**Preconditions**|1. Android emulator is running and ADB-accessible. 2. Frida server 16.7.19 binary is present on the emulator. 3. frida-tools 16.7.19 installed on the host. 4. APK has been installed on emulator (FR-021 executed).|
|**Main Flow**|1. Frida engine checks `isAvailable()`: verifies `frida-ps -U` returns successfully. 2. Engine launches target application on emulator. 3. Engine injects `SSL-BYE.js` via `frida -U -l SSL-BYE.js -f <package>`. 4. SSL pinning bypass attempts logged. 5. Engine injects `ROOTER.js` for root detection analysis. 6. Engine sequentially injects SHINOBI suite scripts. 7. Each script's output parsed into `Finding[]` with engine="frida". 8. Engine returns complete `EngineResult`.|
|**Alternative Flows**|**AF-1 (No emulator running):** `isAvailable()` returns false; engine skipped; pipeline continues with Phase 3. **AF-2 (Script crash):** Individual script failure caught; error logged; remaining scripts continue. **AF-3 (App crashes under Frida):** Logcat captures crash; finding generated: "Application crashes under instrumentation."|
|**Postconditions**|Frida findings in `EngineResult`; `frida-results.json` written to output directory.|
|**Exceptions**|**EX-1 (Frida server version mismatch):** Frida logs error; engine marks all scripts failed; pipeline continues.|

---

## UC-008: AI-Powered Triage Report Generation

|Field|Detail|
|---|---|
|**UC-ID**|UC-008|
|**Name**|Generate AI Security Triage Report|
|**Actor**|Scan Worker (automated), AI Engine (MiniMax M2.7 via Ollama)|
|**Preconditions**|1. Phases 1–4 of the pipeline have completed (or failed gracefully). 2. At least 1 finding exists in the accumulated findings list. 3. Ollama is running at `OLLAMA_BASE_URL` with `OLLAMA_MODEL` available.|
|**Main Flow**|1. AI engine collects all accumulated `Finding[]` from context. 2. Engine deduplicates and sorts findings by `severity_order` descending. 3. Findings chunked into batches of ≤20. 4. System prompt constructed: "You are a principal-level Android security analyst..." 5. Each batch submitted to Ollama `POST /api/generate` with `temperature=0.3`, `max_predict=8192`. 6. Responses aggregated. 7. Markdown report assembled with: Mermaid severity pie chart; Mermaid engine coverage chart; Mermaid category breakdown; executive summary; per-finding deep analysis; threat model; attack flow diagram; MASVS compliance table; Gantt remediation roadmap. 8. Report saved as `ai-security-analysis.md`. 9. Puppeteer converts Markdown to `ai-security-analysis.pdf`. 10. PDF uploaded to Convex storage; `aiReportStorageId` set on scan record.|
|**Alternative Flows**|**AF-1 (Ollama unavailable):** Engine catches connection error; logs "AI triage skipped – Ollama unavailable"; pipeline marks AI engine as `skipped`; scan completes without AI report. **AF-2 (Token overflow):** Batch size auto-reduced; if single finding still overflows, finding description truncated and logged. **AF-3 (Zero findings):** AI engine skipped; log "No findings to triage."|
|**Postconditions**|`ai-security-analysis.md` and `ai-security-analysis.pdf` in scan output. `scans.aiReportStorageId` updated. Scan status set to `completed`.|
|**Exceptions**|**EX-1 (Puppeteer PDF fails):** Markdown file preserved; PDF upload skipped; scan still marked `completed`.|

---

# SECTION 5 — SYSTEM ARCHITECTURE DIAGRAMS

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 5.1 High-Level System Architecture

mermaid

```
graph TB
    subgraph "Client Layer"
        WB[Web Browser]
        TG[Telegram Client]
        FS[Filesystem / CI-CD]
    end

    subgraph "Interface Layer"
        NEXT["Next.js Dashboard\n(shinodroid-web :3000)"]
        BOT["Telegram Bot\n(node-telegram-bot-api)"]
        WATCH["File Watcher\n(chokidar 4.0.0)"]
    end

    subgraph "Backend-as-a-Service"
        CONVEX["Convex BaaS\n(DB + Auth + Storage)\nv1.32.0"]
    end

    subgraph "Worker Layer"
        WORKER["Scan Worker\n(supabase-worker.mjs)\nNode.js ≥22.0.0"]
        ORCH["Engine Orchestrator\n(orchestrator.mjs)"]
    end

    subgraph "Phase 1: Static Analysis (Parallel)"
        MOBSF["MobSF Engine\n(mobsf.engine.mjs)\nv4.4.5"]
        ANDRO["Androwarn Engine\n(androwarn.engine.mjs)"]
        FIRE["Firebase Engine\n(firebase.engine.mjs)"]
    end

    subgraph "Phase 2: Dynamic Analysis (Sequential)"
        FRIDA["Frida Engine\n(frida.engine.mjs)\nv16.7.19"]
        LOGCAT["Logcat Engine\n(logcat.engine.mjs)"]
    end

    subgraph "Phase 3-4: Network + SCA (Placeholder)"
        NET["Network Analysis\n(mitmproxy, Nuclei)"]
        SCA["SCA Engine\n(Dependency-Check, Syft)"]
    end

    subgraph "Phase 5: AI Triage (Last)"
        AI["AI Engine\n(ai.engine.mjs)\nMiniMax M2.7"]
    end

    subgraph "External Services"
        MOBSF_SVC["MobSF Service\n(:8000)"]
        OLLAMA["Ollama Server\n(:11434)"]
        EMU["Android Emulator\n(AVD/BrutDroid)"]
        ADB_SVC["ADB\n(:5037)"]
        PUPPET["Puppeteer\n(Headless Chrome)"]
    end

    WB -->|HTTPS| NEXT
    TG -->|HTTPS| BOT
    FS -->|Filesystem| WATCH

    NEXT -->|SDK| CONVEX
    BOT -->|API| CONVEX
    WATCH -->|API| CONVEX

    CONVEX -->|Poll every 30s| WORKER
    WORKER --> ORCH

    ORCH -->|Phase 1 parallel| MOBSF
    ORCH -->|Phase 1 parallel| ANDRO
    ORCH -->|Phase 1 parallel| FIRE

    ORCH -->|Phase 2 sequential| FRIDA
    ORCH -->|Phase 2 sequential| LOGCAT

    ORCH -->|Phase 3-4| NET
    ORCH -->|Phase 3-4| SCA

    ORCH -->|Phase 5 last| AI

    MOBSF -->|REST API| MOBSF_SVC
    AI -->|REST API| OLLAMA
    FRIDA -->|frida-tools| EMU
    LOGCAT -->|adb logcat| ADB_SVC
    ADB_SVC --> EMU
    AI -->|PDF render| PUPPET

    WORKER -->|Upload reports| CONVEX
```

---

## 5.2 Engine Pipeline Execution Flow

mermaid

```
sequenceDiagram
    participant W as Worker
    participant O as Orchestrator
    participant P1 as Phase 1 (Static)
    participant P2 as Phase 2 (Dynamic)
    participant P5 as Phase 5 (AI)
    participant C as Convex

    W->>C: Poll for pending scans
    C-->>W: Scan record (status=pending)
    W->>C: Update status=scanning
    W->>C: Download APK from storage
    W->>O: runAllEngines(apkPath, context)

    par Phase 1 - Parallel Static
        O->>P1: MobSF.run()
        O->>P1: Androwarn.run()
        O->>P1: Firebase.run()
    end
    P1-->>O: Findings[]

    O->>P2: Frida.run() (sequential)
    P2-->>O: Findings[]
    O->>P2: Logcat.run() (sequential)
    P2-->>O: Findings[]

    Note over O,P5: Phases 3-4 execute (placeholders)

    O->>P5: AI.run(allFindings)
    P5-->>O: AI Report + Findings[]

    O-->>W: Complete EngineResult[]

    W->>C: Insert findings (batches of 50)
    W->>C: Upload PDF reports to storage
    W->>C: Update scan (status=completed, counts, storageIds)
    W->>W: Cleanup temp files (finally)
```

---

## 5.3 Authentication and Authorization Flow

mermaid

```
sequenceDiagram
    participant U as User Browser
    participant N as Next.js
    participant CA as Convex Auth
    participant DB as Convex DB

    U->>N: POST /login (email, password)
    N->>CA: auth.signIn(email, password)
    CA->>DB: Validate credentials (users table)
    DB-->>CA: User document
    CA->>DB: Create session (sessions table)
    CA-->>N: Session token + user identity
    N-->>U: Set session cookie; redirect /dashboard

    U->>N: GET /dashboard/scan/[id]
    N->>CA: getUserIdentity(sessionToken)
    CA-->>N: {subject: userId, ...}
    N->>DB: query scans where _id=id AND userId=subject
    DB-->>N: Scan document (or null if unauthorized)
    alt Authorized
        N-->>U: Render scan detail page
    else Unauthorized
        N-->>U: 403 Forbidden
    end
```

---

## 5.4 Docker Compose Deployment Topology

mermaid

```
graph TB
    subgraph "Docker Host"
        subgraph "Docker Bridge Network: shinodroid-net"
            WEB["shinodroid-web\nNext.js :3000\nHealthcheck: /health\n2G RAM / 2 CPU"]
            WRKR["shinodroid-worker\nNode.js Worker\n2G RAM / 2 CPU\ndepends_on: mobsf"]
            MOBSF_C["shinodroid-mobsf\nMobSF :8000\nAPI-only mode\n3G RAM / 2 CPU"]
        end

        subgraph "Named Volumes"
            VOL_RPT["shinodroid-reports\n(Persistent scan output)"]
            VOL_MOBSF["shinodroid-mobsf\n(MobSF data cache)"]
        end
    end

    EXT_USR["External Users\n(Browser / Telegram)"] -->|":3000 (exposed)"| WEB
    WEB -->|"Convex SDK"| CONVEX_CLOUD["Convex Cloud\n(External)"]
    WRKR -->|"Convex SDK"| CONVEX_CLOUD
    WRKR -->|"HTTP :8000 (internal)"| MOBSF_C
    WRKR -->|"HTTP :11434 (host)"| OLLAMA_HOST["Ollama (Host)"]

    WRKR --- VOL_RPT
    MOBSF_C --- VOL_MOBSF

    style EXT_USR fill:#ff6b6b,color:#fff
    style CONVEX_CLOUD fill:#4ecdc4,color:#000
    style OLLAMA_HOST fill:#45b7d1,color:#000
```

---

## 5.5 Finding Schema State Diagram

mermaid

```
stateDiagram-v2
    [*] --> Submitted: APK uploaded
    Submitted --> Pending: Scan record created (status=pending)
    Pending --> Scanning: Worker picks up scan
    Scanning --> Phase1: Orchestrator starts
    Phase1 --> Phase2: Static analysis complete
    Phase2 --> Phase3_4: Dynamic analysis complete
    Phase3_4 --> Phase5: Network/SCA complete
    Phase5 --> Uploading: AI triage complete
    Uploading --> Completed: Reports uploaded, counts updated (status=completed)
    Scanning --> Failed: Critical engine error (status=failed)
    Phase1 --> Failed: MobSF unavailable (only mandatory engine)
    Completed --> [*]
    Failed --> [*]
```

---

# SECTION 6 — DATA FLOW DIAGRAMS

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 6.1 Level 0 — Context Diagram (DFD-L0)

mermaid

```
graph LR
    ANALYST(["Security Analyst"])
    CICD(["CI/CD System"])
    TELEGRAM_USER(["Telegram User"])
    EXEC(["Executive"])

    subgraph "SHINODROID SYSTEM"
        SYSTEM["🥷 SHINODROID\n忍ドロイド\n\nAI-Powered Android\nSecurity Analysis Platform"]
    end

    ANALYST -->|"APK File\nvia Web Dashboard"| SYSTEM
    CICD -->|"APK File\nvia Folder Drop"| SYSTEM
    TELEGRAM_USER -->|"APK File\nvia Telegram Bot"| SYSTEM

    SYSTEM -->|"PDF Security Reports\n(Static, Dynamic, AI)"| ANALYST
    SYSTEM -->|"Security Findings\n(JSON, Web UI)"| ANALYST
    SYSTEM -->|"Report Summary\nTelegram Message"| TELEGRAM_USER
    SYSTEM -->|"Executive PDF Report\nVia Dashboard"| EXEC
    SYSTEM -->|"JSON Findings\nReport Artifacts"| CICD

    style SYSTEM fill:#1a1a2e,color:#e0e0e0
```

---

## 6.2 Level 1 — System DFD (DFD-L1)

mermaid

```
graph TD
    %% External Entities
    UA(["User / Analyst"])
    TGA(["Telegram User"])
    FSA(["Filesystem / CI-CD"])

    %% Processes
    P1["P1\nAPK Ingestion\n& Validation"]
    P2["P2\nScan Lifecycle\nManagement"]
    P3["P3\nEngine\nOrchestration"]
    P4["P4\nStatic Analysis\n(Phase 1)"]
    P5["P5\nDynamic Analysis\n(Phase 2)"]
    P6["P6\nAI Triage\n(Phase 5)"]
    P7["P7\nReport\nGeneration"]
    P8["P8\nFinding\nPersistence"]
    P9["P9\nUser Auth\n& Authorization"]

    %% Data Stores
    DS1[("DS1\nConvex scans\ntable")]
    DS2[("DS2\nConvex findings\ntable")]
    DS3[("DS3\nConvex storage\n(files)")]
    DS4[("DS4\nTemp Filesystem\n(scan staging)")]
    DS5[("DS5\nConvex users\n& sessions")]

    %% External Services
    ES1["MobSF API\n:8000"]
    ES2["Ollama API\n:11434"]
    ES3["Android Emulator\n+ADB"]
    ES4["Telegram API"]

    %% Flows
    UA -->|"APK file, credentials"| P1
    TGA -->|"APK document"| P1
    FSA -->|"APK file (chokidar)"| P1

    P1 -->|"Validated APK binary"| DS3
    P1 -->|"Scan metadata"| P2
    P1 -->|"Auth context"| P9
    P9 <-->|"Session validation"| DS5

    P2 -->|"Scan record"| DS1
    P2 -->|"Trigger"| P3

    P3 -->|"APK path + context"| DS4
    P3 -->|"APK + API key"| P4
    P3 -->|"APK + emulator ref"| P5
    P3 -->|"All findings"| P6

    P4 -->|"REST calls"| ES1
    ES1 -->|"JSON findings, PDF"| P4
    P4 -->|"Finding[]"| P8

    P5 -->|"Frida inject"| ES3
    ES3 -->|"Runtime data"| P5
    P5 -->|"Finding[]"| P8

    P6 -->|"Prompt + findings"| ES2
    ES2 -->|"AI analysis text"| P6
    P6 -->|"AI finding[]"| P8
    P6 -->|"Markdown report"| P7

    P8 -->|"Normalized findings"| DS2
    P8 -->|"Severity counts"| DS1

    P7 -->|"PDF report"| DS3
    P7 -->|"Report storage IDs"| DS1

    DS1 -->|"Scan status"| UA
    DS2 -->|"Findings list"| UA
    DS3 -->|"Report download"| UA
    DS3 -->|"Report message"| TGA
```

---

# SECTION 7 — TRACEABILITY MATRIX

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

The following matrix maps functional requirements (FR-001–FR-046) to the use cases (UC-001–UC-008) they support, confirming complete coverage.

|Requirement ID|Requirement Name|UC-001|UC-002|UC-003|UC-004|UC-005|UC-006|UC-007|UC-008|
|---|---|---|---|---|---|---|---|---|---|
|FR-001|Web APK Upload|✅||||||||
|FR-002|Telegram APK Submission||||✅|||||
|FR-003|Folder-Drop APK Ingestion|||||✅||||
|FR-004|File Type Validation|✅|||✅|✅||||
|FR-005|File Size Validation|✅|||✅|✅||||
|FR-006|Scan Record Creation|✅|||✅|✅||||
|FR-007|Scan Status Lifecycle|✅|✅||✅|✅||||
|FR-008|Worker Scan Polling||✅|||✅||||
|FR-009|Concurrent Scan Limit|✅||||||||
|FR-010|Temp File Cleanup|||||✅||✅|✅|
|FR-011|Error Sanitization||✅|||||||
|FR-012|Worker Auto-Retry||✅|||✅||||
|FR-013|Engine Auto-Discovery|||||||✅|✅|
|FR-014|Engine Availability Check|||||||✅|✅|
|FR-015|Phased Pipeline Execution||✅|||✅||✅|✅|
|FR-016|Engine Isolation on Failure||✅|||✅||✅|✅|
|FR-017|Standardized Engine Result||||||✅|✅|✅|
|FR-018|MobSF Static Analysis||✅|||✅|✅|||
|FR-019|Androwarn Behavioral Analysis||✅|||✅|✅|||
|FR-020|Firebase Misconfiguration Scanner||✅|||✅|✅|||
|FR-021|APK Installation on Emulator|||||||✅||
|FR-022|Frida SSL Pinning Bypass||||||✅|✅||
|FR-023|Frida Root Detection Bypass||||||✅|✅||
|FR-024|Frida Security Module Analysis||||||✅|✅||
|FR-025|Logcat Runtime Log Analysis||||||✅|✅||
|FR-026|AI Engine Finding Aggregation||||||||✅|
|FR-027|AI Security Report Generation||||||||✅|
|FR-028|AI Report PDF Conversion|||✅|||||✅|
|FR-029|AI Graceful Degradation||✅||||||✅|
|FR-030|Finding Batch Insertion||✅|||✅|✅|||
|FR-031|Findings DOS Protection Cap|||||✅||||
|FR-032|Denormalized Severity Count||✅||||✅|||
|FR-033|Report Upload to Convex Storage||✅|✅||✅|||✅|
|FR-034|Report Download via Dashboard|||✅||||||
|FR-035|User Registration|✅||||||||
|FR-036|User Authentication|✅||||||||
|FR-037|Row-Level Authorization|✅|✅|✅|||✅|||
|FR-038|API Rate Limiting|✅||||||||
|FR-039|SSRF Prevention|||||||||
|FR-040|Real-Time Scan Status Dashboard||✅|||||||
|FR-041|3D Visualization Landing Page|||||||||
|FR-042|Finding Detail View||||||✅|||
|FR-043|OpenClaw Plugin Interface|||||||||
|FR-044|JSON Report Generation|||✅||✅||||
|FR-045|Dynamic Analysis JSON Report|||✅||||✅||
|FR-046|OWASP MASVS Compliance Mapping||||||✅||✅|

**Coverage Summary:**

- UC-001 covered by: FR-001, FR-004, FR-005, FR-006, FR-007, FR-009, FR-035, FR-036, FR-037, FR-038
- UC-002 covered by: FR-007, FR-008, FR-011, FR-012, FR-015, FR-016, FR-018–FR-020, FR-029, FR-030, FR-032, FR-033, FR-037, FR-040
- UC-003 covered by: FR-028, FR-033, FR-034, FR-037, FR-044, FR-045
- UC-004 covered by: FR-002, FR-004, FR-005, FR-006, FR-007
- UC-005 covered by: FR-003, FR-004, FR-005, FR-010, FR-015, FR-016, FR-018–FR-020, FR-030, FR-031, FR-033, FR-044, FR-045
- UC-006 covered by: FR-017–FR-025, FR-030, FR-032, FR-037, FR-042, FR-046
- UC-007 covered by: FR-010, FR-013–FR-017, FR-021–FR-025, FR-045
- UC-008 covered by: FR-010, FR-013–FR-017, FR-026–FR-029, FR-033

---

## 7.1 NFR to System Attribute Traceability

|NFR ID|Attribute|Related FR(s)|
|---|---|---|
|NFR-001|Performance|FR-008, FR-015|
|NFR-002|Performance|FR-040, FR-041|
|NFR-003|Performance|FR-040|
|NFR-004|Performance|FR-015, FR-016|
|NFR-005|Performance / Security|FR-018|
|NFR-006|Performance / Security|FR-018|
|NFR-007|Performance|FR-040|
|NFR-008|Security|FR-035, FR-036, FR-037|
|NFR-009|Security|FR-039|
|NFR-010|Security|— (deployment)|
|NFR-011|Security|FR-039|
|NFR-012|Security|FR-004, FR-005|
|NFR-013|Security|FR-011|
|NFR-014|Security|— (deployment)|
|NFR-015|Reliability|FR-014, FR-016, FR-029|
|NFR-016|Reliability|FR-006, FR-030|
|NFR-017|Reliability|FR-012|
|NFR-018|Availability|— (deployment)|
|NFR-019|Availability|— (deployment)|
|NFR-020|Maintainability|FR-013, FR-014|
|NFR-021|Maintainability|FR-013|
|NFR-022|Maintainability|— (configuration)|
|NFR-023|Portability|— (deployment)|
|NFR-024|Portability|— (deployment)|

---

# SECTION 8 — APPENDICES

_`CONFIDENTIAL — WORMHOLE Security | Shinodroid SRS v1.0.0`_

---

## 8.1 Glossary

|Term|Definition|
|---|---|
|**AbortController**|Web API used in Node.js to cancel HTTP requests after a configurable timeout. Used in Shinodroid to enforce 2–3 minute timeouts on MobSF and Ollama requests.|
|**Attack Tree**|A structured diagram representing possible attack paths against a system or application, generated by the AI engine in security reports.|
|**BrutDroid**|An Android emulator management tool (version 2.0) used as an alternative to Android Studio AVD for provisioning emulated devices.|
|**chokidar**|A Node.js file system watcher library (version 4.0.0) used to monitor the APK inbox directory for new file additions.|
|**Conscrypt**|Android's TLS implementation provided by the Conscrypt security provider; targeted by SSL-BYE.js bypass methods.|
|**Convex**|A Backend-as-a-Service platform providing a real-time document database, file storage, serverless functions, and managed authentication. Version 1.32.0 is used.|
|**CVSS**|Common Vulnerability Scoring System. A standardized framework for rating the severity of security vulnerabilities on a 0.0–10.0 scale.|
|**Denormalization**|The practice of storing computed/derived values (e.g., finding counts per severity) directly in a parent record to avoid expensive joins at query time.|
|**Engine Interface**|The standard contract defined in `_engine-interface.mjs` that all analysis engine plugins must implement: `name`, `type`, `version`, `isAvailable()`, `run()`.|
|**EngineResult**|The standardized return type from an engine's `run()` method, containing a `findings` array and engine metadata.|
|**Frida**|An open-source dynamic instrumentation framework that enables injection of JavaScript into native application processes at runtime.|
|**Frida Server**|A Frida daemon binary that must be deployed to the Android emulator to enable remote Frida instrumentation.|
|**Gantt Chart**|A project management chart used in the AI report's remediation roadmap section, rendered as Mermaid syntax.|
|**Glassmorphism**|A UI design style characterized by frosted-glass effects, translucency, and blurred backgrounds. Used extensively in the Shinodroid dashboard.|
|**Logcat**|Android's system logging utility, providing real-time log output from applications and the Android OS.|
|**Magic Bytes**|The first bytes of a file that identify its format. APK (ZIP) files begin with `PK\x03\x04`. Used for file type validation beyond extension checking.|
|**Mermaid**|A JavaScript-based diagramming and charting tool that renders diagrams from text-based syntax. Used in AI-generated reports for visual charts and flow diagrams.|
|**MobSF (Mobile Security Framework)**|An automated, open-source mobile application security testing framework supporting static, dynamic, and malware analysis. Version v4.4.5.|
|**OWASP MASVS**|Open Web Application Security Project Mobile Application Security Verification Standard. A security standard for mobile applications.|
|**OWASP Mobile Top 10**|OWASP's list of the ten most critical mobile security risks.|
|**Orchestrator**|The `orchestrator.mjs` module responsible for auto-discovering engine plugins, checking availability, and executing them in the defined phase order.|
|**Puppeteer**|A Node.js library providing a high-level API to control headless Chromium/Chrome, used for PDF report generation. Version 24.40.0.|
|**Recharts**|A React charting library (version 3.7.0) used for severity donut charts in the Shinodroid dashboard.|
|**Row-Level Security**|An access control pattern where database records are only accessible to the user who owns them, enforced via `userId` comparison in all Convex queries.|
|**SHINOBI Suite**|The collection of specialized Frida scripts: SHINOBI-AUTH, SHINOBI-CRYPTO, SHINOBI-NETWORK, SHINOBI-PLATFORM, SHINOBI-RESILIENCE, SHINOBI-STORAGE.|
|**SSL-BYE.js**|A 729-line Frida script implementing 30+ methods to bypass SSL certificate pinning in Android applications.|
|**ROOTER.js**|A 342-line Frida script implementing detection and bypass of root detection mechanisms in Android applications.|
|**TailwindCSS**|A utility-first CSS framework (version 4.x) used for all Shinodroid UI styling.|
|**Three.js**|A JavaScript 3D graphics library (version 0.183.2) used for the landing page interactive 3D visualizations.|
|**Worker**|The `supabase-worker.mjs` process (449 lines) responsible for polling Convex for pending scans, executing the engine pipeline, persisting findings, and uploading reports.|
|**PintooR.js**|A combined Frida script (~500 lines) merging SSL pinning bypass and root detection bypass capabilities into a single injection for comprehensive testing.|

---

## 8.2 Change History

|Version|Date|Author|Section(s) Changed|Description|
|---|---|---|---|---|
|0.1|2025-01|WORMHOLE Engineering Lead|All|Initial SRS scaffold — architecture definition, product scope, technology stack|
|0.2|2025-02|Security Architect|§3.2 (FR-038–FR-039), §3.3.2 (NFR-008–NFR-014)|Security controls enumeration, SSRF prevention specification, rate limiting definition|
|0.3|2025-03|Full Engineering Team|§2.2, §3.2 (FR-013–FR-046), §3.4|Engine interface specification, AI engine requirements, database schema finalization|
|0.4|2025-04|Technical Writer|§4, §5, §6, §7|Use cases, architecture diagrams, DFDs, and traceability matrix added|
|1.0.0|2025|WORMHOLE Engineering|All|First complete release candidate. All sections reviewed. Approved for investor and academic submission.|

---

## 8.3 Open Issues and Future Scope (Version 2.0 Candidates)

|Issue ID|Description|Priority|Target Version|
|---|---|---|---|
|OI-001|Phase 3 (Network Analysis) engines — mitmproxy and Nuclei — are placeholders. Full specification pending.|High|2.0.0|
|OI-002|Phase 4 (SCA) engines — Dependency-Check and Syft — are placeholders. Full specification pending.|High|2.0.0|
|OI-003|Public REST API for programmatic APK submission (CI/CD integration beyond folder-drop).|Medium|2.0.0|
|OI-004|Telegram access control (`TELEGRAM_ALLOWED_CHATS`) is optional — default allow-all is an operational security risk that should be resolved.|High|1.1.0|
|OI-005|AVD/Emulator auto-provisioning via BrutDroid integration (currently requires pre-started emulator).|Medium|2.0.0|
|OI-006|Finding export (CSV, SARIF) from dashboard for integration with vulnerability management platforms (Jira, DefectDojo).|Medium|2.0.0|
|OI-007|Multi-tenant organizational accounts with team-level scan sharing and access control.|Low|3.0.0|
|OI-008|In-memory rate limiter (FR-038) does not persist across worker restarts; distributed rate limiter (Redis) needed for horizontal scaling.|Medium|2.0.0|

---

text

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        DOCUMENT END                                            ║
║                                                                                ║
║   Shinodroid 忍ドロイド — Software Requirements Specification                   ║
║   IEEE 830-2024 Compliant | Version 1.0.0                                      ║
║   CONFIDENTIAL — WORMHOLE Security                                             ║
║                                                                                ║
║   Total Functional Requirements:      FR-001 through FR-046  (46 requirements) ║
║   Total Non-Functional Requirements:  NFR-001 through NFR-024 (24 requirements)║
║   Total Use Cases:                    UC-001 through UC-008   (8 use cases)    ║
║   Total Architecture Diagrams:        5 Mermaid diagrams                       ║
║   Total DFD Levels:                   Level 0 + Level 1                        ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

> **Legal Notice:** This document is the confidential and proprietary property of WORMHOLE Security. It is furnished under a nondisclosure agreement for the sole purpose of evaluation by authorized stakeholders. Reproduction, disclosure, or distribution — in whole or in part — without the express written consent of WORMHOLE Security is strictly prohibited. All findings, architectural patterns, and tooling integrations described herein are protected intellectual property of WORMHOLE Security.