# 🔌 MCP Protocol & MCP Servers — A Visual Guide

---

## 1. What Problem Does MCP Solve?

Before MCP, every AI assistant had to build **custom, one-off integrations** with every tool it wanted to use (like GitHub, Slack, databases, etc.). This was messy and hard to scale.

**MCP (Model Context Protocol)** is a universal standard — like a "USB-C for AI" — that lets any AI model talk to any tool using one consistent protocol.

```mermaid
graph LR
  subgraph WITHOUT_MCP["❌ Without MCP (Custom integrations)"]
    AI1[AI Model] -->|custom code| G[GitHub]
    AI1 -->|custom code| S[Slack]
    AI1 -->|custom code| DB[(Database)]
    AI1 -->|custom code| FS[File System]
  end
```

```mermaid
graph LR
  subgraph WITH_MCP["✅ With MCP (One standard)"]
    AI2[AI Model] -->|MCP| G2[GitHub MCP Server]
    AI2 -->|MCP| S2[Slack MCP Server]
    AI2 -->|MCP| DB2[(DB MCP Server)]
    AI2 -->|MCP| FS2[File MCP Server]
  end
```

---

## 2. The Big Picture Architecture

MCP has **3 core players**:

```mermaid
graph TD
  subgraph HOST["🖥️ HOST (Your App — e.g. Claude Desktop, VS Code)"]
    C[MCP Client]
  end

  subgraph SERVERS["⚙️ MCP Servers"]
    S1[GitHub Server]
    S2[File System Server]
    S3[Database Server]
    S4[Web Search Server]
  end

  subgraph RESOURCES["📦 Actual Data / Tools"]
    R1[(GitHub API)]
    R2[/Local Files/]
    R3[(PostgreSQL)]
    R4[🌐 Internet]
  end

  C <-->|MCP Protocol| S1
  C <-->|MCP Protocol| S2
  C <-->|MCP Protocol| S3
  C <-->|MCP Protocol| S4

  S1 --> R1
  S2 --> R2
  S3 --> R3
  S4 --> R4
```

| Player | Who They Are | Analogy |
|---|---|---|
| **Host** | The app you're using (Claude Desktop, VS Code) | Your phone |
| **MCP Client** | Lives inside the host, speaks MCP | The App Store engine on your phone |
| **MCP Server** | A lightweight program exposing a tool/data source | An app you install |

---

## 3. What Can an MCP Server Offer?

Each MCP server can expose **3 types of capabilities**:

```mermaid
mindmap
  root((MCP Server))
    Tools
      Functions the AI can call
      e.g. create_file, send_email, run_query
      AI decides when to use them
    Resources
      Data the AI can read
      e.g. file contents, DB records, URLs
      Like read-only documents
    Prompts
      Pre-built prompt templates
      e.g. summarize_pr, explain_error
      Reusable instructions
```

---

## 4. How a Conversation Actually Works (Step-by-Step Flow)

Here's what happens when you ask Claude *"Create a file called hello.txt"*:

```mermaid
sequenceDiagram
  actor User
  participant Claude as 🤖 Claude (LLM)
  participant Client as MCP Client
  participant Server as 📁 File System MCP Server
  participant FS as Local File System

  User->>Claude: "Create a file called hello.txt"

  Note over Claude: Claude thinks: I need<br/>to use the filesystem tool

  Claude->>Client: I want to call tool: create_file<br/>args: {name: "hello.txt"}
  Client->>Server: tools/call → create_file({name:"hello.txt"})
  Server->>FS: Actually create the file
  FS-->>Server: ✅ File created
  Server-->>Client: Result: "File hello.txt created successfully"
  Client-->>Claude: Tool result received
  Claude-->>User: "Done! I've created hello.txt for you."
```

---

## 5. The MCP Handshake — How Client & Server Connect

When an MCP client first connects to a server, they do a **handshake** to discover capabilities:

```mermaid
sequenceDiagram
  participant Client as MCP Client
  participant Server as MCP Server

  Client->>Server: initialize request<br/>(I'm client v1.0, here are my capabilities)
  Server-->>Client: initialize response<br/>(I'm server v1.0, here are MY capabilities)
  Client->>Server: initialized ✅ (acknowledgement)

  Note over Client, Server: Connection is now established!

  Client->>Server: tools/list (what tools do you have?)
  Server-->>Client: [create_file, read_file, delete_file, ...]

  Client->>Server: resources/list (what data can I access?)
  Server-->>Client: [/home/user/docs, /home/user/projects, ...]

  Client->>Server: prompts/list (any prompt templates?)
  Server-->>Client: [summarize_file, explain_code, ...]
```

---

## 6. MCP Communication — The Transport Layer

MCP servers can communicate with clients over **2 transport types**:

```mermaid
graph TD
  T[Transport Methods] --> STDIO
  T --> SSE

  STDIO["📟 STDIO (Standard Input/Output)
  ─────────────────────────
  • Server runs as a local process
  • Client talks to it via stdin/stdout
  • Best for: local tools, file systems,
    desktop apps like Claude Desktop"]

  SSE["🌐 HTTP + SSE (Server-Sent Events)
  ─────────────────────────
  • Server runs as a web service
  • Client connects over HTTP
  • Best for: remote servers, cloud tools,
    shared team infrastructure"]
```

---

## 7. What Does an MCP Server Actually Look Like?

Here's a simplified mental model of an MCP server's code structure:

```mermaid
graph TD
  Entry["🚀 Server Entry Point
  (index.js / main.py)"] --> Init

  Init["⚙️ Initialize MCP Server
  • Set name & version
  • Register capabilities"] --> Handlers

  Handlers["📋 Register Handlers"] --> TH & RH & PH

  TH["🔧 Tool Handlers
  ─────────────
  tools/list → return list of tools
  tools/call → execute the tool
  ─────────────
  e.g. create_file(path, content)
       read_file(path)
       search_web(query)"]

  RH["📄 Resource Handlers
  ─────────────
  resources/list → list available data
  resources/read → fetch the data
  ─────────────
  e.g. file:///docs/readme.md
       db://customers/table"]

  PH["💬 Prompt Handlers
  ─────────────
  prompts/list → list templates
  prompts/get → return template
  ─────────────
  e.g. 'Summarize this code: {code}'
       'Fix this error: {error}'"]

  TH & RH & PH --> Transport

  Transport["📡 Connect Transport
  (STDIO or HTTP/SSE)
  Start listening for requests"]
```

---

## 8. A Real-World Example — Claude + GitHub MCP Server

```mermaid
sequenceDiagram
  actor Dev as 👨‍💻 Developer
  participant Claude as 🤖 Claude
  participant GHMC as GitHub MCP Server
  participant GH as GitHub API

  Dev->>Claude: "List my open PRs and summarize the biggest one"

  Claude->>GHMC: tools/call: list_pull_requests({state: "open"})
  GHMC->>GH: GET /repos/.../pulls?state=open
  GH-->>GHMC: [PR#42 (2300 lines), PR#38 (120 lines), ...]
  GHMC-->>Claude: [{id:42, title:"...", additions:2300}, ...]

  Claude->>GHMC: tools/call: get_pull_request({pr_number: 42})
  GHMC->>GH: GET /repos/.../pulls/42 (with diff)
  GH-->>GHMC: Full PR diff and description
  GHMC-->>Claude: {diff: "...", description: "..."}

  Claude-->>Dev: "You have 2 open PRs. The largest is PR#42
  'Refactor auth system' — it changes the login flow,
  adds JWT tokens, and removes the old session-based auth..."
```

---

## 9. MCP vs Traditional APIs — Key Differences

```mermaid
graph LR
  subgraph API["Traditional REST API"]
    D1[Developer] -->|hardcodes calls| API1[API]
    D1 -->|must know endpoints| API1
    D1 -->|writes glue code| API1
  end

  subgraph MCP["MCP Server"]
    AI[AI Model] -->|discovers tools dynamically| MS[MCP Server]
    AI -->|decides what to call| MS
    AI -->|no hardcoding needed| MS
  end
```

| Feature | REST API | MCP Server |
|---|---|---|
| Who decides what to call? | Developer (hardcoded) | AI Model (dynamic) |
| Discovery | Manual docs reading | Auto via `tools/list` |
| Context awareness | None | Full conversation context |
| Error handling | Manual | Built into protocol |
| AI-native? | ❌ | ✅ |

---

## 10. The Ecosystem Today

```mermaid
graph TD
  MCP["🌐 MCP Ecosystem"] --> Hosts & Servers

  Hosts["🖥️ MCP Hosts (Clients)"] --> H1 & H2 & H3 & H4
  H1["Claude Desktop"]
  H2["VS Code / Cursor / Zed"]
  H3["Claude API (programmatic)"]
  H4["Custom Apps"]

  Servers["⚙️ MCP Servers (Available)"] --> S1 & S2 & S3 & S4 & S5 & S6
  S1["📁 Filesystem"]
  S2["🐙 GitHub"]
  S3["🗄️ PostgreSQL / SQLite"]
  S4["🔍 Web Search (Brave, Tavily)"]
  S5["📬 Gmail / Google Drive"]
  S6["💬 Slack / Notion"]
```

---

## 11. Summary — MCP in One Diagram

```mermaid
flowchart TB
  U["👤 You"] -->|ask a question| LLM

  LLM["🤖 LLM (Claude, GPT, etc.)
  Understands your intent
  Decides which tools to use"] -->|MCP requests| CLIENT

  CLIENT["📡 MCP Client
  Speaks the MCP protocol
  Manages server connections"] <-->|JSON-RPC over STDIO/HTTP| SERVERS

  subgraph SERVERS["⚙️ MCP Servers"]
    FS["📁 Filesystem Server"]
    GH["🐙 GitHub Server"]
    DB["🗄️ Database Server"]
    WEB["🌐 Web Server"]
  end

  FS --> LocalFiles["Local Files"]
  GH --> GitHubAPI["GitHub API"]
  DB --> PostgreSQL["PostgreSQL"]
  WEB --> Internet["Internet"]

  SERVERS -->|results| CLIENT
  CLIENT -->|tool results| LLM
  LLM -->|final answer| U
```

---

## Key Takeaways 🎯

- **MCP = USB-C for AI** — one standard plug for all tools
- An **MCP Server** wraps a tool/data source and exposes it as **Tools**, **Resources**, or **Prompts**
- The **MCP Client** (inside your app) discovers and calls these servers on behalf of the AI
- Communication uses **JSON-RPC 2.0** messages over **STDIO** (local) or **HTTP+SSE** (remote)
- The AI **dynamically decides** what to call — no hardcoding needed

> MCP was open-sourced by Anthropic in November 2024 and is now a rapidly growing standard adopted by Microsoft, Google, and hundreds of community contributors.
