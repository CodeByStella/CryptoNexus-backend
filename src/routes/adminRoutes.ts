import express from 'express';
import { getAllTrades, processTrade } from '../controllers/tradeController';
import { getDepositAddresses, updateDepositAddress, createDepositAddress } from '../controllers/depositAddressController';
import { getAllUsers, updateUserBalance, updateCanWinSeconds } from '@/controllers/adminUsers'; 
import { Router } from 'express';

const router = Router();

router.get('/trades', getAllTrades);
router.put('/trades/:id/process', processTrade);

router.get('/deposit-addresses', getDepositAddresses);
router.put('/deposit-addresses/:id', updateDepositAddress);
router.post('/deposit-addresses', createDepositAddress);

router.get("/users", getAllUsers);
router.patch("/users/:id/balance", updateUserBalance);
router.patch("/users/:id/can-win-seconds", updateCanWinSeconds);

export default router;