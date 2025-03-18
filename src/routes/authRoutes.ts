import express from 'express';
import { check, validationResult } from 'express-validator';
import { register, login, getProfile } from '../controllers/authController';
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

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', protect, getProfile)

export default router;