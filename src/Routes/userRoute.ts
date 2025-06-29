import express from "express";
import {
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
router.get("/protected", authenticate, (req, res) => {
  res.json({
    message: "You accessed a protected route!",
    //@ts-ignore
    user: req.user, // ✅ No TypeScript error here
  });
});
router.put("/:userId", authenticate, updateUser);

export default router;
