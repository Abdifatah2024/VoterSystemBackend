"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Voter_controller_1 = require("../Controller/Voter.controller");
const router = express_1.default.Router();
// Create voter
router.post("/create", Voter_controller_1.createVoter);
router.post("/bulk", Voter_controller_1.createMultipleVoters);
// Warbixin qabiil iyo farac
router.get("/clan", Voter_controller_1.getClanReport);
// Warbixin guud
router.get("/city-district", Voter_controller_1.getCityDistrictReport);
router.get("/summary", Voter_controller_1.getSummaryReport);
// Get all voters
router.get("/", Voter_controller_1.getAllVoters);
// Get one voter by ID
router.get("/:voterId", Voter_controller_1.getVoterById);
// Update voter by ID
router.put("/:voterId", Voter_controller_1.updateVoter);
// Delete voter by ID
router.delete("/:voterId", Voter_controller_1.deleteVoter);
// Warbixin magaalo iyo degmo
// Warbixin codsiyada beddelka goobta
router.get("/change-requests", Voter_controller_1.getChangeRequestsReport);
// Warbixin da'da
router.get("/age-distribution", Voter_controller_1.getAgeDistributionReport);
exports.default = router;
