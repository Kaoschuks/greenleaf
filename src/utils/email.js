const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // or use 'smtp.mailtrap.io', 'smtp.sendgrid.net', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 * @param {string} text - Plain text version (optional)
 * @returns {Promise} - Returns promise that resolves when email is sent
 */
async function sendEmail(to, subject, html, text = null) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Greenleaf" <no-reply@greenleaf.com>',
            to,
            subject,
            html,
            text: text || html // Plain text fallback
        });
        
        console.log('Email sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a welcome email to a new user
 */
async function sendWelcomeEmail(user) {
    const subject = 'Welcome to Greenleaf!';
    const html = `
        <h1>Welcome, ${user.first_name}!</h1>
        <p>Thank you for joining Greenleaf. We're excited to have you on board!</p>
        <p>Best regards,<br>The Greenleaf Team</p>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send a policy confirmation email
 */
async function sendPolicyConfirmationEmail(user, policy) {
    const subject = 'Policy Created Successfully';
    const html = `
        <h1>Policy Confirmation</h1>
        <p>Dear ${user.first_name},</p>
        <p>Your policy has been created successfully!</p>
        <h2>Policy Details:</h2>
        <ul>
            <li><strong>Policy Name:</strong> ${policy.the_name}</li>
            <li><strong>Provider:</strong> ${policy.provider_name}</li>
            <li><strong>Cost:</strong> $${policy.cost}</li>
            <li><strong>Frequency:</strong> ${policy.frequency}</li>
            <li><strong>Status:</strong> ${policy.the_status}</li>
        </ul>
        <p>Best regards,<br>The Greenleaf Team</p>
    `;
    return sendEmail(user.email, subject, html);
}

/**
 * Send a payment confirmation email
 */
async function sendPaymentConfirmationEmail(user, transaction, policy = null) {
    const subject = 'Payment Confirmation';
    let html = `
        <h1>Payment Confirmation</h1>
        <p>Dear ${user.first_name},</p>
        <p>Your payment has been processed successfully!</p>
        <h2>Transaction Details:</h2>
        <ul>
            <li><strong>Amount:</strong> $${transaction.amount}</li>
            <li><strong>Type:</strong> ${transaction.type}</li>
            <li><strong>Description:</strong> ${transaction.description || 'N/A'}</li>
            <li><strong>Date:</strong> ${new Date(transaction.created_at).toLocaleString()}</li>
        </ul>
    `;
    
    if (policy) {
        html += `
            <h2>Policy Details:</h2>
            <ul>
                <li><strong>Policy Name:</strong> ${policy.the_name}</li>
                <li><strong>Provider:</strong> ${policy.provider_name}</li>
            </ul>
        `;
    }
    
    html += `<p>Best regards,<br>The Greenleaf Team</p>`;
    return sendEmail(user.email, subject, html);
}

/**
 * Send a password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
        <h1>Password Reset Request</h1>
        <p>Dear ${user.first_name},</p>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Greenleaf Team</p>
    `;
    return sendEmail(user.email, subject, html);
}

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendPolicyConfirmationEmail,
    sendPaymentConfirmationEmail,
    sendPasswordResetEmail
};
