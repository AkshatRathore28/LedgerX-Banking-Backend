const { ImageKit } = require("@imagekit/nodejs");

const imageKitClient = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

async function uploadFile(file) {
    const result = await imageKitClient.files.upload({
        file,
        fileName: "profileImage_" + Date.now(),
        folder: "BankingSystem/userProfileImage"
    });
    return result;
}

module.exports = { uploadFile };