const express = require("express");
const cookieParser = require("cookie-parser");

/**
 * Routes Required 
 */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes.js");
const transactionRoutes = require("./routes/transaction.routes.js");
const userRouter = require("../src/routes/user.routes.js");
const adminRouters = require("../src/routes/admin.routes.js");

const app = express();

// Middlewares

app.use(express.json()); // server json data direct read nhi kar sakta, isliye hun ye middleware use karte hai taki express ka server json data read kar sake.

app.use(cookieParser()); // cookieParser token ko browser ke cookie storage mai save karne ke kaam aati hai.

/**
* User Routes 
*/
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);


/**
 * Admin Routes
*/
app.use("/api/admin", adminRouters);

module.exports = app;