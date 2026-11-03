const mongoose = require("mongoose");

const profileImageSchema = new mongoose.Schema({
    uri: {
        type: String,
        required: [true, "Uri is required to upload image."],
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "User Id is required to upload Image."],
    },
});

const profileImageModel = mongoose.model("profileImage", profileImageSchema);
module.exports = profileImageModel;