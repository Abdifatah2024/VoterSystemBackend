import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { subYears } from "date-fns";
import multer from "multer";
import * as XLSX from "xlsx";

export const upload = multer({ storage: multer.memoryStorage() });

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
// 📌 Warbixin magaalada iyo degmada oo leh tirakoobka voter ID
export const getCityDistrictReport = async (_req: Request, res: Response) => {
  try {
    // Fetch all rows with needed fields
    const voters = await prisma.voter.findMany({
      select: {
        city: true,
        district: true,
        hasVoterId: true,
        wantsToChangeRegistration: true,
      },
    });

    // Aggregate manually in JS
    const reportMap = new Map<
      string,
      {
        city: string | null;
        district: string | null;
        totalVoters: number;
        withVoterId: number;
        withoutVoterId: number;
        wantsToChangeRegistration: number;
      }
    >();

    for (const voter of voters) {
      const key = `${voter.city ?? "Unknown"}-${voter.district ?? "Unknown"}`;

      if (!reportMap.has(key)) {
        reportMap.set(key, {
          city: voter.city ?? "Unknown",
          district: voter.district ?? "Unknown",
          totalVoters: 0,
          withVoterId: 0,
          withoutVoterId: 0,
          wantsToChangeRegistration: 0,
        });
      }

      const entry = reportMap.get(key)!;

      entry.totalVoters += 1;
      if (voter.hasVoterId) entry.withVoterId += 1;
      else entry.withoutVoterId += 1;
      if (voter.wantsToChangeRegistration) entry.wantsToChangeRegistration += 1;
    }

    const result = Array.from(reportMap.values()).sort(
      (a, b) => b.totalVoters - a.totalVoters
    );

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

// This assumes you're using multer with memoryStorage
// export const createMultipleVotersByExcel = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const votersData = XLSX.utils.sheet_to_json<any>(worksheet);

//     if (!Array.isArray(votersData) || votersData.length === 0) {
//       return res.status(400).json({
//         message: "Excel file is empty or invalid",
//       });
//     }

//     const createdVoters = [];
//     const skippedVoters: { row: number; reason: string }[] = [];

//     for (let i = 0; i < votersData.length; i++) {
//       const row = votersData[i];
//       const rowIndex = i + 2; // Excel row (assuming header is row 1)

//       const {
//         fullName,
//         gender,
//         dateOfBirth,
//         phoneNumber,
//         city,
//         district,
//         address,
//         clanTitle,
//         clanSubtitle,
//       } = row;

//       if (
//         !fullName ||
//         !gender ||
//         !dateOfBirth ||
//         !phoneNumber ||
//         !city ||
//         !district ||
//         !address ||
//         !clanTitle ||
//         !clanSubtitle
//       ) {
//         skippedVoters.push({
//           row: rowIndex,
//           reason: "Missing required fields",
//         });
//         continue;
//       }

//       try {
//         const voter = await prisma.voter.create({
//           data: {
//             fullName,
//             gender,
//             dateOfBirth: new Date(dateOfBirth),
//             phoneNumber,
//             city,
//             district,
//             address,
//             clanTitle,
//             clanSubtitle,
//           },
//         });

//         createdVoters.push(voter);
//       } catch (error) {
//         console.error(`Row ${rowIndex} error:`, error);
//         skippedVoters.push({
//           row: rowIndex,
//           reason: "Database error during insert",
//         });
//       }
//     }

//     res.status(201).json({
//       message: `${createdVoters.length} voters created successfully.`,
//       created: createdVoters,
//       skippedDetails: skippedVoters,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Internal server error.",
//     });
//   }
// };
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
    const worksheet = workbook.Sheets[sheetName];
    const votersData = XLSX.utils.sheet_to_json<any>(worksheet);

    if (!Array.isArray(votersData) || votersData.length === 0) {
      return res.status(400).json({
        message: "Excel file is empty or invalid",
      });
    }

    const createdVoters = [];
    const skippedVoters: { row: number; reason: string }[] = [];

    for (let i = 0; i < votersData.length; i++) {
      const row = votersData[i];
      const rowIndex = i + 2; // Excel row (assuming header is row 1)

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

      // If dateOfBirth is missing but Age is present, calculate it
      if (!dateOfBirth && Age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - Number(Age);
        // Default to Jan 1 of that year
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
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};

export const getVotersByClan = async (req: Request, res: Response) => {
  try {
    const { clanTitle, clanSubtitle } = req.query;

    if (!clanTitle) {
      return res.status(400).json({ message: "clanTitle is required." });
    }

    const whereClause: any = {
      clanTitle: clanTitle as string,
    };

    if (clanSubtitle) {
      whereClause.clanSubtitle = clanSubtitle as string;
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};
