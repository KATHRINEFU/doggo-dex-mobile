import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dogsRouter from "./dogs";
import leaderboardRouter from "./leaderboard";
import shareImageRouter from "./shareImage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dogsRouter);
router.use(leaderboardRouter);
router.use(shareImageRouter);

export default router;
