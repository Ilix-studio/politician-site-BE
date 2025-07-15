// routes/auth.ts
import express from "express";
import { loginAdmin, logoutAdmin } from "../controllers/auth.controller";

import { protect } from "../middleware/authMiddleware";

import seedAdmin from "../adminPrivilege/seeder";
import { validateLogin } from "../middleware/validationMiddleware";

const router = express.Router();

// Seed admin - should be protected in production
// Only allow in development mode
if (process.env.NODE_ENV === "development") {
  router.post("/seed", seedAdmin);
}

// Admin login with validation
router.post("/login", validateLogin, loginAdmin);

// Admin logout
router.post("/logout", protect, logoutAdmin);

export default router;
