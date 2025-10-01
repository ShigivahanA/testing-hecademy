import express from "express";
import { issueCertificate, verifyCertificate, getUserCertificates } from "../controllers/certificateController.js";

const certificaterouter = express.Router();

certificaterouter.post("/issue", issueCertificate);
certificaterouter.get("/verify/:id", verifyCertificate);
certificaterouter.get("/my-certificates", getUserCertificates);

export default certificaterouter;
