import { Router } from "express";
import {
  requestEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
} from "../Controller/emailOtp.controller";

const router = Router();

router.post("/request", requestEmailOtp);
router.post("/verify", verifyEmailOtp);
router.post("/resend", resendEmailOtp);

export default router;
