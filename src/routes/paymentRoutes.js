const express = require("express");
const router = express.Router();
const { getPayments, createPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// All payment routes require JWT authentication
router.use(protect);

router.route("/")
    .get(getPayments)
    .post(createPayment);

module.exports = router;
