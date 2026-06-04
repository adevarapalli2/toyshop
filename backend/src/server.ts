import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors({ origin: 'http://localhost:3002', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', project: 'ToyShop WMS' }));
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`ToyShop WMS backend running on http://localhost:${PORT}`);
});

export default app;
