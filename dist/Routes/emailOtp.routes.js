"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailOtp_controller_1 = require("../Controller/emailOtp.controller");
const router = (0, express_1.Router)();
router.post("/request", emailOtp_controller_1.requestEmailOtp);
router.post("/verify", emailOtp_controller_1.verifyEmailOtp);
router.post("/resend", emailOtp_controller_1.resendEmailOtp);
exports.default = router;
