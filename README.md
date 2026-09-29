#  AgentGuard

### Memory-Powered Supervision for AI Agents

AgentGuard is an AI agent supervision platform designed to make AI agents **safer, more reliable, and capable of learning from their past mistakes**.

Instead of allowing an AI agent to respond independently every time, AgentGuard introduces a **Supervisor Agent + Long-Term Memory** layer that reviews the agent's decisions, learns from human corrections, and detects similar failures in future interactions.

---

##  The Problem

AI agents can generate incorrect or unsafe responses, even when they have previously made similar mistakes.

For example:

> A customer asks for a refund after 45 days.

The support agent incorrectly approves the refund.

A human reviewer corrects it:

> "The standard refund window is 30 days."

Traditional systems may correct that single response, but they don't necessarily use the correction to prevent the same mistake later.

AgentGuard turns that correction into a **reusable memory**.

Later, if another customer asks for a refund after 40 days, the system can retrieve the previous experience and warn the Supervisor Agent before the response is sent.

---

##  How AgentGuard Works

```text
Customer Request
       ↓
   Worker Agent
       ↓
Policy Retrieval + Memory Retrieval
       ↓
 Supervisor Agent
       ↓
 ┌───────────────────────┐
 │ SAFE                  │
 │ REVIEW REQUIRED       │
 │ PREVIOUS FAILURE      │
 └───────────────────────┘
       ↓
 Human Review
       ↓
 Final Response
       ↓
 Store Experience
       ↓
 Future Similar Requests
       ↓
 Prevent Repeated Mistakes
```

### Learning Loop

```text
Observe
   ↓
Correct
   ↓
Remember
   ↓
Retrieve
   ↓
Prevent
```

---

##  Main Components

### 1. Worker Agent

The Worker Agent handles customer-support requests.

It can process different types of requests such as:

* Refunds
* Returns
* Cancellations
* Shipping
* Damaged products
* Wrong products
* Missing packages
* Duplicate payments
* Warranty questions
* Account-related issues

The system is designed to handle **arbitrary customer-support messages**, rather than relying only on predefined demo questions.

---

### 2. Supervisor Agent

The Supervisor Agent independently reviews the Worker Agent's response.

It checks for:

* Policy violations
* Incorrect information
* Missing information
* High-risk situations
* Contradictions
* Similar previous failures
* Previous human corrections
* Confidence and uncertainty

The supervisor produces a structured decision such as:

```json
{
  "status": "REVIEW_REQUIRED",
  "risk_level": "MEDIUM",
  "policy_issues": [],
  "memory_matches": [],
  "reason": "A similar previous interaction required human correction.",
  "recommended_action": "Review response",
  "confidence": 0.91
}
```

---

##  Long-Term Memory

The key feature of AgentGuard is its ability to remember meaningful experiences.

The system stores information such as:

* Customer situation
* Agent response
* What went wrong
* Human correction
* Correct action
* Outcome
* Severity
* Related policy
* Timestamp

Memory retrieval is based on **semantic/contextual similarity**, rather than simply matching the exact same sentence.

This allows the system to recognize that:

> "Can I get my money back after 40 days?"

is related to:

> "Customer requested a refund after 45 days."

even though the wording is different.

---

##  Human-in-the-Loop Learning

Humans can review the AI's response and either:

###  Approve

The response is accepted.

###  Correct

The reviewer can provide:

* What was wrong?
* What should the agent have done?
* Correct response

The correction is then converted into a structured experience and stored in memory.

This allows future interactions to benefit from previous human feedback.

---

##  Example

### First Interaction

**Customer:**

> "I want a refund for my order from 45 days ago."

**Worker Agent:**

> "Sure, your refund can be processed."

**Supervisor:**

>  Previous policy issue detected.

**Human:**

> "Standard refunds are allowed only within 30 days."

The correction is stored in memory.

---

### Future Interaction

**Customer:**

> "Can I get a refund for an order from 40 days ago?"

The wording is different, but the situation is semantically similar.

AgentGuard retrieves the previous experience.

```text
Similar Previous Failure Detected
            ↓
Refund request beyond 30-day window
            ↓
Supervisor Warning
            ↓
Worker revises response
            ↓
Safer final response
```

This demonstrates the core concept:

> **The agent doesn't just answer — it learns from experience.**

---

##  Architecture

```text
                 ┌─────────────────┐
                 │     Customer    │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │   Worker Agent  │
                 └────────┬────────┘
                          ↓
              ┌───────────────────────┐
              │ Policy + Memory       │
              │ Retrieval             │
              └───────────┬───────────┘
                          ↓
                 ┌─────────────────┐
                 │ Supervisor Agent│
                 └────────┬────────┘
                          ↓
             ┌────────────────────────┐
             │ Safe / Review Required │
             └───────────┬────────────┘
                         ↓
                  Human Review
                         ↓
                  Final Response
                         ↓
                Experience Memory
                         ↓
              Future Interactions
```

---

##  Dashboard

AgentGuard provides visibility into the behavior of the AI system.

The dashboard can track metrics such as:

* Total interactions
* Supervisor reviews
* Safe responses
* Review-required responses
* Previous failure detections
* Human corrections
* Memories stored
* Repeated mistakes prevented

---

## Memory Explorer

The Memory Explorer allows users to inspect what the system has learned.

Users can:

* Search memories
* Filter by category
* Filter by severity
* View previous failures
* View human corrections
* Inspect the correct action
* Review related experiences

---

##  Supervisor Alerts

Important events can be surfaced as alerts, including:

* Previous failure detected
* High-risk response
* Policy violation
* Human correction required
* Low-confidence response

---

##  Learning Effect

AgentGuard visualizes the learning process:

```text
Agent Mistake
      ↓
Human Correction
      ↓
Memory Created
      ↓
Similar Future Case
      ↓
Memory Retrieved
      ↓
Supervisor Detects Risk
      ↓
Mistake Prevented
```

---

##  Evaluation

AgentGuard includes evaluation scenarios covering different customer-support situations.

Examples include:

* Refund requests
* Return requests
* Shipping questions
* Cancellation requests
* Damaged products
* Duplicate payments
* Warranty questions
* Missing information
* Previously seen failure patterns
* Unseen support requests

The evaluation system reports actual results from the running application rather than displaying predetermined demo results.

---

##  Technology Stack

Depending on the configured environment, AgentGuard uses:

* **Frontend:** React + TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Node.js / TypeScript or Python / FastAPI
* **Database:** Persistent database
* **LLM:** Configurable LLM provider
* **Memory:** Hindsight-compatible memory with local fallback
* **API:** REST APIs
* **Deployment:** Configurable for cloud/local environments

---

##  Project Structure

```text
agentguard-ai/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── backend/
│   ├── agents/
│   │   ├── worker/
│   │   └── supervisor/
│   ├── memory/
│   ├── policies/
│   ├── evaluation/
│   └── ...
│
├── tests/
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

> The exact structure may vary depending on the implementation.

---

##  Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/agentguard-ai.git
cd agentguard-ai
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Add the required configuration values to `.env`.

---

##  Environment Variables

Example:

```env
LLM_API_KEY=
LLM_MODEL=

HINDSIGHT_API_KEY=
HINDSIGHT_BASE_URL=

DATABASE_URL=
```

Do **not** commit `.env` or real API keys to GitHub.

Use `.env.example` for sharing the required variable names.

---

## ▶️ Running the Application

Start the development server:

```bash
npm run dev
```

Then open the local URL shown by the development server.

---

## Memory Modes

### Hindsight Mode

When Hindsight configuration is available, AgentGuard can use the external memory system for persistent experience retrieval.

### Fallback Mode

If Hindsight credentials are unavailable, AgentGuard can use its local persistent memory implementation.

The application clearly indicates which memory mode is currently active.

This allows the project to remain usable during development, testing, and demonstrations.

---

##  API

Example endpoints include:

```text
POST /api/agent/run
POST /api/supervisor/review
POST /api/feedback

GET  /api/memory
GET  /api/memory/:id

GET  /api/alerts
GET  /api/metrics
GET  /api/policies
GET  /api/health

POST /api/evaluation/run
```

---

##  Security

AgentGuard follows basic security practices:

* API keys stored in environment variables
* Secrets excluded from Git
* Server-side API calls
* Input validation
* Safe JSON parsing
* Error handling
* No exposure of private chain-of-thought
* Synthetic customer data for demonstrations

---

##  Project Goal

AgentGuard explores a simple but important idea:

> **What if AI agents could learn from their mistakes without repeating them?**

Rather than treating every interaction as an isolated event, AgentGuard gives AI agents a layer of **supervision, memory, and human-guided learning**.

The goal is to make AI-agent systems more:

**Reliable • Explainable • Adaptive • Safe**

---

##  Future Improvements

Possible future extensions include:

* Multi-agent supervision
* More advanced policy engines
* Cross-domain memory
* Automated memory importance scoring
* Memory decay and consolidation
* Agent performance analytics
* Role-based human review
* Multi-tenant support
* Additional enterprise workflows
* Continuous evaluation and regression testing

---

##  Project

**AgentGuard**

**Memory-Powered Supervision for AI Agents**

Built as an AI-agent experimentation and hackathon project.
