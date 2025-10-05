// server/routes/codeRoutes.js
import express from "express";
import { runCode } from "../controllers/codeController.js";

const codeRouter = express.Router();

// ✅ POST route to execute code via controller
codeRouter.post("/run", runCode);

export default codeRouter;
