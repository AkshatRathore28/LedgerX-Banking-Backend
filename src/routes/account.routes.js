const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware.js");
const accountController = require("../controllers/account.controller.js");
const router = express.Router();

/**
 * - POST /api/accounts/
 * - Create a new account
*/
router.post("/createAccount", authMiddleware.authMiddleware, accountController.createAccountController);
router.get("/getUserAccounts", authMiddleware.authMiddleware, accountController.getUserAccountController);
router.get("/fetchBalance", authMiddleware.authMiddleware, accountController.fetchAccountBalanceController);
router.delete("/closeAccount/:accountNumber", authMiddleware.authMiddleware, accountController.closeAccountController);

// Account Close Request
router.post("/:id/close-request", authMiddleware.authMiddleware, accountController.accountCloseRequestController);

// Account Close Request Cancelled
router.patch("/account-close-request/:id/cancle", authMiddleware.authMiddleware, accountController.cancleAccountCloseRequestController);



module.exports = router;