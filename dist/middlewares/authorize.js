"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (allowedRoles) => (req, res, next) => {
    //@ts-ignore
    const user = req.user;
    if (!user || !user.role) {
        return res.status(401).json({ message: "Unauthorized. No role found." });
    }
    if (!allowedRoles.includes(user.role)) {
        return res
            .status(403)
            .json({ message: "Forbidden. You do not have permission." });
    }
    next();
};
exports.authorize = authorize;
