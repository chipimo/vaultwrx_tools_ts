import express from 'express';
import { onRequestGenerateStatements } from '../statements';

const router = express.Router();

router.post<{}, any>('/', async (req, res) => {
  const response =  await onRequestGenerateStatements(req.body);
  res.json(response);
});

export default router;
