"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgeDistributionReport = exports.getChangeRequestsReport = exports.getClanReport = exports.getCityDistrictReport = exports.getSummaryReport = exports.deleteVoter = exports.updateVoter = exports.getVoterById = exports.getAllVoters = exports.createMultipleVoters = exports.createVoter = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const date_fns_1 = require("date-fns");
// Create voter
const createVoter = async (req, res) => {
    try {
        const { fullName, gender, dateOfBirth, phoneNumber, city, district, address, hasVoterId, registeredPlace, wantsToChangeRegistration, newRegistrationPlace, desiredRegistrationPlace, clanTitle, clanSubtitle, } = req.body;
        // Basic validation
        if (!fullName ||
            !gender ||
            !dateOfBirth ||
            !phoneNumber ||
            !city ||
            !district ||
            !address ||
            !clanTitle ||
            !clanSubtitle) {
            return res
                .status(400)
                .json({ message: "Please provide all required fields." });
        }
        const voter = await prisma.voter.create({
            data: {
                fullName,
                gender,
                dateOfBirth: new Date(dateOfBirth),
                phoneNumber,
                city,
                district,
                address,
                hasVoterId,
                registeredPlace,
                wantsToChangeRegistration,
                newRegistrationPlace,
                desiredRegistrationPlace,
                clanTitle,
                clanSubtitle,
            },
        });
        res.status(201).json({
            message: "Voter created successfully.",
            voter,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.createVoter = createVoter;
//create multi voters.
const createMultipleVoters = async (req, res) => {
    try {
        const { votersData } = req.body;
        if (!Array.isArray(votersData) || votersData.length === 0) {
            return res.status(400).json({
                message: "votersData must be a non-empty array.",
            });
        }
        await prisma.voter.createMany({
            data: votersData,
        });
        res.status(201).json({
            message: `${votersData.length} voters created successfully.`,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error.",
        });
    }
};
exports.createMultipleVoters = createMultipleVoters;
// Get all voters
const getAllVoters = async (_req, res) => {
    try {
        const voters = await prisma.voter.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json(voters);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getAllVoters = getAllVoters;
// Get voter by ID
const getVoterById = async (req, res) => {
    try {
        const { voterId } = req.params;
        const voter = await prisma.voter.findUnique({
            where: { id: Number(voterId) },
        });
        if (!voter) {
            return res.status(404).json({ message: "Voter not found." });
        }
        res.json(voter);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getVoterById = getVoterById;
// Update voter
const updateVoter = async (req, res) => {
    try {
        const { voterId } = req.params;
        const dataToUpdate = req.body;
        // If dateOfBirth is included, convert it
        if (dataToUpdate.dateOfBirth) {
            dataToUpdate.dateOfBirth = new Date(dataToUpdate.dateOfBirth);
        }
        const voter = await prisma.voter.update({
            where: { id: Number(voterId) },
            data: dataToUpdate,
        });
        res.json({
            message: "Voter updated successfully.",
            voter,
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Voter not found." });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.updateVoter = updateVoter;
// Delete voter
const deleteVoter = async (req, res) => {
    try {
        const { voterId } = req.params;
        await prisma.voter.delete({
            where: { id: Number(voterId) },
        });
        res.json({ message: "Voter deleted successfully." });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Voter not found." });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.deleteVoter = deleteVoter;
// 📌 Warbixin kooban guud
const getSummaryReport = async (_req, res) => {
    try {
        const total = await prisma.voter.count();
        const withVoterId = await prisma.voter.count({
            where: { hasVoterId: true },
        });
        const withoutVoterId = await prisma.voter.count({
            where: { hasVoterId: false },
        });
        const changeRequests = await prisma.voter.count({
            where: { wantsToChangeRegistration: true },
        });
        const newRegistrations = await prisma.voter.count({
            where: {
                hasVoterId: false,
                desiredRegistrationPlace: { not: null },
            },
        });
        res.json({
            total,
            withVoterId,
            withoutVoterId,
            changeRequests,
            newRegistrations,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getSummaryReport = getSummaryReport;
// 📌 Warbixin magaalada iyo degmada
const getCityDistrictReport = async (_req, res) => {
    try {
        const result = await prisma.voter.groupBy({
            by: ["city", "district"],
            _count: { _all: true },
            orderBy: [{ city: "asc" }, { district: "asc" }],
        });
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getCityDistrictReport = getCityDistrictReport;
// 📌 Warbixin qabiil iyo farac
const getClanReport = async (_req, res) => {
    try {
        const result = await prisma.voter.groupBy({
            by: ["clanTitle", "clanSubtitle"],
            _count: { _all: true },
            orderBy: [{ clanTitle: "asc" }, { clanSubtitle: "asc" }],
        });
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getClanReport = getClanReport;
// 📌 Warbixin dadka codsaday beddel goob
const getChangeRequestsReport = async (_req, res) => {
    try {
        const voters = await prisma.voter.findMany({
            where: { wantsToChangeRegistration: true },
            select: {
                id: true,
                fullName: true,
                hasVoterId: true,
                registeredPlace: true,
                newRegistrationPlace: true,
                phoneNumber: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(voters);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getChangeRequestsReport = getChangeRequestsReport;
// 📌 Warbixin da'da
const getAgeDistributionReport = async (_req, res) => {
    try {
        const now = new Date();
        const ageGroups = [
            { label: "12-25", min: 18, max: 25 },
            { label: "26-35", min: 26, max: 35 },
            { label: "36-45", min: 36, max: 45 },
            { label: "46+", min: 46, max: 120 },
        ];
        const results = [];
        for (const group of ageGroups) {
            const count = await prisma.voter.count({
                where: {
                    dateOfBirth: {
                        gte: (0, date_fns_1.subYears)(now, group.max),
                        lte: (0, date_fns_1.subYears)(now, group.min),
                    },
                },
            });
            results.push({ ageRange: group.label, count });
        }
        res.json(results);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getAgeDistributionReport = getAgeDistributionReport;
