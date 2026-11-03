const mongoose = require("mongoose");

const accountCloseRequestSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Account is required to raise account close request!"],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "User is required to raise account close request!"],
    },
    reason: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: "PENDING",
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    reviewedAt: Date,
    rejectionReason: {
        type: String,
        trim: true,
    },
    cancelledAt: Date,
}, { timestamps: true });

const accountCloseRequestModel = mongoose.model("accountCloseRequest", accountCloseRequestSchema);

module.exports = accountCloseRequestModel;