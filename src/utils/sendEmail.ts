import nodemailer from "nodemailer";
import { config } from "dotenv";

config();

export const sendOtpEmail = async ({ email, otpCode }: { email: string; otpCode: string; }) => {
    console.log("Sending OTP email...", otpCode);
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("Email credentials are not set in environment variables.");
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 25,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: '"No Reply" <noreply@cryptonexus.com>',
            to: email,
            replyTo: "noreply@cryptonexus.com",
            subject: 'OTP Verification',
            html: `
    <p>Hello,</p>
    <p>Thank you for registering with <strong>CryptoNexus.com</strong>.</p>
    <p>Your One-Time Password (OTP) for email verification is:</p>
    <h2 style="letter-spacing: 2px;">${otpCode}</h2>
    <p>This code is valid for 10 minutes. Please do not share it with anyone.</p>
    <p>If you did not initiate this request, please ignore this email.</p>
    <br>
    <p>Best regards,<br>
    CryptoNexus Team</p>
  `,
        };

        await transporter.sendMail(mailOptions);
        console.log("OTP email sent successfully.");
    } catch (error: any) {
        console.error("Failed to send OTP email:", error.message || error);
    }
};