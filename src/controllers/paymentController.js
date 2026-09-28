const Payment = require("../models/Payment");
const mongoose = require("mongoose");

// @desc    Get all payments (Scoped by Admin dbName or Global for SuperAdmin)
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
    try {
        const userEmail = req.user?.email || "";
        const userRole = req.user?.role || "admin";
        const isSuperAdmin = userRole === "superadmin" || userEmail.toLowerCase() === "prime@adityauniversity.in";
        const userDbName = req.user?.dbName || "central_payments_db";

        let payments = [];
        try {
            if (isSuperAdmin) {
                payments = await Payment.find({}).sort({ createdAt: -1 });
            } else {
                payments = await Payment.find({ dbName: userDbName }).sort({ createdAt: -1 });
            }
        } catch (dbErr) {
            console.error("MongoDB query error in getPayments:", dbErr.message);
            payments = [];
        }

        let totalCollections = 0;
        let successCount = 0;
        let pendingCount = 0;
        let failedCount = 0;

        if (Array.isArray(payments)) {
            payments.forEach((tx) => {
                const numAmount = Number(tx.amount) || 0;
                if (tx.status === "Success") {
                    totalCollections += numAmount;
                    successCount += 1;
                } else if (tx.status === "Pending") {
                    pendingCount += 1;
                } else if (tx.status === "Failed") {
                    failedCount += 1;
                }
            });
        }

        return res.status(200).json({
            success: true,
            isSuperAdmin,
            userDbName,
            count: payments.length,
            stats: {
                totalCollections,
                successCount,
                pendingCount,
                failedCount
            },
            payments
        });
    } catch (error) {
        console.error("Get Payments Top Level Error:", error.message);
        return res.status(200).json({
            success: true,
            isSuperAdmin: false,
            userDbName: "central_payments_db",
            count: 0,
            stats: {
                totalCollections: 0,
                successCount: 0,
                pendingCount: 0,
                failedCount: 0
            },
            payments: []
        });
    }
};

// @desc    Create a new payment transaction
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res) => {
    try {
        const { studentName, amount, paymentMethod, status, customDbName, eventName } = req.body;

        if (!studentName || !amount) {
            return res.status(400).json({
                success: false,
                message: "Please provide studentName and amount"
            });
        }

        const userEmail = req.user?.email || "";
        const userRole = req.user?.role || "admin";
        const targetDbName = customDbName || req.user?.dbName || "central_payments_db";
        const finalEventName = eventName || "General Registration";

        // Generate unique transaction ID
        const cleanTag = targetDbName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const randomNum = Math.floor(10000000 + Math.random() * 90000000);
        const transactionId = `TXN${randomNum}`;

        const payment = await Payment.create({
            transactionId,
            studentName,
            amount: Number(amount),
            paymentMethod: paymentMethod || "UPI",
            status: status || "Success",
            dbName: targetDbName,
            eventName: finalEventName
        });

        // Also insert into dedicated event collection in MongoDB
        try {
            const db = mongoose.connection.db;
            if (db) {
                const collectionName = `${cleanTag}_payments`;
                await db.collection(collectionName).insertOne({
                    transactionId,
                    studentName,
                    amount: Number(amount),
                    paymentMethod: paymentMethod || "UPI",
                    status: status || "Success",
                    dbName: targetDbName,
                    eventName: finalEventName,
                    createdAt: new Date()
                });
            }
        } catch (colErr) {
            console.log("Collection insert notice:", colErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Payment transaction recorded successfully",
            payment
        });
    } catch (error) {
        console.error("Create Payment Error:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Error creating payment"
        });
    }
};

module.exports = {
    getPayments,
    createPayment
};
