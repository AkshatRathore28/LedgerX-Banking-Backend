const userModel = require("../models/user.model.js");
const accountModel = require("../models/account.model.js");
const refreshTokenModel = require("../models/refreshToken.model.js");
const transactionModel = require("../models/transaction.model.js");
const profileImageModel = require("../models/profileImage.model.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { uploadFile } = require("../services/imageStorage.service.js");

async function userInfoController(req, res) {
    const userId = req.user;
    if (!userId) {
        return res.status(400).json({ message: "UserId is required!" });
    }

    const user = await userModel.findById({ _id: userId._id }).select("_id email name");

    if (!user) {
        return res.status(400).json({ message: "User Not Found!" });
    }

    return res.status(200).json({
        message: "User Data",
        user
    })


}

async function updateUserInfoController(req, res) {
    const userId = req.user._id;
    const { name } = req.body;
    const allowedFields = ["name"];

    try {
        const user = await userModel.findById({ _id: userId });
        if (!user) {
            return res.status(400).json({
                message: "User not found!",
            });
        }
        allowedFields.forEach(field => {
            if (req.body[field] === undefined) {
                console.log(`${allowedFields} is required!`);
                return res.status(400).json({
                    message: `${allowedFields} is required!`,
                });
            }
        });

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field]
            }
        });

        await user.save();

        return res.status(200).json({
            message: "User information updated successfully",
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }

}

async function changeUserEmailController(req, res) {
    const userId = req.user._id;
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
        return res.status(400).json({ message: "New Email and password is Required..." });
    }

    const user = await userModel.findById({ _id: userId }).select("_id email password");
    if (!user) {
        return res.status(400).json({ message: "User Not Found!" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.status(400).json({
            message: "Current Email Password is Incorrect!",
        })
    }

    const isPendingEmailExists = await userModel.findOne({ email: newEmail });
    if (isPendingEmailExists) {
        return res.status(400).json({ message: "Email Already Exists.. Try with other email.." });
    };

    // Generate EmailChangeToken
    const emailChangeToken = crypto.randomBytes(32).toString("hex");
    const hashEmailChangeToken = crypto
        .createHash("sha256")
        .update(emailChangeToken)
        .digest("hex");

    user.isEmailVerified = false;
    user.pendingEmail = newEmail;
    user.emailChangeToken = hashEmailChangeToken;
    user.emailChangeTokenExpires = Date.now() + 15 * 60 * 1000; // 15 Minutes Valid
    await user.save()


    return res.status(200).json({
        message: "New Email Updated Successfully, Please Verify new email first..",
        emailChangeToken
    });
}

async function verifyEmailChangeController(req, res) {
    const emailChangeToken = req.query.emailChangeToken;

    if (!emailChangeToken) {
        return res.status(400).json({
            message: "Email Change Token is required to verify new email",
        });
    }

    const hashEmailChangeToken = crypto
        .createHash("sha256")
        .update(emailChangeToken)
        .digest("hex");


    const user = await userModel.findOne({
        emailChangeToken: hashEmailChangeToken,
        emailChangeTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({
            message: "Token Invalid or Expires.",
        });
    }

    user.isEmailVerified = true;
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeToken = undefined;
    user.emailChangeTokenExpires = undefined;
    await user.save();

    return res.status(200).json({
        message: "New Email verify successfully",
    });
}

async function deleteUserController(req, res) {
    const userId = req.user._id;

    if (!userId) {
        return res.status(400).json({ message: "UserId is Required to delete an user!" });
    }

    // Find User
    const user = await userModel.findById({ _id: userId });

    // Check User Exists or not
    if (!user) {
        return res.status(400).json({ message: "User Not Found!" });
    }

    // Find User Account
    const userAccount = await accountModel.find({
        user: user._id,
    });

    // check Account Exist or not
    if (userAccount.length < 1) {
        return res.status(400).json({
            message: "User do not have any account..",
        });
    }

    // Check User all Account have zero balance.
    const hasBalance = userAccount.some(account => account.balance > 0);
    if (hasBalance) {
        return res.status("Please transfer or withdraw funds from all your accounts before deleting you profile.");
    }

    // Delete Accounts 
    await accountModel.deleteMany({ user: user._id });

    // Delete Refresh Token
    await refreshTokenModel.deleteMany({ user: user._id });

    // clear cookies 
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    // Delete User
    await userModel.findByIdAndDelete({ _id: user._id });
    return res.status(200).json({
        message: "User Deleted Successfully",
    });
}

async function userDetailsController(req, res) {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({
            message: "User Id is required to get user's Details.",
        });
    }

    const user = await userModel.findById({ _id: userId }).select("name email isEmailVerified");
    if (!user) {
        return res.status(400).json({
            message: "User not found!",
        });
    }

    const userAccounts = await accountModel.find({ user: user._id });
    // console.log(userAccounts);

    const accountData = await Promise.all(
        userAccounts.map(async (account) => ({
            accountNumber: account._id.toString(),
            balance: await account.getBalance(),
            status: account.status,
            accountType: account.accountType
        }))
    )

    return res.status(200).json({
        message: "User Details",
        data: {
            user,
            accounts: accountData,
        },

    });
}

async function userTransactionsController(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({
            message: "UserId is required to fetch transactions."
        });
    }

    const user = await userModel
        .findById(userId)
        .select("name email");

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    const accounts = await accountModel
        .find({ user: userId })
        .select("_id");

    const accountIds = accounts.map(account => account._id);

    const transactions = await transactionModel.find({
        $or: [
            { senderAccount: { $in: accountIds } },
            { receiverAccount: { $in: accountIds } }
        ]
    }).select("-idempotencyKey -__v");
    // console.log(transactions);
    if (!transactions) {
        return res.status(400).json({
            message: "No Transaction Found!",
        });
    }
    const response = [];

    accountIds.forEach((account, index) => {
        const accountTransactions = transactions.filter(
            transaction =>
                transaction.senderAccount.toString() === account._id.toString() ||
                transaction.receiverAccount.toString() === account._id.toString()
        );

        response.push({
            [`account-${index + 1}`]: {
                accountNumber: account._id,
                accountType: account.accountType,
                balance: account.balance,
                transactions: accountTransactions
            }
        });
    });

    // const data = 

    return res.status(200).json({
        message: "Transactions....",
        user,
        response
    })
}

async function uploadUserProfileImageController(req, res) {
    const image = req.file;
    const result = await uploadFile(image.buffer.toString("base64"));
    const profileImage = await profileImageModel.create({
        uri: result.url,
        user: req.user._id,
    });

    res.status(200).json({
        message: "User profile image uploaded successfully",
        profileImage: {
            id: profileImage._id,
            uri: profileImage.uri,
            user: {
                _id: profileImage.user,
                name: req.user.name,
            },
        }
    })
}

module.exports = {
    userInfoController,
    updateUserInfoController,
    changeUserEmailController,
    verifyEmailChangeController,
    deleteUserController,
    userDetailsController,
    userTransactionsController,
    uploadUserProfileImageController,
}