// import jwt from "jsonwebtoken";
// import { Request, Response, NextFunction } from "express";

// export const authenticate = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res
//       .status(401)
//       .json({ message: "Authorization header missing or invalid." });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!);
//     // @ts-ignore
//     req.user = decoded; // attach decoded info to request object
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Invalid or expired token." });
//   }
// };
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define what your token payload looks like
interface JwtPayload {
  userId: number;
  role: string;
  iat: number;
  exp: number;
}

// Extend Request to include `user`
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization header missing or invalid." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
