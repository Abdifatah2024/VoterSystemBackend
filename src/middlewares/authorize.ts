import { Request, Response, NextFunction } from "express";

export const authorize =
  (allowedRoles: ("ADMIN" | "USER")[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    //@ts-ignore
    const user = req.user as { role?: string };

    if (!user || !user.role) {
      return res.status(401).json({ message: "Unauthorized. No role found." });
    }

    if (!allowedRoles.includes(user.role as "ADMIN" | "USER")) {
      return res
        .status(403)
        .json({ message: "Forbidden. You do not have permission." });
    }

    next();
  };
