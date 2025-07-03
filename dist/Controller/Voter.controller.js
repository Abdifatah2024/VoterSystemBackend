"use strict";
// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
// import { subYears } from "date-fns";
// import multer from "multer";
// import * as XLSX from "xlsx";
// import { sendTelesomSMS } from "../Utils/sendTelesomSMS";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllVoters = exports.getDemographicsSummary = exports.sendSMSAllVoters = exports.getAllVotersBasicInfo = exports.updateBasicVoterInfo = exports.getBasicVoterInfo = exports.getVotersByClan = exports.createMultipleVotersByExcel = exports.getAgeDistributionReport = exports.getChangeRequestsReport = exports.getClanReport = exports.getCityDistrictReport = exports.getSummaryReport = exports.deleteVoter = exports.updateVoter = exports.getVoterById = exports.getAllVoters = exports.createMultipleVoters = exports.createVoter = exports.upload = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const date_fns_1 = require("date-fns");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const sendTelesomSMS_1 = require("../Utils/sendTelesomSMS");
exports.upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Create voter
const createVoter = async (req, res) => {
    try {
        const { fullName, gender, dateOfBirth, phoneNumber, city, district, address, hasVoterId, registeredPlace, wantsToChangeRegistration, newRegistrationPlace, desiredRegistrationPlace, clanTitle, clanSubtitle, } = req.body;
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
// Create multiple voters
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
// Summary report
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
// City/district report
const getCityDistrictReport = async (_req, res) => {
    var _a, _b, _c, _d;
    try {
        const voters = await prisma.voter.findMany({
            select: {
                city: true,
                district: true,
                hasVoterId: true,
                wantsToChangeRegistration: true,
            },
        });
        const reportMap = new Map();
        for (const voter of voters) {
            const key = `${(_a = voter.city) !== null && _a !== void 0 ? _a : "Unknown"}-${(_b = voter.district) !== null && _b !== void 0 ? _b : "Unknown"}`;
            if (!reportMap.has(key)) {
                reportMap.set(key, {
                    city: (_c = voter.city) !== null && _c !== void 0 ? _c : "Unknown",
                    district: (_d = voter.district) !== null && _d !== void 0 ? _d : "Unknown",
                    totalVoters: 0,
                    withVoterId: 0,
                    withoutVoterId: 0,
                    wantsToChangeRegistration: 0,
                });
            }
            const entry = reportMap.get(key);
            entry.totalVoters += 1;
            if (voter.hasVoterId)
                entry.withVoterId += 1;
            else
                entry.withoutVoterId += 1;
            if (voter.wantsToChangeRegistration)
                entry.wantsToChangeRegistration += 1;
        }
        const result = Array.from(reportMap.values()).sort((a, b) => b.totalVoters - a.totalVoters);
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getCityDistrictReport = getCityDistrictReport;
// Clan report
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
// Change requests report
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
// Age distribution report
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
// Create multiple voters by Excel
const createMultipleVotersByExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const votersData = XLSX.utils.sheet_to_json(worksheet);
        if (!Array.isArray(votersData) || votersData.length === 0) {
            return res.status(400).json({
                message: "Excel file is empty or invalid",
            });
        }
        const createdVoters = [];
        const skippedVoters = [];
        for (let i = 0; i < votersData.length; i++) {
            const row = votersData[i];
            const rowIndex = i + 2;
            let { fullName, gender, dateOfBirth, Age, phoneNumber, city, district, address, clanTitle, clanSubtitle, } = row;
            if (!dateOfBirth && Age) {
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - Number(Age);
                dateOfBirth = `${birthYear}-01-01`;
            }
            if (!fullName ||
                !gender ||
                !dateOfBirth ||
                !phoneNumber ||
                !city ||
                !district ||
                !address ||
                !clanTitle ||
                !clanSubtitle) {
                skippedVoters.push({
                    row: rowIndex,
                    reason: "Missing required fields",
                });
                continue;
            }
            try {
                const voter = await prisma.voter.create({
                    data: {
                        fullName,
                        gender,
                        dateOfBirth: new Date(dateOfBirth),
                        phoneNumber,
                        city,
                        district,
                        address,
                        clanTitle,
                        clanSubtitle,
                    },
                });
                createdVoters.push(voter);
            }
            catch (error) {
                console.error(`Row ${rowIndex} error:`, error);
                skippedVoters.push({
                    row: rowIndex,
                    reason: "Database error during insert",
                });
            }
        }
        res.status(201).json({
            message: `${createdVoters.length} voters created successfully.`,
            created: createdVoters,
            skippedDetails: skippedVoters,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error.",
        });
    }
};
exports.createMultipleVotersByExcel = createMultipleVotersByExcel;
// Get voters by clan
const getVotersByClan = async (req, res) => {
    try {
        const { clanTitle, clanSubtitle } = req.query;
        if (!clanTitle) {
            return res.status(400).json({ message: "clanTitle is required." });
        }
        const whereClause = {
            clanTitle: clanTitle,
        };
        if (clanSubtitle) {
            whereClause.clanSubtitle = clanSubtitle;
        }
        const voters = await prisma.voter.findMany({
            where: whereClause,
            select: {
                id: true,
                fullName: true,
                city: true,
                district: true,
                hasVoterId: true,
                registeredPlace: true,
                wantsToChangeRegistration: true,
                newRegistrationPlace: true,
                desiredRegistrationPlace: true,
                phoneNumber: true,
                dateOfBirth: true,
            },
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
exports.getVotersByClan = getVotersByClan;
// Get basic voter info
const getBasicVoterInfo = async (req, res) => {
    try {
        const { voterId } = req.params;
        const voter = await prisma.voter.findUnique({
            where: { id: Number(voterId) },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                city: true,
                district: true,
                hasVoterId: true,
                registeredPlace: true,
            },
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
exports.getBasicVoterInfo = getBasicVoterInfo;
// Update basic voter info
const updateBasicVoterInfo = async (req, res) => {
    try {
        const { voterId } = req.params;
        const { fullName, phoneNumber, city, district, hasVoterId, registeredPlace, } = req.body;
        const updatedVoter = await prisma.voter.update({
            where: { id: Number(voterId) },
            data: {
                fullName,
                phoneNumber,
                city,
                district,
                hasVoterId,
                registeredPlace,
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                city: true,
                district: true,
                hasVoterId: true,
                registeredPlace: true,
            },
        });
        res.json({
            message: "Voter updated successfully.",
            voter: updatedVoter,
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
exports.updateBasicVoterInfo = updateBasicVoterInfo;
// Get all voters basic info
const getAllVotersBasicInfo = async (_req, res) => {
    try {
        const voters = await prisma.voter.findMany({
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                city: true,
                district: true,
                hasVoterId: true,
                registeredPlace: true,
            },
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
exports.getAllVotersBasicInfo = getAllVotersBasicInfo;
// Send SMS to all voters
const sendSMSAllVoters = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message text is required." });
        }
        const voters = await prisma.voter.findMany({
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
            },
        });
        if (voters.length === 0) {
            return res
                .status(404)
                .json({ message: "No voters found in the system." });
        }
        const results = [];
        for (const voter of voters) {
            try {
                await (0, sendTelesomSMS_1.sendTelesomSMS)(voter.phoneNumber, message);
                console.log(`SMS sent to ${voter.fullName} (${voter.phoneNumber})`);
                results.push({
                    voterId: voter.id,
                    phone: voter.phoneNumber,
                    status: "sent",
                });
            }
            catch (err) {
                console.error(`Failed to send SMS to ${voter.phoneNumber}:`, err);
                results.push({
                    voterId: voter.id,
                    phone: voter.phoneNumber,
                    status: "failed",
                });
            }
        }
        res.json({
            message: `Attempted to send SMS to ${voters.length} voters.`,
            results,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.sendSMSAllVoters = sendSMSAllVoters;
const getDemographicsSummary = async (req, res) => {
    try {
        const today = new Date();
        // 1️⃣ Total voters
        const totalVoters = await prisma.voter.count();
        // 2️⃣ Gender counts
        const maleCount = await prisma.voter.count({
            where: { gender: "Male" },
        });
        const femaleCount = await prisma.voter.count({
            where: { gender: "Female" },
        });
        // 3️⃣ Age groups
        const age18_25 = await prisma.voter.count({
            where: {
                dateOfBirth: {
                    gte: (0, date_fns_1.subYears)(today, 25),
                    lte: (0, date_fns_1.subYears)(today, 18),
                },
            },
        });
        const age26_35 = await prisma.voter.count({
            where: {
                dateOfBirth: {
                    gte: (0, date_fns_1.subYears)(today, 35),
                    lte: (0, date_fns_1.subYears)(today, 26),
                },
            },
        });
        const age36_50 = await prisma.voter.count({
            where: {
                dateOfBirth: {
                    gte: (0, date_fns_1.subYears)(today, 50),
                    lte: (0, date_fns_1.subYears)(today, 36),
                },
            },
        });
        const age51plus = await prisma.voter.count({
            where: {
                dateOfBirth: {
                    lte: (0, date_fns_1.subYears)(today, 51),
                },
            },
        });
        // 4️⃣ City/District breakdown
        const cityDistrict = await prisma.voter.groupBy({
            by: ["city", "district"],
            _count: { _all: true },
        });
        // 5️⃣ Clan breakdown
        const clan = await prisma.voter.groupBy({
            by: ["clanTitle", "clanSubtitle"],
            _count: { _all: true },
        });
        // 6️⃣ Voter ID Status
        const withVoterId = await prisma.voter.count({
            where: { hasVoterId: true },
        });
        const withoutVoterId = await prisma.voter.count({
            where: { hasVoterId: false },
        });
        // 7️⃣ Voters per City
        const votersPerCity = await prisma.voter.groupBy({
            by: ["city"],
            _count: { _all: true },
        });
        // ✅ Respond with all aggregated data
        res.json({
            totalVoters,
            genderCounts: {
                male: maleCount,
                female: femaleCount,
            },
            ageGroups: {
                "18-25": age18_25,
                "26-35": age26_35,
                "36-50": age36_50,
                "51+": age51plus,
            },
            cityDistrict: cityDistrict.map((c) => ({
                city: c.city,
                district: c.district,
                count: c._count._all,
            })),
            clans: clan.map((c) => ({
                clanTitle: c.clanTitle,
                clanSubtitle: c.clanSubtitle,
                count: c._count._all,
            })),
            voterIdStatus: {
                withVoterId,
                withoutVoterId,
            },
            votersPerCity: votersPerCity.map((c) => ({
                city: c.city,
                count: c._count._all,
            })),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.getDemographicsSummary = getDemographicsSummary;
// Delete all voters
const deleteAllVoters = async (req, res) => {
    try {
        // Delete all records from the voter table
        await prisma.voter.deleteMany({});
        res.status(200).json({
            message: "All voters have been deleted successfully.",
        });
    }
    catch (error) {
        console.error("Error deleting all voters:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.deleteAllVoters = deleteAllVoters;
