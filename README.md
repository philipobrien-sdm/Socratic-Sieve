# Socratic Sieve v3 ✦ Epistemic Cartography Workspace

Socratic Sieve v3 is an interactive **Epistemic Cartography Workspace** designed to map the logical structure of Knowledge formation, track conceptual lineages, analyze observation dependencies, and visualize irreducible dialectical disagreements.

Rather than acting merely as a multi-agent debate simulator, **Socratic Sieve v3** shifts the focus from persuasive dialogue to rigorous conceptual mapping. The conversation is treated as the excavation mechanism, and the final interactive map—an **Epistemic Atlas**—is the primary artifact. The application helps users answer not *"Who is right?"*, but rather: **"What would have to be true for this position to be correct?"**

---

## 🧭 Core Philosophy & Key Pillars

Socratic Sieve v3 operates on five core architectural mandates that transform philosophical debate into structured, verifiable knowledge maps:

### 1. No Concept Without Provenance
Every concept introduced into discourse carries permanent provenance. Concepts originate from one of four sources:
* **User-supplied**: Provided directly in the initial topic prompt.
* **Emergent**: Discovered organically during dialogue iterations.
* **Operational proxy**: Extracted to serve as a measurable stand-in for complex constructs.
* **Normative abstraction**: Prescriptive rules or moral parameters.

Users can trace any concept back to the exact round, agent, and parental concepts from which it was derived.

### 2. Concepts Are Not Observations (Construct Audit)
To prevent theoretical ideas from masquerading as measured physical variables, the workspace enforces a strict taxonomy:
* **Direct Observation**: Directly, independently verifiable data (e.g., photo count, retention duration).
* **Composite Observable**: Derived and calculated from multiple observations (e.g., social cohesion indexes).
* **Latent Construct**: A theoretical model inferred from observations (e.g., future autonomy loss).
* **Pure Theoretical Construct**: High-level explanatory frameworks (e.g., human dignity, authenticity).

The user interface explicitly distinguishes these categories visually to prevent category errors.

### 3. Concept Lifecycles
Concepts are never merely "accepted." They follow a rigorous, state-controlled lifecycle:
```
Introduced  ──>  Tentative  ──>  Operational Candidate  ──>  Operationalised  ──>  Established Construct
                                                                                  │
                                                                                  └──>  Split / Merged / Collapsed / Deprecated
```
* **Promotion to Established**: Requires that multiple agents independently converge on its usefulness, it survives at least two direct Socratic attacks, and observers accept its definition despite disagreeing on implications.
* **Collapse Rules**: Occurs when no operational definition survives, redundancy is detected, or the concept is revealed to be purely rhetorical.

### 4. claim Dependency Graph (DAG Topology)
Claims do not exist as flat lists; they are connected as a **Directed Acyclic Graph (DAG)**. Every assertion answers: *“What assumptions must already hold before this claim becomes meaningful?”*
The workspace dynamically isolates **Root Assumptions**—the foundational axioms from which multiple downstream disagreements emerge—and allows users to collapse discussions onto these critical nodes.

### 5. Epistemic Inspector v2 & Disagreement Taxonomy
An active, real-time inspection engine that evaluates every concept on multiple independent dimensions:
* **Taxonomy of Disagreement**: Classifies clashes as *Definition, Measurement, Causal Linkage, Value Alignment, Ontological Basis,* or *Meta-epistemic*.
* **Five-Dimensional Stability**: Tracks maturity across independent axes:
  1. *Definition Completeness* (shared definitions)
  2. *Operational Completeness* (measurability)
  3. *Observer Consensus* (observational alignment)
  4. *Dependency Robustness* (logical foundation stability)
  5. *Epistemic Maturity* (disagreement localization)

---

## 🎨 Core Design & Visual Concept

Socratic Sieve v3 features a dark, immersive **Cosmic Slate Theme** structured for deep intellectual and analytical focus:
* **Interactive Atlas DAG Map**: A responsive canvas mapping the logical dependency graph. Clicking any node illuminates its analytical parentage (Preconditions) and downstream impact (Consequences).
* **Construct Audit Matrix**: A dedicated audit deck displaying the operational status, categories, and observation-to-theory requirements for all active concepts.
* **Duality Friction Panel**: Displays irreducible dialectical tension, pairing divergent observer interpretations (Observer A vs. Observer B) side-by-side.
* **Concept Lineage Timeline**: Replays the genealogy of ideas, categorizing concepts as *Original, Generated, Adopted,* or *Discarded* to track genuine conceptual discovery.

---

## 🧠 Specialized Multi-Agent Roles

Socratic Sieve v3 coordinates a suite of highly specialized agents to build and verify the epistemic map, explicitly focused on uncovering core philosophical and moral dimensions while avoiding over-operationalization rabbit holes:

### 1. Socrates v3 (The Socratic Eliminator)
Socrates acts as an eliminative refuter. Rather than introducing technical objections or endless detail, Socrates guides the dialogue into high-level philosophical, conceptual, and moral/ethical core tensions. Within a maximum of 5 rounds, Socrates drives the participants to reveal deep-seated moral contradictions and boundary conditions.

### 2. Epistemic Cartographer (Dedicated Mapper)
An agent with no stance in the debate. Its sole responsibility is to map: identifying root assumptions, discovering hidden dependency chains, detecting conceptual convergence or divergence, and recommending unexplored intellectual branches.

### 3. Model Builder
A balanced explorer who focuses on what is simple and easy to investigate. Rather than getting lost in endless technical operational details or dense constructs, the Model Builder outlines simple observable starting points and quickly pivots back to help the group explore broader philosophical and moral implications.

### 4. Normative Auditor
Isolates implicit value judgments, moral biases, or prescriptive weights hiding inside seemingly descriptive, empirical claims, urging participants to discuss underlying moral and ethical values directly.

### 5. Synthesis Engine v2 (The Epistemic Atlas)
Replaces passive summaries with a comprehensive **Epistemic Atlas** report. This report details concept evolution timelines, root assumptions, stable observations, contested constructs, value assumptions, outstanding empirical questions, and promoted or collapsed constructs.

---

## 🎛️ Discussion Complexity & Local LLM Optimization

To facilitate seamless offline operations and support varying compute resource footprints (specifically local LLMs running via **Ollama** or **LM Studio**), Socratic Sieve v3 introduces a dynamic **Discussion Complexity Control**:

* **Dynamically Constrained Contexts**: The slider scales prompt vocabulary constraints and generation targets, matching response lengths to LLM capacity.
* **Token Hard-Limits**: Integrates token restrictions (`max_tokens`) directly into the local LLM fetch requests to prevent generation runaway and minimize GPU/CPU utilization spikes.
* **Complexity Profiles**:
  1. **Level 1 (Minimal)**: Ultra-short, rapid responses (under 60 words). Optimized for low-end local hardware running 1B-3B parameter models.
  2. **Level 2 (Concise)**: Fast, compact responses (80-120 words) for 3B-7B parameter models.
  3. **Level 3 (Standard)**: The recommended baseline (100-180 words) for well-balanced reasoning depth and token efficiency.
  4. **Level 4 (Comprehensive)**: Extended arguments (180-300 words) suited for robust 8B-14B local models or Gemini.
  5. **Level 5 (Exhaustive)**: Academic-density, maximum elaboration responses (300-500 words) for high-end local setups (30B+) or cloud engines.

---

## ⚙️ Architecture & Technical Stack

The workspace is a robust full-stack container application designed for rapid development and containerized deployment:
* **Frontend**: React 18+ with **Vite**, styled with utility-first **Tailwind CSS**, and utilizing **Motion** for fluid DAG state transitions.
* **Backend**: **Express** web server (configured on the mandatory port `3000`).
* **AI Orchestration**: Server-side integrations using the official `@google/genai` TypeScript SDK (leveraging Gemini 2.5 Flash and Gemini 1.5 Pro).
* **Build pipeline**: Direct TS execution using `tsx` in development, compiled to a bundled CommonJS node file (`dist/server.cjs`) using `esbuild` for deployment.

---

## 🚀 Local Setup & Installation

Ensure you have [Node.js](https://nodejs.org/) (v18.x or higher) and [npm](https://www.npmjs.com/) installed.

### 1. Clone & Navigate
```bash
cd socratic-sieve
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY="your_google_gemini_api_key"
APP_URL="http://localhost:3000"
```

### 4. Run Development Workspace
```bash
npm run dev
```
Navigate to **`http://localhost:3000`** in your browser to explore the epistemic atlas.

### 5. Build for Production
To bundle and optimize:
```bash
npm run build
npm run start
```

---

## 📄 License
This project is private and proprietary. All rights reserved.
