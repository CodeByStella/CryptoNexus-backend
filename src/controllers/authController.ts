import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { generateToken, generateReferralCode } from '../utils/tokenUtils';
import generateUID from '@/utils/generateUID';

const ADMIN_EMAILS = ['samrawitgizachewu@gmail.com', 'okovtun747@gmail.com'];

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('Registration request body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, password, referralCode } = req.body || {};

    // Debug log
    console.log('Extracted data:', { email, phone: phone || '[NOT PROVIDED]', password: password ? '[REDACTED]' : undefined });

    if (!email && !phone) {
      return res.status(400).json({ message: 'Either email or phone number is required' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Sanitize phone: convert empty string to undefined
    const sanitizedPhone = phone && phone.trim() !== '' ? phone.trim() : undefined;

    // Check if user exists
    let existingUser = null;
    if (email) {
      existingUser = await User.findOne({ email });
    } else if (sanitizedPhone) {
      existingUser = await User.findOne({ phone: sanitizedPhone });
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const isAdmin = email && ADMIN_EMAILS.includes(email);
    const role = isAdmin ? 'admin' : 'user';

    // Handle referral code
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const newReferralCode = generateReferralCode();
    const uid = await generateUID();

    const user = await User.create({
      email,
      phone: sanitizedPhone, // Use sanitized phone
      uid,
      password,
      referralCode: newReferralCode,
      referredBy,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        uid: user.uid,
        email: user.email,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        isVerified: user.isVerified,
        token: generateToken(user),
      });
    } else {
      res.status(400).json({ message: 'Failed to create user' });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    const errorMessage = error.code === 11000 ? 'Duplicate key error' : 'Server error';
    res.status(500).json({ message: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('Login request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, identifier, password } = req.body || {};
    
    const loginIdentifier = identifier || email || phone;

    if (!loginIdentifier) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    let user = null;
    const isPhone = /^\d+$/.test(loginIdentifier);
    
    if (isPhone) {
      user = await User.findOne({ phone: loginIdentifier }).select('+password');
    } else {
      user = await User.findOne({ email: loginIdentifier }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      id: user._id.toString(), // Match frontend expectation (Assets.tsx uses 'id')
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance, // Include the balance array
      walletAddress: user.walletAddress,
      referralCode: user.referralCode,
      referredBy: user.referredBy?.toString(), // Convert ObjectId to string if present
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token: generateToken(user),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Authentication failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id.toString(), // Match frontend expectation (Assets.tsx uses 'id')
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance, // Include the balance array
      walletAddress: user.walletAddress,
      referralCode: user.referralCode,
      referredBy: user.referredBy?.toString(), // Convert ObjectId to string if present
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (req.body.walletAddress) {
      user.walletAddress = req.body.walletAddress;
    }
    
    if (req.body.password) {
      // Password hashing is handled in the model
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      uid: updatedUser.uid,
      email: updatedUser.email,
      phone: updatedUser.phone,
      walletAddress: updatedUser.walletAddress,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};