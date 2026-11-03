const accountModel = require("../models/account.model.js");
const transactionModel = require("../models/transaction.model.js");
const ledgerModel = require("../models/ledger.model.js");
const emailService = require("../services/email.service.js");
const mongoose = require("mongoose");

/**
 * - Create a new transaction
 * THE 10-SETP TRANSACTION FLOW
    * 1. Validate Request
    * 2. Validate idempotency key
    * 3. Check account status
    * 4. Derive sender balance from ledger
    * 5. Create transaction (pending)
    * 6. Create DEBIT ledger entry
    * 7. Create CREDIT ledger entry
    * 8. Mark transaction completed
    * 9. Commit MongoDB session
    * 10. Send email notification
    * */

async function createTransaction(req, res) {

    /**
     * 1. Validate Request*/
    const { senderAccount, receiverAccount, amount, idempotencyKey } = req.body;
    // const senderAccount = req.body

    if (!senderAccount || !receiverAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "senderAccount, receiverAccount, amount and idempotency are required" });
    }

    const senderUserAccount = await accountModel.findById({
        _id: senderAccount,
    });

    const receiverUserAccount = await accountModel.findOne({
        _id: receiverAccount,
    });

    if (!senderUserAccount || !receiverUserAccount) {
        return res.status(400).json({
            message: "Invalid senderAccount or receiverAccount"
        })
    }

    if (senderUserAccount._id.toString() === receiverUserAccount._id.toString()) {
        return res.status(400).json({
            message: "user can't send funds to itself!",
        });
    }

    /**
     * 2. Validate idempotency Key
    */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    });

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            });
        };

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing."
            });
        };

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing is failed, Please retry."
            });
        };

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, Please retry."
            })
        }
    }

    /**
     * 3. Check account status 
     * */

    if (senderUserAccount.status !== "ACTIVE" || receiverUserAccount.status !== "ACTIVE") {
        return res.status(500).json({
            message: "Both senderAccount and receiverAccount must be ACTIVE to process transaction.",
        });
    }

    /**
     * 4. Derive sender balance from ledger.
     * */
    const balance = await senderUserAccount.getBalance();

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is  ${balance}. Requested amount is ${amount}`,
        });
    }

    /**
     * 5. Create transaction (PENDING)
     * startSession 
     * - mongoose hume consistency ke liye ye function deta hai,
     * - Ya to sare function complete hoge, nhi to koi bhi nhi hoga
     * - like : transaction mai 4 main step : 
     * 1. transaction (Pending)
     * 2. Debit Entry
     * 3. Credit Entry
     * 4. transaction (Completed)
    */
    const session = await mongoose.startSession();
    try {


        session.startTransaction();

        const transaction = (await transactionModel.create([{
            senderAccount,
            senderAccountHolder: senderUserAccount.accountHolder,
            receiverAccount,
            receiverAccountHolder: receiverUserAccount.accountHolder,
            amount,
            idempotencyKey,
            status: "PENDING",
        }], { session }))[0];

        const debitLedgerEntry = await ledgerModel.create([{
            account: senderAccount,
            accountHolder: senderUserAccount.accountHolder,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT",
        }], { session });

        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })();

        const creditLedgerEntry = await ledgerModel.create([{
            account: receiverAccount,
            accountHolder: receiverUserAccount.accountHolder,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT",
        }], { session });

        // transaction.status = "COMPLETED";
        // await transaction.save({ session });

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        );

        // Pura Transaction end hone ka baad, hum session ko end kar rahe hai.
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: "Transaction completed successfully",
            transaction: transaction
        })
    } catch (error) {
        await session.abortTransaction();
        // throw err;
        res.status(400).json({ message: "Transaction is Pending! due to some issue, Please try after sometime." });
    }
    finally {
        session.endSession();
    }


}

async function createInitialFundTransaction(req, res) {
    const { receiverAccount, amount, idempotencyKey } = req.body;

    if (!receiverAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "receiverAccount, amount and idempotencyKey are required!",
        });
    }

    const receiverUserAccount = await accountModel.findOne({
        _id: receiverAccount,
    });
    console.log("receiverUserAccount : ", receiverUserAccount);
    if (!receiverUserAccount) {
        return res.status(400).json({
            message: "Receiver's account not exists!",
        });
    }

    const senderUserAccount = await accountModel.findOne({
        user: req.user._id
    });
    console.log("Sender User Account : ", senderUserAccount);
    console.log("sender account debug : ", senderUserAccount?._id);

    // Check system user cannot send funds to itself.
    if (senderUserAccount._id.toString() === receiverUserAccount._id.toString()) {
        return res.status(400).json({
            message: "System user cannot send funds to itself!",
        });
    }

    if (!senderUserAccount) {
        return res.status(400).json({
            message: "System user account not found!",
        })
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = new transactionModel({
        senderAccount: senderUserAccount._id,
        senderAccountHolder: senderUserAccount.accountHolder,
        receiverAccount,
        receiverAccountHolder: receiverUserAccount.accountHolder,
        amount,
        idempotencyKey,
        status: "PENDING",
    });

    console.log("Transaction : ", transaction);

    const debitLedgerEntry = await ledgerModel.create([{
        account: senderUserAccount,
        accountHolder: senderUserAccount.accountHolder,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
    }], { session });

    const creditLedgerEntry = await ledgerModel.create([{
        account: receiverAccount,
        accountHolder: receiverUserAccount.accountHolder,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
    }], { session });

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
        message: "Initial Funds transaction completed successfully",
        transaction: transaction
    });
}



module.exports = { createTransaction, createInitialFundTransaction };