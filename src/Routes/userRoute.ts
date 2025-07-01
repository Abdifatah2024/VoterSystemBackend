import express from "express";
import {
  adminResetUserPassword,
  changePassword,
  getAllUsers,
  login,
  register,
  updateUser,
} from "../Controller/user.controller";
import { authenticate } from "../middlewares/middlewares";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/Allusers", getAllUsers);
router.post(
  "/admin/users/:id/reset-password",
  authenticate,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);

      // ✅ Example: ensure requester is admin
      //@ts-ignore
      if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Unauthorized: Admins only." });
      }

      // ✅ Call the reset function
      const newPassword = await adminResetUserPassword(userId);

      res.json({
        message: "Password has been reset successfully.",
        newPassword, // You can display or send this to the user
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
router.get("/protected", authenticate, (req, res) => {
  res.json({
    message: "You accessed a protected route!",
    //@ts-ignore
    user: req.user, // ✅ No TypeScript error here
  });
});
router.put("/:userId", authenticate, updateUser);
router.post("/change-password", authenticate, changePassword);

export default router;
