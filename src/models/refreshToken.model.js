const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const refreshTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user", // Agar model "User" hai to "User" likhna
            required: [true, "User is required."],
            index: true,
        },

        refreshToken: {
            type: String, // Hashed Refresh Token
            required: [true, "Refresh token is required."],
        },

        expiresAt: {
            type: Date,
            required: [true, "Expiry date is required."],
        },
        isRevoked: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

// TTL Index
refreshTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

// Compare Refresh Token
refreshTokenSchema.methods.compareRefreshToken = async function (refreshToken) {
    return await bcrypt.compare(refreshToken, this.refreshToken);
};

const refreshTokenModel = mongoose.model(
    "refreshToken",
    refreshTokenSchema
);

module.exports = refreshTokenModel;