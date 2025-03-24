import { Router } from 'express';
import { requestSeconds } from '@/controllers/secondsController';
import { handleTimeout } from '@/controllers/secondsController';

const router = Router();

router.post('/request-seconds', requestSeconds);
router.post('/seconds/:id/timeout', handleTimeout);

export default router;