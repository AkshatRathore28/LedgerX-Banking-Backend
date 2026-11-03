const { Timestamp } = require("mongodb");
const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model.js");

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Account must be associated with a user."],
        index: true,
    },
    accountHolder: {
        type: String,
        required: [true, "Account holder name is required for creating an account"],
    },
    status: {
        type: String,
        enum: {
            values: ['ACTIVE', 'FROZEN', 'CLOSED'],
            message: "Status can be either ACTIVE, FROZEN, CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "INR"
    },
    accountType: {
        type: String,
        enum: {
            values: ["SAVING", "CURRENT"],
            message: "Account type can be either SAVING or CURRENT",
        },
        default: "SAVING",
        required: [true, "Account type is required for creating an account"],
    }
}, { Timestamp: true });

accountSchema.index({ user: 1, status: 1 });

accountSchema.methods.getBalance = async function () {
    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "DEBIT"] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "CREDIT"] },
                            "$amount",
                            0
                        ]
                    }
                }

            }
        },
        {
            $project: {
                _id: 0,
                balance: { $subtract: ["$totalCredit", "$totalDebit"] }
            }
        }
    ]);

    /**
     * Execute when user mmake it's first transaction.
     * agar user first transaction kar raha hai to ledger empty hota hai, to ye balanceData ki value empty array hojati hai [], is liye ye condition lagate hai. 
    */
    if (balanceData.length === 0) {
        return 0;
    }

    return balanceData[0].balance;
}

// accountSchema.methods.getAccountHolder = async function () {
//     // I want account holder name in account holder.
//     const accountHolder = await mongoose.model("user").findById(this.user);
//     return accountHolder.name;

// }

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;