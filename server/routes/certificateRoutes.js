import express from "express";
import upload from "../configs/multer.js";
import { issueCertificate, verifyCertificate, getUserCertificates } from "../controllers/certificateController.js";

const certificaterouter = express.Router();

certificaterouter.post("/issue", upload.single("certificateFile"), issueCertificate);
certificaterouter.get("/verify/:id", verifyCertificate);
certificaterouter.get("/my-certificates", getUserCertificates);

export default certificaterouter;
