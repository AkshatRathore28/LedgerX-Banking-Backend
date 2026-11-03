const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
const bcrypt = require("bcryptjs");

// User's Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [
            true,
            "Email is required for creating an account",
        ],
        unique: [
            true,
            "Email already exist"
        ],
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            "Invalid email address"
        ]
    },
    pendingEmail: {
        type: String,
        unique: [
            true,
            "Email already exist"
        ],
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            "Invalid email address"
        ]
    },
    name: {
        type: String,
        required: [
            true,
            "Name is required"
        ],
        trim: true,

    },
    password: {
        type: String,
        required: [
            true,
            "Password is required for creating an account",
        ],
        minlength: [6, "Password should be contain minimum 6 characters"],
        select: false
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false,
    },
    passwordResetToken: {
        type: String,
        default: null,
    },
    passwordResetExpires: {
        type: Date,
        default: null,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        default: null,
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
    },
    emailChangeToken: {
        type: String,
        default: null
    },
    emailChangeTokenExpires: {
        type: Date,
        default: null
    },
}, {
    timestamps: true
})

// jab bhi user ke schema ko save karoge, tab usse pahele ye function chalega.
userSchema.pre("save", async function () {
    // agar user password save hua hoga to usse "hash" mai convert karke save karna hoga.

    // if password is not change/modified/update
    if (!this.isModified("password")) {
        return;
    }

    // if password is change/modified/update
    const hash = await bcrypt.hash(this.password, 10); // Password ko convert kiya hash mai
    this.password = hash; // hash mai convert karne ke baad usse save kardiya password mai.
    return;
})

// ye method password ko compare karti hai user give password se login ke time per use hoti hai.
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password); // bcrypt.compare function true return kara hai agar password sahi hai to nhi to false return karta hai.
}

// User's Model -> Schema name is : user
const userModel = mongoose.model("user", userSchema);

module.exports = userModel;