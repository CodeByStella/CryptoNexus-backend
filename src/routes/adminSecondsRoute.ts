import { Router } from 'express';
import { getPendingSecondsRequests, approveSecondsRequest, rejectSecondsRequest } from '@/controllers/adminSecondsController';
import { admin } from '@/middlewares/authMiddleware';


const router = Router();

router.get('/seconds', getPendingSecondsRequests);
router.post('/seconds/:id/approve', approveSecondsRequest);
router.post('/seconds/:id/reject', rejectSecondsRequest);

export default router;