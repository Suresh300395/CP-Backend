const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true
        },
        studentName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        paymentMethod: {
            type: String,
            enum: ["UPI", "Card", "Net Banking"],
            default: "UPI"
        },
        status: {
            type: String,
            enum: ["Success", "Pending", "Failed"],
            default: "Success"
        },
        dbName: {
            type: String,
            required: true,
            index: true
        },
        eventName: {
            type: String,
            default: "General Registration"
        }
    },
    {
        timestamps: true
    }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
