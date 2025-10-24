import express from "express";
import { handleContact } from "../controllers/contactController.js";

const contactRouter = express.Router();

contactRouter.post("/", handleContact);

export default contactRouter;
