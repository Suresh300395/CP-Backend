const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    createAdmin,
    getMe,
    changePassword,
    getAdmins,
    deleteAdmin
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// @route POST /api/auth/register
router.post("/register", registerUser);

// @route POST /api/auth/login
router.post("/login", loginUser);

// @route POST /api/auth/create-admin
router.post("/create-admin", createAdmin);

// @route GET /api/auth/admins
router.get("/admins", getAdmins);

// @route DELETE /api/auth/admins/:id
router.delete("/admins/:id", deleteAdmin);

// @route GET /api/auth/me
router.get("/me", protect, getMe);

// @route PUT /api/auth/change-password
router.put("/change-password", protect, changePassword);

module.exports = router;

