const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.models.js");


async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized access - No tokan available" });
    }
    const isBlackListed = await tokenBlackListModel.findOne({ token });
    if (isBlackListed) {
        return res.status(400).json({
            message: "Unauthorized Access! Token is invalid.",
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await userModel.findById(decoded.userId);
        // console.log(user);
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized Access - Invalid token",
        })
    }
}

async function authMiddlewareForSystemUser(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized Access! No token Available.",
        });
    }

    const isBlackListed = await tokenBlackListModel.findOne({ token });
    if (isBlackListed) {
        return res.status(400).json({
            message: "Unauthorized Access! Token is invalid.",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await userModel.findById(decoded.userId).populate("systemUser");

        if (!user.systemUser) {
            return res.status(401).json({
                message: "Access Denied! Not a system user.",
            });
        }
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized Access! Invalid Token.",
        });
    }
}

module.exports = { authMiddleware, authMiddlewareForSystemUser };