import { Router, type IRouter } from "express";
import {
  GetMemoriesQueryParams,
  GetMemoryParams,
  RunAgentBody,
  RunEvaluationBody,
  SaveFeedbackBody,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import {
  getActivity,
  getAlerts,
  getMemory,
  getMetrics,
  getPolicies,
  getSettings,
  retrieveRelevantMemories,
  runAndPersist,
  runEvaluation,
  saveFeedback,
  searchMemories,
  updateSettings,
} from "../services/agentguard";

const router: IRouter = Router();

router.get("/dashboard/metrics", async (_req, res, next) => {
  try {
    res.json(await getMetrics());
  } catch (error) {
    next(error);
  }
});

router.get("/activity", async (_req, res, next) => {
  try {
    res.json(await getActivity());
  } catch (error) {
    next(error);
  }
});

router.get("/policies", async (_req, res, next) => {
  try {
    res.json(await getPolicies());
  } catch (error) {
    next(error);
  }
});

router.get("/memory", async (req, res, next) => {
  try {
    const query = GetMemoriesQueryParams.parse(req.query);
    res.json(await searchMemories(query));
  } catch (error) {
    next(error);
  }
});

router.get("/memory/:id", async (req, res, next) => {
  try {
    const { id } = GetMemoryParams.parse(req.params);
    const memory = await getMemory(id);
    if (!memory) {
      res.status(404).json({ error: "Memory not found." });
      return;
    }
    res.json(memory);
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", async (_req, res, next) => {
  try {
    res.json(await getAlerts());
  } catch (error) {
    next(error);
  }
});

router.post("/agent/run", async (req, res, next) => {
  try {
    const parsed = RunAgentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please enter a customer message before running the agent." });
      return;
    }
    const { request } = parsed.data;
    res.json(await runAndPersist(request));
  } catch (error) {
    next(error);
  }
});

router.post("/feedback", async (req, res, next) => {
  try {
    res.json(await saveFeedback(SaveFeedbackBody.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

router.post("/evaluation/run", async (req, res, next) => {
  try {
    const body = req.body ? RunEvaluationBody.parse(req.body) : {};
    res.json(await runEvaluation(body.includeMemory ?? true));
  } catch (error) {
    next(error);
  }
});

router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

router.patch("/settings", (req, res, next) => {
  try {
    const body = UpdateSettingsBody.parse(req.body);
    res.json(updateSettings(body.executionMode));
  } catch (error) {
    next(error);
  }
});

export default router;