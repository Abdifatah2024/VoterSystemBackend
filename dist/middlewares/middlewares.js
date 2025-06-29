"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ message: "Authorization header missing or invalid." });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // @ts-ignore
        req.user = decoded; // attach decoded info to request object
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};
exports.authenticate = authenticate;
