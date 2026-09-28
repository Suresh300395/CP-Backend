const express = require("express");
const router = express.Router();
const { getPayments, createPayment, getRazorpayStatement } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// All payment routes require JWT authentication
router.use(protect);

router.route("/")
    .get(getPayments)
    .post(createPayment);

router.route("/razorpay")
    .get(getRazorpayStatement);

module.exports = router;

