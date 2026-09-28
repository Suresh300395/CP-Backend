const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET || "central_payments_super_secret_jwt_key_2026",
        { expiresIn: "30d" }
    );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields (name, email, password)"
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone: phone || ""
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: "User registered successfully",
                token: generateToken(user._id),
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    dbName: user.dbName
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Invalid user data"
            });
        }
    } catch (error) {
        console.error("Register Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error during registration"
        });
    }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password"
            });
        }

        // Check for user
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const isSuperAdminEmail = user.email.toLowerCase() === 'prime@adityauniversity.in';
            const effectiveRole = isSuperAdminEmail ? 'superadmin' : (user.role || 'admin');

            if (isSuperAdminEmail && user.role !== 'superadmin') {
                user.role = 'superadmin';
                await user.save();
            }

            res.status(200).json({
                success: true,
                message: "Login successful",
                token: generateToken(user._id),
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: effectiveRole,
                    dbName: isSuperAdminEmail ? 'all_databases' : (user.dbName || 'default_db')
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error during login"
        });
    }
};

const Payment = require("../models/Payment");
const mongoose = require("mongoose");

// @desc    Create new Admin user assigned to a database scope
// @route   POST /api/auth/create-admin
// @access  Public / Admin
const createAdmin = async (req, res) => {
    try {
        const { name, phone, email, password, dbName } = req.body;

        if (!name || !email || !password || !dbName) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields (name, email, password, dbName)"
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User with this email address already exists"
            });
        }

        const cleanDbName = dbName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const collectionName = `${cleanDbName}_payments`;

        // Create Admin user with assigned dbName
        const adminUser = await User.create({
            name,
            phone: phone || "",
            email,
            password,
            role: "admin",
            dbName: cleanDbName
        });

        // Physically create the collection folder in MongoDB
        try {
            const db = mongoose.connection.db;
            if (db) {
                const collections = await db.listCollections({ name: collectionName }).toArray();
                if (collections.length === 0) {
                    await db.createCollection(collectionName);
                }
            }
        } catch (colError) {
            console.log("Collection setup info:", colError.message);
        }

        res.status(201).json({
            success: true,
            message: `Admin account created successfully for database scope '${adminUser.dbName}'`,
            user: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                phone: adminUser.phone,
                role: adminUser.role,
                dbName: adminUser.dbName
            }
        });
    } catch (error) {
        console.error("Create Admin Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error creating admin user"
        });
    }
};

// @desc    Get logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (user && user.email.toLowerCase() === 'prime@adityauniversity.in') {
            user.role = 'superadmin';
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("GetMe Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server Error fetching user profile"
        });
    }
};

// @desc    Change logged in user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide both current and new password"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long"
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect current password. Please verify your password and try again."
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error("Change Password Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error changing password"
        });
    }
};

// @desc    Get list of all admin users (excluding SuperAdmin)
// @route   GET /api/auth/admins
// @access  Public / Admin
const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({
            role: "admin",
            email: { $ne: "prime@adityauniversity.in" }
        })
            .select("-password")
            .sort({ createdAt: -1 });

        const formattedAdmins = admins.map(u => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone || "—",
            role: 'admin',
            dbName: u.dbName || 'default_db',
            createdAt: u.createdAt
        }));

        res.status(200).json({
            success: true,
            count: formattedAdmins.length,
            admins: formattedAdmins
        });
    } catch (error) {
        console.error("Get Admins Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error fetching admins list"
        });
    }
};

// @desc    Delete an admin user
// @route   DELETE /api/auth/admins/:id
// @access  Public / Admin
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const targetUser = await User.findById(id);

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Admin user not found" });
        }

        if (targetUser.email.toLowerCase() === 'prime@adityauniversity.in') {
            return res.status(403).json({ success: false, message: "Super Admin account cannot be deleted" });
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: `Admin user '${targetUser.name}' (${targetUser.email}) deleted successfully`
        });
    } catch (error) {
        console.error("Delete Admin Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server Error deleting admin user"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    createAdmin,
    getMe,
    changePassword,
    getAdmins,
    deleteAdmin
};

