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
router.get("/protected", middlewares_1.authenticate, (req, res) => {
    res.json({
        message: "You accessed a protected route!",
        //@ts-ignore
        user: req.user, // ✅ No TypeScript error here
    });
});
router.put("/:userId", middlewares_1.authenticate, user_controller_1.updateUser);
exports.default = router;
