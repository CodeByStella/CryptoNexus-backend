import { body } from 'express-validator';

export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('walletAddress').optional().isString().withMessage('Wallet address must be a string'),
  body('referralCode').optional().isString().withMessage('Referral code must be a string')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required')
];

export const updateProfileValidation = [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('walletAddress').optional().isString().withMessage('Wallet address must be a string'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];
