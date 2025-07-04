import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { subYears } from "date-fns";
import multer from "multer";
import * as XLSX from "xlsx";
import { sendTelesomSMS } from "../Utils/sendTelesomSMS";

export const upload = multer({ storage: multer.memoryStorage() });

/**
 * Create voter with unique phoneNumber check
 */
export const createVoter = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
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
    } = req.body;

    if (
      !fullName ||
      !gender ||
      !dateOfBirth ||
      !phoneNumber ||
      !city ||
      !district ||
      !address ||
      !clanTitle ||
      !clanSubtitle
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }

    const existing = await prisma.voter.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "A voter with this phone number already exists." });
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
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002" && error.meta?.target?.includes("phoneNumber")) {
      return res
        .status(409)
        .json({ message: "A voter with this phone number already exists." });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Create multiple voters via JSON array
 */
export const createMultipleVoters = async (req: Request, res: Response) => {
  try {
    const { votersData } = req.body;

    if (!Array.isArray(votersData) || votersData.length === 0) {
      return res.status(400).json({
        message: "votersData must be a non-empty array.",
      });
    }

    await prisma.voter.createMany({
      data: votersData,
      skipDuplicates: true, // skip duplicates at DB level if any
    });

    res.status(201).json({
      message: `${votersData.length} voters created successfully.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};

/**
 * Create multiple voters via Excel, skip duplicates
 */
export const createMultipleVotersByExcel = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    if (!Array.isArray(worksheet) || worksheet.length === 0) {
      return res.status(400).json({
        message: "Excel file is empty or invalid",
      });
    }

    const createdVoters = [];
    const skippedVoters: { row: number; reason: string }[] = [];

    for (let i = 0; i < worksheet.length; i++) {
      const row = worksheet[i];
      const rowIndex = i + 2;

      let {
        fullName,
        gender,
        dateOfBirth,
        Age,
        phoneNumber,
        city,
        district,
        address,
        clanTitle,
        clanSubtitle,
      } = row;

      if (!dateOfBirth && Age) {
        const birthYear = new Date().getFullYear() - Number(Age);
        dateOfBirth = `${birthYear}-01-01`;
      }

      if (
        !fullName ||
        !gender ||
        !dateOfBirth ||
        !phoneNumber ||
        !city ||
        !district ||
        !address ||
        !clanTitle ||
        !clanSubtitle
      ) {
        skippedVoters.push({
          row: rowIndex,
          reason: "Missing required fields",
        });
        continue;
      }

      const exists = await prisma.voter.findUnique({
        where: { phoneNumber },
      });

      if (exists) {
        skippedVoters.push({
          row: rowIndex,
          reason: "Phone number already exists",
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
      } catch (error) {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ All your other controllers, unchanged:

export const getAllVoters = async (_req: Request, res: Response) => {
  try {
    const voters = await prisma.voter.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(voters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getVoterById = async (req: Request, res: Response) => {
  try {
    const { voterId } = req.params;
    const voter = await prisma.voter.findUnique({
      where: { id: Number(voterId) },
    });
    if (!voter) {
      return res.status(404).json({ message: "Voter not found." });
    }
    res.json(voter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const updateVoter = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Voter not found." });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const deleteVoter = async (req: Request, res: Response) => {
  try {
    const { voterId } = req.params;
    await prisma.voter.delete({ where: { id: Number(voterId) } });
    res.json({ message: "Voter deleted successfully." });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Voter not found." });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getSummaryReport = async (_req: Request, res: Response) => {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Add your remaining reports, SMS, etc., unchanged (too large to paste all here but identical to your last code)
