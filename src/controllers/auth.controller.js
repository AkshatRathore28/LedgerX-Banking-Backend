const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const emailService = require("../services/email.service.js");
const tokenBlackListModel = require("../models/blackList.models.js");
const refreshTokenModel = require("../models/refreshToken.model.js");
const { accessTokenOptions, refreshTokenOptions } = require("../utils/cookieOptions.util.js");
const crypto = require("crypto");
/** 
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    const { email, name, password } = req.body;
    const isExist = await userModel.findOne({ email });
    if (isExist) {
        return res.status(422).json({
            message: "User already exist with this email",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email: email,
        name: name,
        password: password
    });

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    console.log("HashVerificationToken : ", hashVerificationToken);

    user.emailVerificationToken = hashVerificationToken;
    user.emailVerificationExpires = Date.now() + 60 * 60 * 24 * 1000;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2d" });
    res.cookie("token", token);

    // Final Response
    res.status(201).json({
        message: "User Register Successfully",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        },
        token,
        verificationToken,
    });

    await emailService.sendRegistrationEmail(user.email, user.name);
}

/**
* - User Login Controller
* - POST /api/auth/login
*/
async function userLoginController(req, res) {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select("password isEmailVerified");
    if (!user) {
        return res.status(401).json({ message: "Invalid Credentials" });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid Credentials" });
    }

    if (!user.isEmailVerified) {
        return res.status(400).json({
            message: "Please verify email before logging in.",
        });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
    });

    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "30d" });
    const bcryptRefreshToken = await bcrypt.hash(refreshToken, 10);
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await refreshTokenModel.create({
        user: user._id,
        refreshToken: bcryptRefreshToken,
        expiresAt: expiresAt,
    });

    res.status(200).json({
        message: "User logged In successfully",
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        },
        token,
        refreshToken
    })

}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
*/
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(400).json({
            message: "You are already Logout!",
        });
    }

    await tokenBlackListModel.create({
        token: token,
    });

    res.clearCookie("token");

    res.status(200).json({
        message: "User logged out successfully",
    })
}

/**
 * - RefreshTokenController
 * - POST /api/auth/refreshToken*/
async function refreshTokenController(req, res) {
    try {
        // Get refresh token from cookies
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Unauthorized! Refresh token is required.",
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_SECRET_KEY
        );

        // Find stored refresh token
        const tokenDoc = await refreshTokenModel.findOne({
            user: decoded.userId,
            isRevoked: false,
        });

        if (!tokenDoc) {
            return res.status(401).json({
                message: "Refresh token not found.",
            });
        }

        // Compare refresh token with hashed token stored in DB
        const isMatch = await tokenDoc.compareRefreshToken(refreshToken);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid refresh token.",
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { userId: decoded.userId },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "15m" }
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
            { userId: decoded.userId },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30d" }
        );

        // Hash refresh token before storing
        tokenDoc.refreshToken = await bcrypt.hash(newRefreshToken, 10);

        // Update expiry date
        tokenDoc.expiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        await tokenDoc.save();

        // Update cookies
        res.cookie("accessToken", accessToken, accessTokenOptions);
        res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);

        return res.status(200).json({
            message: "Token refreshed successfully.",
        });

    } catch (error) {
        console.log(error);
        return res.status(401).json({
            message: "Invalid or expired refresh token.",
        });
    }
}

async function forgotPasswordController(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(401).json({
                message: "Email required!",
            });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User Not Found!",
            });
        }

        // Generate Random Token
        const resetToken = crypto.randomBytes(32).toString("hex");


        // Hash Token before saving,
        const hashToken = crypto
            .createHash("sha256") // sha256 ek hashing algorithm hai
            .update(resetToken) // Hashing function ko input deta hai.
            .digest("hex") // Ye final Hash value return karta hai wo bhi hexadecimal mai.


        // Database mai update karo.
        user.passwordResetToken = hashToken;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // ye 15min. ke liye reset token generate karega.

        // Changes DB mai save karna.
        await user.save();

        return res.status(200).json({
            message: "If the email exists, a password reset link has been sent.",
            user: user.email,
            resetToken: resetToken
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
}

async function resetPasswordController(req, res) {
    try {
        const resetToken = req.query.token;
        const { newPassword } = req.body;

        // Check resetToken and newPassword got or not.
        if (!resetToken || !newPassword) {
            return res.status(401).json({
                message: "resetToken and newPassword is required for reset password.",
            });
        }

        // Convert resetToken into hashResetToken
        const hashResetToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const user = await userModel.findOne({
            passwordResetToken: hashResetToken,
            passwordResetExpires: { $gt: Date.now() }, // Check PasswordResetExpire is Valid for more that current time.
        });

        // Check user find or not.
        if (!user) {
            return res.status(400).json({
                message: "No reset token found!",
            });
        }

        // Updating User password.
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return res.status(200).json({
            message: "User Password Updated Successfully",
            user
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
}

async function changePasswordController(req, res) {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Current Password, New Password and Confirm Password is required!",
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: "Current Password and New Password should not be same!",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New Password and Confirm Password should be same!",
            });
        }

        const user = await userModel.findById({ _id: userId }).select("password");
        console.log(user);

        if (!user) {
            return res.status(400).json({
                message: "User not found!",
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            message: "Password Updated Successfully",
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
}

async function verifyEmailController(req, res) {
    try {
        const verificationToken = req.query.verificationToken;

        if (!verificationToken) {
            return res.status(400).json({
                message: "Verification token not found!",
            });
        }

        const hashVerificationToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const user = await userModel.findOne({
            emailVerificationToken: hashVerificationToken,
            emailVerificationExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or Expired verification token!",
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        return res.status(200).json({
            message: "Email Verification Successfully"
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }

}

async function resendVerifyEmailController(req, res) {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({
            message: "Id not received.",
        });
    }

    const user = await userModel.findById({ _id: id });

    if (!user) {
        return res.status(400).json({
            message: "User not found!",
        });
    }

    if (!user.isEmailVerified) {
        return res.status(200).json({
            message: "Email already verified.",
        });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    user.emailVerificationToken = hashVerificationToken;
    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    return res.status(200).json({
        message: "Email Verification Link, is Resend on given email.",
        verificationToken
    });

}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    refreshTokenController,
    forgotPasswordController,
    resetPasswordController,
    changePasswordController,
    verifyEmailController,
    resendVerifyEmailController,
};