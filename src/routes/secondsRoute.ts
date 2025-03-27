import { Router } from 'express';
import { requestSeconds } from '@/controllers/secondsController';
import { handleTimeout, getSecondsRequest } from '@/controllers/secondsController';

const router = Router();

router.post('/request-seconds', requestSeconds);
router.get('/seconds-request/:id', getSecondsRequest);
router.post('/seconds/:id/timeout', handleTimeout);

export default router;