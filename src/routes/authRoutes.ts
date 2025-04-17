import express, { RequestHandler } from 'express';
import { check, validationResult } from 'express-validator';
import { register, login, getProfile, verifyOtp, resendOtp } from '../controllers/authController';
import { protect } from '@/middlewares/authMiddleware';

const router = express.Router();

const registerValidation = [
  check('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format'),
  check('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone('any').withMessage('Invalid phone number'),
  check('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  })
];

const loginValidation = [
  check('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format'),
  check('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone('any').withMessage('Invalid phone number'),
  check('password')
    .notEmpty().withMessage('Password is required'),
  check().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  })
];

router.post('/register', registerValidation, register as RequestHandler);
router.post('/login', loginValidation, login as RequestHandler);
router.get('/profile', protect, getProfile as RequestHandler);
router.post('/verify-otp', verifyOtp as RequestHandler);
router.post('/resend-otp', resendOtp as RequestHandler);

export default router;