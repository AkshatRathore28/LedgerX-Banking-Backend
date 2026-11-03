const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware.js");
const transactionController = require("../controllers/transaction.controller.js");
const transactionRoutes = Router();

/**
 * - POST /api/transaction
 * - Create a new Transaction
 *  */

transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);
transactionRoutes.post("/system/initial-fund", authMiddleware.authMiddlewareForSystemUser, transactionController.createInitialFundTransaction);


module.exports = transactionRoutes;