import express from "express";
import { issueCertificate, verifyCertificate, getUserCertificates } from "../controllers/certificateController.js";

const certificaterouter = express.Router();

router.post("/issue", issueCertificate);
router.get("/verify/:id", verifyCertificate);
router.get("/my-certificates", getUserCertificates);

export default certificaterouter;
