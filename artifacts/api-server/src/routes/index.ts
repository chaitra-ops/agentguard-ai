import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentguardRouter from "./agentguard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentguardRouter);

export default router;
