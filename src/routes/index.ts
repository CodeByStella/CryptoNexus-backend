import { Router } from 'express';
import authRoutes from './authRoutes';
import depositRoutes from './depositRoutes';
import { protect } from '@/middlewares/authMiddleware';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';
import messageRoutes from "./messageRoutes";
import withdrawRoutes from "./withdrawRoute";
import secondsRoute from "./secondsRoute";
import adminSecondsRoutes from "./adminSecondsRoute"

const router = Router();

router.use('/auth', authRoutes);
router.use('/', protect, secondsRoute);
router.use('/', protect, depositRoutes);
router.use("/", protect, withdrawRoutes)
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', adminSecondsRoutes);
router.use('/admin', messageRoutes);

export default router;

