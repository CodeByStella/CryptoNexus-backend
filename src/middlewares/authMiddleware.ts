import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface IJwtPayload {
  id: string;
}

export const protect = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<any> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log(token)

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
      ) as IJwtPayload;

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const isVerified = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({ message: 'Account not verified. Please complete verification.' });
  }
};