import { Router } from "express";
import {
  requestEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  ping,
} from "../Controller/emailOtp.controller";
import { authenticate } from "../middlewares/middlewares";

const router = Router();

router.post("/request", requestEmailOtp);
router.post("/verify", verifyEmailOtp);
router.post("/resend", resendEmailOtp);
router.get("/auth/ping", authenticate, ping); // 401 if session revoked

export default router;
