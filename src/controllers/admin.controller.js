const accountModel = require("../models/account.model.js");
const accountCloseRequestModel = require("../models/accountCloseRequest.model.js");
const transactionModel = require("../models/transaction.model.js");
const mongoose = require("mongoose");

// for All Accounts
async function getUserAccounts(req, res) {
    const account_id = req.query._id;
    const accounts = !account_id ? await accountModel.find() : await accountModel.findOne({ _id: account_id });//.select("_id name email");
    console.log(accounts);
    if (!accounts) {
        return res.status(400).json({
            message: "No Account Found!",
        });
    }

    return res.status(200).json({
        message: "Accounts Fetched Successfully",
        accounts
    })
}

async function freezeUserAccount(req, res) {
    const accountNumber = req.params.id;
    if (!accountNumber) {
        return res.status(400).json({ message: "Account number is required to freeze account." });
    }

    const account = await accountModel.findById(accountNumber);
    if (!account) {
        return res.status(400).json({ message: "Account not exists!" });
    }

    if (account.status === "FROZEN") {
        return res.status(409).json({ message: "Account already freezed!" });
    }

    account.status = "FROZEN";
    await account.save();

    return res.status(200).json({
        message: "Account Freezed Successfull!",
        account: {
            accountNumber: accountNumber,
            status: "FROZEN",
        },
    });

}

async function unfreezeUserAccount(req, res) {
    const accountNumber = req.params.id;
    if (!accountNumber) {
        return res.status(400).json({ message: "Account number is required to unfreeze user account." });
    }

    const account = await accountModel.findById(accountNumber);
    if (!account) {
        return res.status(400).json({ message: "Account not exists!" });
    }

    if (account.status === "CLOSED") {
        return res.status(400).json({ message: "Account is CLOSED, Please visit near branch once." });
    }

    if (account.status === "ACTIVE") {
        return res.status(200).json({ message: "Account already ACTIVE" });
    }

    account.status = "ACTIVE";
    await account.save();

    return res.status(200).json({
        message: "Account ACTIVITED successfully",
        account: {
            accountNumber: account._id,
            status: 'ACTIVE',
        }
    })
}

async function approvedAccountCloseRequestController(req, res) {
    const requestId = req.params.id;
    if (!requestId) {
        return res.status(400).json({
            message: "Request Id is required to approve account close request.",
        });
    }

    const closeRequest = await accountCloseRequestModel.findById(requestId);
    if (!closeRequest) {
        return res.status(400).json({ message: "Account close request not found!" });
    }

    if (closeRequest.status !== "PENDING") {
        return res.status(400).json({ message: "Request already processed!" });
    }

    const account = await accountModel.findById(closeRequest.account);
    if (!account) {
        return res.status(400).json({ message: "Account not found!" });
    }

    // Business Validation
    const accountBalance = await account.getBalance();
    if (accountBalance > 0) {
        return res.status(400).json({
            message: "Account balance must zero before closing, Please withdraw or transfer the funds.",
            accountBalance
        });
    }

    const pendingTransaction = await transactionModel.find({
        $or: [
            { senderAccount: account._id },
            { receiverAccount: account._id }
        ],
        status: "PENDING"
    });

    if (pendingTransaction.length > 0) {
        return res.status(400).json({
            message: "Account has PENDING transactions, It cannt be closed before all PENDING transaction get COMPLETED.",
        })
    }

    if (account.status === "CLOSED") {
        return res.status(400).json({ message: "Account already CLOSED" });
    }

    // MongoDb session start kara
    const session = await mongoose.startSession();
    session.startTransaction();

    // Account close logic
    account.status = 'CLOSED';
    await account.save({ session });

    // Close Request Approved
    closeRequest.status = "APPROVED";
    closeRequest.reviewedBy = req.user._id;
    closeRequest.reviewedAt = Date.now();
    await closeRequest.save({ session });

    // Session Commit
    await session.commitTransaction();

    return res.status(200).json({
        message: "Account closed request APPROVED successfully",
        closeRequest
    })



}

async function rejectedAccountCloseRequestController(req, res) {
    const requestId = req.params.id;
    const { rejectReason } = req.body;
    if (!requestId) {
        return res.status(400).json({
            message: "Requested ID is required to close account.",
        });
    }

    if (!rejectReason) {
        return res.status(400).json({ message: "Reject reason is required!" });
    }

    const closeRequest = await accountCloseRequestModel.findById(requestId);
    if (!closeRequest) {
        return res.status("Account close request not found!");
    }

    if (closeRequest.status !== 'PENDING') {
        return res.status(409).json({ message: "This request has already been processed." });
    }

    const account = await accountModel.findById(closeRequest.account);
    if (!account) {
        return res.status(400).json({ message: "Account not found!" });
    }

    if (account.status === "CLOSED") {
        return res.status(400).json({ message: "Account already CLOSED" });
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        closeRequest.status = "REJECTED";
        closeRequest.reason = rejectReason;
        closeRequest.reviewedBy = req.user._id;
        closeRequest.reviewedAt = Date.now();

        await closeRequest.save({ session });
        await session.commitTransaction();
        return res.status(200).json({
            message: "Account Close Request Rejected!",

        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
}

module.exports = {
    getUserAccounts,
    freezeUserAccount,
    unfreezeUserAccount,
    approvedAccountCloseRequestController,
    rejectedAccountCloseRequestController,
}