import express from 'express';
import {
  requestWithdrawal,
  setWithdrawalPassword,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getPendingSeconds,
  approveSeconds,
  rejectSeconds,
} from '@/controllers/withdrawalController';
import { admin } from '@/middlewares/authMiddleware';

const router = express.Router();

// User routes
router.post('/withdraw', requestWithdrawal);
router.post('/set-withdrawal-password', setWithdrawalPassword);

// Admin routes
router.get('/admin/withdrawals', admin, getPendingWithdrawals);
router.post('/admin/withdrawals/:id/approve', admin, approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', admin, rejectWithdrawal);
// router.get('/admin/seconds', admin, getPendingSeconds);
// router.post('/admin/seconds/:id/approve', admin, approveSeconds);
// router.post('/admin/seconds/:id/reject', admin, rejectSeconds);

export default router;