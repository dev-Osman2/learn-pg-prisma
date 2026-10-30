import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  deleteAccount,
} from "../controllers/auth.controller";

const router = Router();


router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", getMe);


router.put("/profile", updateProfile);
router.delete("/account", deleteAccount);

export default router;