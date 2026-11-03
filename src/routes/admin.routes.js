const { Router } = require("express");
const adminRouters = Router();
const authMiddleware = require("../middlewares/auth.middleware.js");
const adminController = require("../controllers/admin.controller.js");

// Users 
adminRouters.get("/accounts", authMiddleware.authMiddlewareForSystemUser, adminController.getUserAccounts);
adminRouters.patch("/:id/freeze", authMiddleware.authMiddlewareForSystemUser, adminController.freezeUserAccount);
adminRouters.patch("/:id/unfreeze", authMiddleware.authMiddlewareForSystemUser, adminController.unfreezeUserAccount)

// Account
adminRouters.patch("/account-close-request/:id/approve", authMiddleware.authMiddlewareForSystemUser, adminController.approvedAccountCloseRequestController);
adminRouters.patch("/account-close-request/:id/reject", authMiddleware.authMiddlewareForSystemUser, adminController.rejectedAccountCloseRequestController);

module.exports = adminRouters;