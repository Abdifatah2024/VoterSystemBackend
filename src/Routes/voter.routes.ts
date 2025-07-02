import express from "express";
import {
  createVoter,
  getAllVoters,
  getVoterById,
  updateVoter,
  deleteVoter,
  createMultipleVoters,
  getSummaryReport,
  getCityDistrictReport,
  getClanReport,
  getChangeRequestsReport,
  getAgeDistributionReport,
  createMultipleVotersByExcel,
  getVotersByClan,
  getBasicVoterInfo,
  updateBasicVoterInfo,
  getAllVotersBasicInfo,
  sendSMSAllVoters,
  getDemographicsSummary,
  deleteAllVoters,
} from "../Controller/Voter.controller";
import multer from "multer";

const router = express.Router();

// Create voter
router.delete("/delete-all", deleteAllVoters);
router.post("/create", createVoter);
router.post("/bulk", createMultipleVoters);
// Warbixin qabiil iyo farac
router.get("/by-clan", getVotersByClan);
router.get("/clan", getClanReport);
// Warbixin guud
router.get("/city-district", getCityDistrictReport);
router.get("/summary", getSummaryReport);
// Get all voters
router.get("/", getAllVoters);

// Get one voter by ID
router.get("/:voterId", getVoterById);

// Update voter by ID
router.put("/:voterId", updateVoter);

// Delete voter by ID
router.delete("/:voterId", deleteVoter);

// Warbixin magaalo iyo degmo

// Warbixin codsiyada beddelka goobta
router.get("/change-requests", getChangeRequestsReport);

// Warbixin da'da
router.get("/age-distribution", getAgeDistributionReport);

const upload = multer({
  storage: multer.memoryStorage(),
});
router.post(
  "/upload-excel",
  upload.single("file"),
  createMultipleVotersByExcel
);
router.get("/voters/:voterId/basicInfo", getBasicVoterInfo);
router.put("/voters/:voterId/basic", updateBasicVoterInfo);
router.get("/voters/basic", getAllVotersBasicInfo);
router.post("/send-sms-all", sendSMSAllVoters);
router.get("/demographics/summary", getDemographicsSummary);

export default router;
