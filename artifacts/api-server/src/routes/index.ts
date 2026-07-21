import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dogsRouter from "./dogs";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dogsRouter);
router.use(leaderboardRouter);

export default router;
