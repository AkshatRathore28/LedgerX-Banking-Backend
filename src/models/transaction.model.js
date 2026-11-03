const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    senderAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a from account."],
        index: true,
    },
    senderAccountHolder: {
        type: String,
        required: [true, "Sender account holder name is required for creating a transaction"],
    },
    receiverAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a to account"],
        index: true,
    },
    receiverAccountHolder: {
        type: String,
        required: [true, "Receiver account holder name is required for creating a transaction"],
    },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
        },
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: [true, "Amount is required for creating a transaction"],
        min: [0, "Transaction amount cannot be negative"],
    },
    /**
     * - Same payment ko 2 bar karne se rokti hai
     * - ye humasha client side per generate hoti hai, backend isse generate nhi karega
     * - ye humasha unique hoti hai, ek transaction ke liye ek idempotencykey rahegi, kabhi ye repeat nhi honi chaiye*/
    idempotencyKey: {
        type: String,
        required: [true, "Idempotency Key is required for creating a transaction"],
        index: true,
        unique: true,
    }
}, {
    timestamps: true
});

const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;