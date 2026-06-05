import { Router, Response } from 'express';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { customers } from '../db/schema/customers';
import { orders } from '../db/schema/orders';
import { authenticate, AuthRequest } from '../middleware/auth';
import { managerOrAdmin } from '../middleware/managerOrAdmin';

const router = Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  try {
    const rows = await db.select().from(customers)
      .where(search ? or(ilike(customers.name, `%${search}%`), ilike(customers.email, `%${search}%`)) : undefined)
      .orderBy(customers.name);
    res.json({ success: true, data: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/customers
router.post('/', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, address, city, state, pincode } = req.body;
  if (!name) { res.status(422).json({ success: false, message: 'Name is required' }); return; }
  try {
    const [c] = await db.insert(customers).values({ name, email, phone, address, city, state, pincode }).returning();
    res.status(201).json({ success: true, customer: c });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/customers/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) { res.status(404).json({ success: false, message: 'Customer not found' }); return; }
    const recentOrders = await db.select({
      id: orders.id, orderNumber: orders.orderNumber, status: orders.status,
      totalAmount: orders.totalAmount, createdAt: orders.createdAt,
    }).from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)).limit(10);
    res.json({ success: true, customer, orders: recentOrders });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
