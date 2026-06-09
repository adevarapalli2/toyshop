import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import productsRouter from './routes/products';
import inventoryRouter from './routes/inventoryRoutes';
import customersRouter from './routes/customers';
import ordersRouter from './routes/ordersRoutes';
import shipmentsRouter from './routes/shipmentsRoutes';
import reportsRouter from './routes/reportsRoutes';
import warehouseRouter from './routes/warehouseRoutes';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors({ origin: 'http://localhost:3002', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', project: 'ToyShop WMS' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/warehouses', warehouseRouter);

app.listen(PORT, () => {
  console.log(`ToyShop WMS backend running on http://localhost:${PORT}`);
});

export default app;
