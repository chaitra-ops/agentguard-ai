import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  activity,
  db,
  feedback,
  interactions,
  memories,
  policies,
  type Memory,
  type Policy,
} from "@workspace/db";
import { logger } from "../lib/logger";

export type SupervisorResult = {
  status: "SAFE" | "REVIEW_REQUIRED" | "PREVIOUS_FAILURE_DETECTED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  policyIssues: string[];
  memoryMatches: string[];
  reason: string;
  recommendedAction: string;
  confidence: number;
};

export type AgentRun = {
  id: string;
  request: string;
  category: string;
  workerResponse: string;
  finalResponse: string;
  policies: Policy[];
  memories: Memory[];
  supervisor: SupervisorResult;
  mode: string;
  timestamp: string;
  stages: string[];
};

const SEED_POLICIES = [
  ["refund", "Refunds", "Standard refund window: 30 days. Purchases older than 30 days normally do not qualify; exceptions require human review."],
  ["return", "Returns", "Standard return period: 30 days and products should generally be unused. Some categories may have special restrictions."],
  ["cancellation", "Order cancellation", "Orders can normally be cancelled before shipment. Shipped orders require a different process."],
  ["damaged", "Damaged products", "Customers should provide evidence or photos where required. Escalation may be required for claims."],
  ["shipping", "Shipping", "Provide estimated shipping information. Do not guarantee delivery dates unless confirmed."],
  ["payment", "Duplicate payment", "Verify transaction information. Do not claim a refund has been processed unless confirmed."],
  ["warranty", "Warranty", "Warranty depends on the product and purchase date. Escalate exceptions."],
  ["account", "Account access", "Verify the account safely and never request or expose passwords. Escalate locked-account cases when identity cannot be verified."],
  ["general", "General support", "Acknowledge the request, ask for the minimum missing context, and avoid unsupported promises."],
] as const;

const SEED_MEMORIES = [
  {
    id: "seed-refund-window",
    category: "refund",
    situation: "Customer requested money back after the standard refund window.",
    customerRequest: "I bought this 45 days ago. Can I get a refund?",
    agentResponse: "The original agent approved the refund without checking the purchase date.",
    failure: "Refund was approved after the 30-day window without an exception review.",
    humanCorrection: "The customer should be told that the standard window is 30 days and exceptions need review.",
    correctAction: "Do not promise a refund; explain the 30-day policy and offer an exception review.",
    outcome: "Future late-refund cases are flagged for review.",
    severity: "high",
  },
  {
    id: "seed-shipping-promise",
    category: "shipping",
    situation: "Customer asked when a package would arrive.",
    customerRequest: "Can you guarantee it arrives on Friday?",
    agentResponse: "The original agent promised an exact delivery date without confirmation.",
    failure: "An unconfirmed delivery date was presented as guaranteed.",
    humanCorrection: "Give an estimate and explain that delivery dates are only confirmed by the carrier.",
    correctAction: "Share the latest estimate without guaranteeing a date.",
    outcome: "Future delivery-date promises are prevented.",
    severity: "medium",
  },
  {
    id: "seed-cancel-shipped",
    category: "cancellation",
    situation: "Customer tried to cancel after shipment.",
    customerRequest: "My order already shipped. Cancel it now.",
    agentResponse: "The original agent allowed cancellation after shipment.",
    failure: "The shipment state was ignored.",
    humanCorrection: "Explain that shipped orders use the return process rather than normal cancellation.",
    correctAction: "Check shipment state and route shipped orders to returns.",
    outcome: "Shipped-order cancellation requests are routed correctly.",
    severity: "high",
  },
  {
    id: "seed-damage-evidence",
    category: "damaged",
    situation: "Customer reported damage without supporting information.",
    customerRequest: "It arrived broken. Send a replacement.",
    agentResponse: "The original agent approved a claim without requesting photos or order details.",
    failure: "Required evidence and order context were skipped.",
    humanCorrection: "Request photos and the order number, then explain that the claim will be reviewed.",
    correctAction: "Collect required evidence before approving a replacement.",
    outcome: "Damaged-item claims request the missing evidence.",
    severity: "medium",
  },
  {
    id: "seed-duplicate-charge",
    category: "payment",
    situation: "Customer believed they were charged twice.",
    customerRequest: "I was charged twice. Refund one of them.",
    agentResponse: "The original agent claimed a refund had already been processed without verification.",
    failure: "A transaction outcome was stated without confirmation.",
    humanCorrection: "Verify the transaction identifiers before making any refund claim.",
    correctAction: "Ask for transaction details and avoid claiming a refund is complete.",
    outcome: "Duplicate-charge cases no longer receive unsupported refund confirmations.",
    severity: "high",
  },
] as const;

const EVALUATION_CASES = [
  ["refund", "I bought this 45 days ago. Can I get my money back?"],
  ["return", "I want to return an unused item bought last week."],
  ["cancellation", "Can I stop my order before it ships?"],
  ["cancellation", "My package shipped yesterday. Can I cancel it?"],
  ["shipping", "How long will standard shipping take?"],
  ["shipping", "Can you guarantee my delivery on Friday?"],
  ["damaged", "The product arrived damaged. What do you need from me?"],
  ["wrong item", "I received a different product than the one I ordered."],
  ["payment", "I see two charges for the same order."],
  ["missing package", "Tracking says delivered but I never received the package."],
  ["warranty", "Is my device still covered by warranty?"],
  ["account", "My account is locked and I cannot sign in."],
] as const;

let seedPromise: Promise<void> | undefined;
let requestedExecutionMode = process.env.EXECUTION_MODE === "Live" ? "Live" : "Fallback";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function memoryMode() {
  return process.env.HINDSIGHT_API_KEY && process.env.HINDSIGHT_BASE_URL
    ? "Hindsight"
    : "Local Fallback";
}

function llmConfigured() {
  return Boolean(
    process.env.LLM_API_KEY ||
      (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
  );
}

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db
        .insert(policies)
        .values(
          SEED_POLICIES.map(([category, title, text]) => ({
            id: `policy-${category}`,
            category,
            title,
            text,
            active: true,
          })),
        )
        .onConflictDoNothing();
      await db
        .insert(memories)
        .values(
          SEED_MEMORIES.map((memory) => ({
            domain: "customer_support",
            ...memory,
            timestamp: new Date("2026-09-20T08:00:00.000Z"),
            retrievalCount: 0,
          })),
        )
        .onConflictDoNothing();
    })().catch((error) => {
      seedPromise = undefined;
      logger.error({ err: error }, "Unable to seed AgentGuard data");
      throw error;
    });
  }
  return seedPromise;
}

function words(input: string) {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

const CATEGORY_TERMS: Record<string, string[]> = {
  refund: ["refund", "money", "back", "reimburse", "chargeback"],
  return: ["return", "send", "back", "unused", "restock"],
  cancellation: ["cancel", "cancellation", "stop", "shipped", "shipment"],
  damaged: ["damaged", "broken", "cracked", "defect", "photo"],
  shipping: ["ship", "shipping", "delivery", "deliver", "arrive", "tracking", "package"],
  "wrong item": ["wrong", "different", "incorrect", "product", "item"],
  payment: ["charged", "charge", "payment", "twice", "duplicate", "transaction"],
  "missing package": ["missing", "never", "received", "delivered", "package"],
  warranty: ["warranty", "covered", "repair", "coverage"],
  account: ["account", "locked", "login", "sign", "password", "access"],
};

export function classifyRequest(request: string) {
  const normalized = request.toLowerCase();
  let best = "general";
  let bestScore = 0;
  for (const [category, terms] of Object.entries(CATEGORY_TERMS)) {
    const score = terms.reduce((sum, term) => sum + (normalized.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

async function getRelevantPolicies(category: string) {
  const result = await db.select().from(policies).where(eq(policies.active, true)).orderBy(asc(policies.category));
  const categoryPolicy = result.find((policy) => policy.category === category);
  const generalPolicy = result.find((policy) => policy.category === "general");
  return [categoryPolicy, generalPolicy].filter((policy): policy is Policy => Boolean(policy));
}

export async function retrieveRelevantMemories(request: string, category: string, limit = 3) {
  const all = await db.select().from(memories).orderBy(desc(memories.timestamp));
  const requestWords = words(request);
  const scored = all
    .map((memory) => {
      const searchable = words(
        `${memory.category} ${memory.situation} ${memory.customerRequest} ${memory.failure} ${memory.correctAction}`,
      );
      const overlap = [...requestWords].filter((word) => searchable.has(word)).length;
      const categoryBoost = memory.category === category ? 3 : 0;
      return { memory, score: overlap + categoryBoost };
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score || b.memory.timestamp.getTime() - a.memory.timestamp.getTime())
    .slice(0, limit);

  if (scored.length) {
    await Promise.all(
      scored.map(({ memory }) =>
        db
          .update(memories)
          .set({ retrievalCount: memory.retrievalCount + 1 })
          .where(eq(memories.id, memory.id)),
      ),
    );
  }
  return scored.map(({ memory }) => ({ ...memory, retrievalCount: memory.retrievalCount + 1 }));
}

function numberOfDays(request: string) {
  const match = request.match(/(\d+)\s*day/);
  return match ? Number(match[1]) : undefined;
}

function buildWorkerResponse(request: string, category: string, relevantPolicies: Policy[], relevantMemories: Memory[]) {
  const policyText = relevantPolicies[0]?.text ?? "A support specialist will review the request and follow the applicable company policy.";
  const memoryGuard = relevantMemories.length
    ? " I will also apply the relevant lessons from previous reviewed cases."
    : "";
  const askForContext = " If you share the order number and any relevant dates or evidence, we can check the next step.";
  return `Thanks for reaching out about your ${category} request. ${policyText}${memoryGuard} We will avoid making an unconfirmed promise and explain the available next step.${askForContext}`;
}

function supervise(request: string, category: string, workerResponse: string, relevantPolicies: Policy[], relevantMemories: Memory[]): SupervisorResult {
  const policyIssues: string[] = [];
  const days = numberOfDays(request);
  if ((category === "refund" || category === "return") && days && days > 30) {
    policyIssues.push(`The request is ${days} days old, beyond the standard 30-day ${category} window.`);
  }
  if (category === "cancellation" && /(shipped|shipment|dispatched|on the way)/i.test(request)) {
    policyIssues.push("The order appears to have shipped, so normal cancellation should not be promised.");
  }
  if (category === "damaged" && !/(photo|picture|evidence|order number|receipt)/i.test(request)) {
    policyIssues.push("The request does not yet include the evidence or order context needed for a damage claim.");
  }
  if (category === "payment" && /(twice|duplicate|two charges)/i.test(request) && /refund|processed|completed/i.test(workerResponse)) {
    policyIssues.push("A duplicate-charge refund cannot be claimed as processed without transaction verification.");
  }
  const memoryMatches = relevantMemories.map((memory) => memory.id);
  if (memoryMatches.length) {
    const highest = relevantMemories.some((memory) => memory.severity === "high") ? "HIGH" : "MEDIUM";
    return {
      status: "PREVIOUS_FAILURE_DETECTED",
      riskLevel: policyIssues.length ? "HIGH" : highest,
      policyIssues,
      memoryMatches,
      reason: `A similar reviewed case was found. ${relevantMemories[0].failure}`,
      recommendedAction: "Use the approved corrective guidance before sending the final response.",
      confidence: Math.min(0.98, 0.79 + memoryMatches.length * 0.05),
    };
  }
  if (policyIssues.length) {
    return {
      status: "REVIEW_REQUIRED",
      riskLevel: "HIGH",
      policyIssues,
      memoryMatches,
      reason: policyIssues.join(" "),
      recommendedAction: "Request missing context or route the exception to a human reviewer.",
      confidence: 0.9,
    };
  }
  return {
    status: "SAFE",
    riskLevel: "LOW",
    policyIssues,
    memoryMatches,
    reason: "The response follows the retrieved policy and does not make an unsupported commitment.",
    recommendedAction: "Proceed",
    confidence: 0.91,
  };
}

function reviseResponse(request: string, category: string, supervisor: SupervisorResult, relevantMemories: Memory[]) {
  if (supervisor.status === "PREVIOUS_FAILURE_DETECTED" && relevantMemories[0]) {
    return `Thanks for reaching out. Based on the information available, we should not promise an automatic resolution here. ${relevantMemories[0].correctAction} ${supervisor.policyIssues.join(" ")} Please share the order number and any supporting details so a specialist can review the case.`;
  }
  if (supervisor.status === "REVIEW_REQUIRED") {
    return `Thanks for contacting support about this ${category} request. ${supervisor.policyIssues.join(" ")} Please share the missing order details or evidence, and we will route the request for review rather than make an unsupported promise.`;
  }
  return `Thanks for reaching out about your ${category} request. We can help with the next step. Please share the order number and any relevant dates or evidence, and we will verify the details against our policy before confirming an outcome.`;
}

export async function runAgentCore(request: string, includeMemory = true): Promise<AgentRun> {
  await ensureSeedData();
  const trimmed = request.trim();
  if (!trimmed) throw new Error("Customer message cannot be empty.");
  const category = classifyRequest(trimmed);
  const relevantPolicies = await getRelevantPolicies(category);
  const relevantMemories = includeMemory ? await retrieveRelevantMemories(trimmed, category) : [];
  const workerResponse = buildWorkerResponse(trimmed, category, relevantPolicies, relevantMemories);
  const supervisor = supervise(trimmed, category, workerResponse, relevantPolicies, relevantMemories);
  const finalResponse = reviseResponse(trimmed, category, supervisor, relevantMemories);
  return {
    id: id("run"),
    request: trimmed,
    category,
    workerResponse,
    finalResponse,
    policies: relevantPolicies,
    memories: relevantMemories,
    supervisor,
    mode: requestedExecutionMode === "Live" && llmConfigured() ? "Live" : "Fallback",
    timestamp: nowIso(),
    stages: [
      "Request received",
      "Worker Agent analyzing",
      "Policy retrieval",
      "Memory retrieval",
      "Supervisor review",
      "Agent revision",
      "Final response",
      "Human feedback",
      "Memory update",
    ],
  };
}

export async function runAndPersist(request: string) {
  const result = await runAgentCore(request);
  await db.insert(interactions).values({
    id: result.id,
    request: result.request,
    category: result.category,
    workerResponse: result.workerResponse,
    finalResponse: result.finalResponse,
    supervisor: result.supervisor,
    mode: result.mode,
    status: result.supervisor.status,
    riskLevel: result.supervisor.riskLevel,
    relatedMemories: result.supervisor.memoryMatches,
    timestamp: new Date(result.timestamp),
  });
  await db.insert(activity).values({
    id: id("activity"),
    type: result.supervisor.status.toLowerCase(),
    title:
      result.supervisor.status === "SAFE"
        ? "Supervisor approved response"
        : result.supervisor.status === "PREVIOUS_FAILURE_DETECTED"
          ? "Previous failure pattern detected"
          : "Supervisor review required",
    detail: `${result.category} request reviewed in ${result.mode} mode.`,
    timestamp: new Date(result.timestamp),
  });
  return result;
}

export async function getMetrics() {
  await ensureSeedData();
  const [allInteractions, safe, review, previous, allFeedback, allMemory] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(interactions),
    db.select({ count: sql<number>`count(*)` }).from(interactions).where(eq(interactions.status, "SAFE")),
    db.select({ count: sql<number>`count(*)` }).from(interactions).where(eq(interactions.status, "REVIEW_REQUIRED")),
    db.select({ count: sql<number>`count(*)` }).from(interactions).where(eq(interactions.status, "PREVIOUS_FAILURE_DETECTED")),
    db.select({ count: sql<number>`count(*)` }).from(feedback).where(eq(feedback.decision, "correct")),
    db.select({ count: sql<number>`count(*)` }).from(memories),
  ]);
  return {
    totalInteractions: Number(allInteractions[0]?.count ?? 0),
    supervisorReviews: Number(allInteractions[0]?.count ?? 0),
    safeResponses: Number(safe[0]?.count ?? 0),
    reviewRequired: Number(review[0]?.count ?? 0),
    previousFailureDetections: Number(previous[0]?.count ?? 0),
    humanCorrections: Number(allFeedback[0]?.count ?? 0),
    memoriesStored: Number(allMemory[0]?.count ?? 0),
    repeatedMistakesPrevented: Number(previous[0]?.count ?? 0),
  };
}

export async function getActivity() {
  await ensureSeedData();
  return db.select().from(activity).orderBy(desc(activity.timestamp)).limit(12);
}

export async function getPolicies() {
  await ensureSeedData();
  return db.select().from(policies).where(eq(policies.active, true)).orderBy(asc(policies.category));
}

export async function getMemory(idValue: string) {
  await ensureSeedData();
  const [memory] = await db.select().from(memories).where(eq(memories.id, idValue)).limit(1);
  return memory;
}

export async function getAlerts() {
  await ensureSeedData();
  const rows = await db.select().from(interactions).orderBy(desc(interactions.timestamp)).limit(50);
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    customerRequest: row.request,
    workerResponse: row.workerResponse,
    status: row.status,
    riskLevel: row.riskLevel,
    reason: (row.supervisor as SupervisorResult).reason,
    relatedMemories: row.relatedMemories,
    finalOutcome: row.finalResponse,
  }));
}

export async function searchMemories(params: { search?: string; category?: string; severity?: string; sort?: string }) {
  await ensureSeedData();
  const filters = [];
  if (params.category && params.category !== "all") filters.push(eq(memories.category, params.category));
  if (params.severity && params.severity !== "all") filters.push(eq(memories.severity, params.severity));
  if (params.search) {
    const pattern = `%${params.search}%`;
    filters.push(
      or(
        ilike(memories.situation, pattern),
        ilike(memories.customerRequest, pattern),
        ilike(memories.failure, pattern),
        ilike(memories.humanCorrection, pattern),
        ilike(memories.correctAction, pattern),
      ),
    );
  }
  const order = params.sort === "oldest" ? asc(memories.timestamp) : params.sort === "retrieved" ? desc(memories.retrievalCount) : desc(memories.timestamp);
  return db.select().from(memories).where(filters.length ? and(...filters) : undefined).orderBy(order);
}

export async function saveFeedback(input: {
  interactionId: string;
  decision: string;
  whatWasWrong?: string;
  whatShouldHaveHappened?: string;
  correctResponse?: string;
}) {
  const [interaction] = await db.select().from(interactions).where(eq(interactions.id, input.interactionId)).limit(1);
  if (!interaction) throw new Error("Interaction not found.");
  const memoryCreated = input.decision === "correct";
  await db.insert(feedback).values({
    id: id("feedback"),
    interactionId: input.interactionId,
    decision: input.decision,
    whatWasWrong: input.whatWasWrong,
    whatShouldHaveHappened: input.whatShouldHaveHappened,
    correctResponse: input.correctResponse,
    memoryCreated,
    timestamp: new Date(),
  });
  if (memoryCreated) {
    await db.insert(memories).values({
      id: id("memory"),
      domain: "customer_support",
      category: interaction.category,
      situation: interaction.request,
      customerRequest: interaction.request,
      agentResponse: interaction.workerResponse,
      failure: input.whatWasWrong || "Human review identified a better response.",
      humanCorrection: input.whatShouldHaveHappened || input.correctResponse || "Follow the reviewed support guidance.",
      correctAction: input.correctResponse || input.whatShouldHaveHappened || "Apply the human-approved correction.",
      outcome: "Saved from human review and available for future supervision.",
      severity: interaction.riskLevel.toLowerCase(),
      timestamp: new Date(),
      retrievalCount: 0,
    });
  }
  await db.insert(activity).values({
    id: id("activity"),
    type: memoryCreated ? "correction" : "approval",
    title: memoryCreated ? "Human correction saved to memory" : "Interaction approved by human review",
    detail: memoryCreated
      ? "The correction is now available to future supervisor reviews."
      : "The interaction was marked as an approved example.",
    timestamp: new Date(),
  });
  return {
    id: id("feedback-result"),
    interactionId: input.interactionId,
    decision: input.decision,
    memoryCreated,
    timestamp: nowIso(),
  };
}

export async function runEvaluation(includeMemory = true) {
  await ensureSeedData();
  const results = await Promise.all(
    EVALUATION_CASES.map(async ([category, request]) => {
      const result = await runAgentCore(request, includeMemory);
      return { category, request, status: result.supervisor.status, riskLevel: result.supervisor.riskLevel };
    }),
  );
  return {
    id: id("evaluation"),
    timestamp: nowIso(),
    totalCases: results.length,
    safeCases: results.filter((item) => item.status === "SAFE").length,
    reviewRequiredCases: results.filter((item) => item.status === "REVIEW_REQUIRED").length,
    policyIssues: results.filter((item) => item.riskLevel === "HIGH").length,
    memoryMatches: results.filter((item) => item.status === "PREVIOUS_FAILURE_DETECTED").length,
    humanCorrections: 0,
    repeatedFailureDetections: results.filter((item) => item.status === "PREVIOUS_FAILURE_DETECTED").length,
    cases: results,
  };
}

export function getSettings() {
  return {
    executionMode: requestedExecutionMode === "Live" && llmConfigured() ? "Live" : "Fallback",
    memoryMode: memoryMode(),
    llmConfigured: llmConfigured(),
    hindsightConfigured: memoryMode() === "Hindsight",
  };
}

export function updateSettings(executionMode?: string) {
  if (executionMode === "Live" || executionMode === "Fallback") requestedExecutionMode = executionMode;
  return getSettings();
}