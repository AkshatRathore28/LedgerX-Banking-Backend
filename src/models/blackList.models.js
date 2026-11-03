const mongoose = require("mongoose");

const tokenBlackListSchema = new mongoose.Schema({
    token: {
        type: String,
        require: [true, "Token is required to blacklist."],
        unique: [true, "Token is already blacklisted."]
    },
}, { timestamps: true });

tokenBlackListSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days
});

const tokenBlackListModel = mongoose.model("tokenBlackList", tokenBlackListSchema);

module.exports = tokenBlackListModel;