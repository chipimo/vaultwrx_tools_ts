import express from 'express';
import statements from './statement';

const router = express.Router();

router.use('/statements', statements);

export default router;
