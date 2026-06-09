import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { warehouses } from '../db/schema/warehouses';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/warehouses
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({ id: warehouses.id, name: warehouses.name, code: warehouses.code, description: warehouses.description })
      .from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(warehouses.name);
    res.json({ success: true, warehouses: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/warehouses — admin only
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' }); return;
  }
  const { name, code, description } = req.body;
  if (!name || !code) {
    res.status(422).json({ success: false, message: 'name and code are required' }); return;
  }
  try {
    const [row] = await db.insert(warehouses).values({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
    }).returning();
    res.status(201).json({ success: true, warehouse: row });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique')) {
      res.status(422).json({ success: false, message: 'Warehouse name or code already exists' }); return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
