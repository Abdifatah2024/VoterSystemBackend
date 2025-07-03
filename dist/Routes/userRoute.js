"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../Controller/user.controller");
const middlewares_1 = require("../middlewares/middlewares");
const router = express_1.default.Router();
router.post("/register", user_controller_1.register);
router.post("/login", user_controller_1.login);
router.get("/Allusers", user_controller_1.getAllUsers);
router.post("/admin/users/:id/reset-password", middlewares_1.authenticate, async (req, res) => {
    var _a;
    try {
        const userId = parseInt(req.params.id, 10);
        // ✅ Example: ensure requester is admin
        //@ts-ignore
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "ADMIN") {
            return res.status(403).json({ message: "Unauthorized: Admins only." });
        }
        // ✅ Call the reset function
        const newPassword = await (0, user_controller_1.adminResetUserPassword)(userId);
        res.json({
            message: "Password has been reset successfully.",
            newPassword, // You can display or send this to the user
        });
    }
    catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/protected", middlewares_1.authenticate, (req, res) => {
    res.json({
        message: "You accessed a protected route!",
        //@ts-ignore
        user: req.user, // ✅ No TypeScript error here
    });
});
router.put("/:userId", middlewares_1.authenticate, user_controller_1.updateUser);
router.post("/change-password", middlewares_1.authenticate, user_controller_1.changePassword);
exports.default = router;
