import express from 'express';
import { createTrade, getUserTrades } from '../controllers/tradeController';

const router = express.Router();

router.post('/trade', createTrade);
router.get('/trades', getUserTrades);

export default router;