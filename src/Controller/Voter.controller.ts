import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { subYears } from "date-fns";

// Create voter
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

    // Basic validation
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

//create multi voters.
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

// Get all voters
export const getAllVoters = async (_req: Request, res: Response) => {
  try {
    const voters = await prisma.voter.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(voters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get voter by ID
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

// Update voter
export const updateVoter = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Voter not found." });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Delete voter
export const deleteVoter = async (req: Request, res: Response) => {
  try {
    const { voterId } = req.params;
    await prisma.voter.delete({
      where: { id: Number(voterId) },
    });
    res.json({ message: "Voter deleted successfully." });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Voter not found." });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 📌 Warbixin kooban guud
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

// 📌 Warbixin magaalada iyo degmada
export const getCityDistrictReport = async (_req: Request, res: Response) => {
  try {
    const result = await prisma.voter.groupBy({
      by: ["city", "district"],
      _count: { _all: true },
      orderBy: [{ city: "asc" }, { district: "asc" }],
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 📌 Warbixin qabiil iyo farac
export const getClanReport = async (_req: Request, res: Response) => {
  try {
    const result = await prisma.voter.groupBy({
      by: ["clanTitle", "clanSubtitle"],
      _count: { _all: true },
      orderBy: [{ clanTitle: "asc" }, { clanSubtitle: "asc" }],
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 📌 Warbixin dadka codsaday beddel goob
export const getChangeRequestsReport = async (_req: Request, res: Response) => {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 📌 Warbixin da'da
export const getAgeDistributionReport = async (
  _req: Request,
  res: Response
) => {
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
            gte: subYears(now, group.max),
            lte: subYears(now, group.min),
          },
        },
      });
      results.push({ ageRange: group.label, count });
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};
