const nodemailer = require("nodemailer");

/**
* - Google ke SMTP server se interact karne ke liye hume createTransport create karna padta hai. 
* - jab bhi mere server ko kis bhi email address per, mera server transporter ka use karta hai SMTP se communicate karne ke liye.
*/
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    }
});

/**
* - Verify the connection configuration
*/
transporter.verify((error, success) => {
    if (error) {
        console.error("Error connecting to email server: ", error);
    } else {
        console.log('Email server is ready to send messages');
    }
});


/**
* - 
*/
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"BankingSystem" <${process.env.EMAIL_USER}>`, // Sender Address
            to, // list of receivers
            subject, // subject line
            text, // plain text body
            html, // html body
        });

        console.log("Message send: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Error sending email : ", error);
    }
}

async function sendRegistrationEmail(userEmail, name) {
    const subject = "Welcome to BankingSystem";
    const text = `Hello ${name}, \n\nThank you for registering at BankingSystem. We're excited to have you on board!\n\nBest regards,\nThe BankingSystem Team`;

    const html = `<p>Hello ${name},</p><p>Thank you for registering at BankingSystem. We're excited to have you on board!</p><p>Best regards,<br>The BankingSystem Team</p>`;
    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    const subject = "Transaction Notification";
    const text = `Hello ${name}, \n\nA transaction of amount ${amount} has been made to account ${toAccount}. \n\nBest regards,\nThe BankingSystem Team`;
    const html = `<p>Hello ${name},</p><p>A transaction of amount ${amount} has been made to account ${toAccount}.</p><p>Best regards,<br>The BankingSystem Team</p>`;
    await sendEmail(userEmail, subject, text, html);

}

async function sendTransactionFailedEmail(userEmail, name, amount, toAccount) {
    const subject = "Transaction Failed";
    const text = `Hello ${name}, \n\nA transaction of amount ${amount} to account ${toAccount} has failed.\n\nBest regards,\nThe BankingSystem Team`;
    const html = `<p>Hello ${name},</p><p>A transaction of amount ${amount} to account ${toAccount} has failed.</p><p>Best regards,<br>The BankingSystem Team</p>`;
    await sendEmail(userEmail, subject, text, html);
}



module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailedEmail
};
