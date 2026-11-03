const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");

router.post("/register", authController.userRegisterController);
router.post("/login", authController.userLoginController);
router.post("/logout", authController.userLogoutController);
router.post("/refresh-token", authController.refreshTokenController);
router.post("/forgot-password", authController.forgotPasswordController);
router.post("/reset-password", authController.resetPasswordController);
router.post("/change-password", authMiddleware.authMiddleware, authController.changePasswordController);
router.post("/verify-email", authController.verifyEmailController);
router.post("/resend-verify-email", authController.resendVerifyEmailController);

module.exports = router;
