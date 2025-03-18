import { Router } from 'express';
import authRoutes from './authRoutes';
import depositRoutes from './depositRoutes';
import { protect } from '@/middlewares/authMiddleware';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';
import messageRoutes from "./messageRoutes"

const router = Router();

router.use('/auth', authRoutes);
router.use('/', protect, depositRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', messageRoutes);

export default router;

