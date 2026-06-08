import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dogsRouter from "./dogs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dogsRouter);

export default router;
