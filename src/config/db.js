const mongoose = require("mongoose");

async function connectDB() {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("Database Connected Successfully");
        })
        .catch((err) => {
            console.log("Error Connecting to Database : ", err);
            process.exit(1);
        })
}

module.exports = connectDB;