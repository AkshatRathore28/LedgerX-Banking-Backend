const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware.js");
const userController = require("../controllers/user.controller.js");
const multer = require("multer");
const userRouters = Router();

const upload = multer({
    storage: multer.memoryStorage()
})

// User's APIs
userRouters.get("/user-info", authMiddleware.authMiddleware, userController.userInfoController);
userRouters.patch("/update-user-info", authMiddleware.authMiddleware, userController.updateUserInfoController);
userRouters.post("/change-user-email", authMiddleware.authMiddleware, userController.changeUserEmailController);
userRouters.get("/verify-email-change", authMiddleware.authMiddleware, userController.verifyEmailChangeController);
userRouters.delete("/me", authMiddleware.authMiddleware, userController.deleteUserController);
userRouters.post("/upload-profile-image", authMiddleware.authMiddleware, upload.single("image"), userController.uploadUserProfileImageController)

// Admin  APIs
userRouters.get("/", authMiddleware.authMiddlewareForSystemUser, userController.userDetailsController);
userRouters.get("/userTransactions", authMiddleware.authMiddlewareForSystemUser, userController.userTransactionsController);

module.exports = userRouters;