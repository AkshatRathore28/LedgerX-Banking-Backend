const accountModel = require("../models/account.model.js");
const transactionModel = require("../models/transaction.model.js");
const accountCloseRequestModel = require("../models/accountCloseRequest.model.js");

async function createAccountController(req, res) {
    const user = req.user;
    const { accountType } = req.body;
    const existingAccount = await accountModel.findOne({ user: user._id, accountType: accountType });
    if (existingAccount) {
        return res.status(400).json({
            message: `User already has an account of type ${accountType}`,
        });
    }

    const account = await accountModel.create({
        user: user._id,
        accountHolder: user.name,
        accountType: accountType,
    });


    res.status(201).json({
        message: "Account created successfully",
        account: account
    })
}

async function getUserAccountController(req, res) {
    const user = req.user;

    const account = await accountModel.find({
        user: user._id,
    });

    if (!account) {
        return res.status(400).json({
            message: "Account Not Fount!",
        });
    }

    res.status(200).json({
        account: account
    });
}

async function fetchAccountBalanceController(req, res) {

    const account = await accountModel.findOne({
        user: req.user._id,
    });
    if (!account) {
        return res.status(400).json({
            message: "Account Not fount!",
        });
    }
    const balance = await account.getBalance();
    res.status(200).json({
        accountHolder: `${account.accountHolder}`,
        balance: balance,
    });
}

async function closeAccountController(req, res) {
    const accountNumber = req.params.accountNumber;
    if (!accountNumber) {
        return res.status(400).json({ message: "Account Number is required to delete account." })
    }

    const account = await accountModel.findById(accountNumber);
    console.log("account : ", account.user.toString());
    if (!account) {
        return res.status(400).json({ message: "Account not exists." });
    }

    if (account.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            message: "You are not authorized",
        });
    }

    if (account.status === 'CLOSED') {
        return res.status(409).json({
            message: "Account already closed!",
        });
    }

    const accountBalance = await account.getBalance();

    if (accountBalance > 0) {
        return res.status(400).json({
            message: "Withdraw or transfer all funds before closing account.",
            balance: accountBalance
        });
    }

    const pendingTransaction = await transactionModel.findOne({
        $or: [
            { receiverAccount: account._id },
            { senderAccount: account._id }
        ],
        status: "PENDING",
    });

    if (pendingTransaction) {
        return res.status(400).json({
            message: "Pending transaction exists.",
        });
    }

    account.status = 'CLOSED';
    await account.save();

    return res.status(200).json({
        message: "Account Closed Successfully",
    });
}

async function accountCloseRequestController(req, res) {
    const accountNumber = req.params.id;
    const { requestReason } = req.body;
    if (!accountNumber || !requestReason) {
        return res.status(400).json({ message: "Account number and account close request reason is required to raise account close request." });
    }

    const account = await accountModel.findById(accountNumber);
    if (!account) {
        return res.status(400).json({
            message: "Account not exist!",
        });
    }

    if (account._id.toString() !== accountNumber.toString()) {
        return res.status(403).json({
            message: "You are not authorized to raise account close request for this account.",
        });
    }

    if (account.status === "CLOSED") {
        return res.status(200).json({
            message: "Account already CLOSED.",
        });
    }

    const existingRequest = await accountCloseRequestModel.findOne({
        account: accountNumber,
        status: "PENDING",
    });

    if (existingRequest) {
        return res.status(409).json({
            message: "Account close request already raised and pending for approval.",
        });
    }

    const accountCloseRequest = await accountCloseRequestModel.create({
        account: account._id,
        user: req.user._id,
    });

    return res.status(200).json({
        message: "Account close request raised successfully! You will shortly received conformation mail.",
        accountCloseRequest
    });

    // CloseAccountRequest Model.
}

async function cancleAccountCloseRequestController(req, res) {
    const requestId = req.params.id;
    if (!requestId) {
        return res.status(400).json({ message: "Request Id is required to CANCLE account close request!" });
    }

    const closeRequest = await accountCloseRequestModel.findById(requestId);
    if (!closeRequest) {
        return res.status(404).json({ message: "Close request not found!" });
    }

    if (closeRequest.user.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: "You are not authorized to cancel this request!" });
    }

    if (closeRequest.status !== "PENDING") {
        return res.status(400).json({
            message: "Only PENDING request can be CANCELLED!",
        });
    }

    closeRequest.status = "CANCELLED";
    closeRequest.cancelledAt = Date.now();
    await closeRequest.save();

    return res.status(200).json({
        message: "Account Close Request CANCELLED successfully.",
    });

}
module.exports = {
    createAccountController,
    getUserAccountController,
    fetchAccountBalanceController,
    closeAccountController,
    accountCloseRequestController,
    cancleAccountCloseRequestController
};