require("dotenv").config();

// Some Imports
const app = require("./src/app.js");
const PORT = process.env.PORT || 3000;
const connectDB = require("./src/config/db.js");


// Database Connection 
connectDB();


// Starting Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})