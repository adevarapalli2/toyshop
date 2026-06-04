import { Router, Response } from 'express';
import { eq, ilike, or, count, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../db/index';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();
router.use(authenticate, adminOnly);

// GET /api/users  — list with optional search & role filter
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        sql`(
          ${search ? sql`(${ilike(users.name, `%${search}%`)} OR ${ilike(users.email, `%${search}%`)})` : sql`true`}
          AND ${role ? eq(users.role, role) : sql`true`}
          AND ${status === 'active' ? eq(users.isActive, true) : status === 'inactive' ? eq(users.isActive, false) : sql`true`}
        )`
      )
      .orderBy(users.createdAt);

    // summary counts
    const [totals] = await db
      .select({
        total: count(),
        active: sql<number>`sum(case when is_active then 1 else 0 end)`,
        admin: sql<number>`sum(case when role='admin' then 1 else 0 end)`,
        manager: sql<number>`sum(case when role='manager' then 1 else 0 end)`,
        staff: sql<number>`sum(case when role='staff' then 1 else 0 end)`,
      })
      .from(users);

    res.json({ success: true, data: rows, summary: totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/users  — create user
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password || !role) {
    res.status(422).json({ success: false, message: 'email, name, password, and role are required' });
    return;
  }

  const validRoles = ['admin', 'manager', 'staff'];
  if (!validRoles.includes(role)) {
    res.status(422).json({ success: false, message: 'role must be admin, manager, or staff' });
    return;
  }

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (existing) {
      res.status(422).json({ success: false, message: 'Email already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ email: email.toLowerCase().trim(), name, passwordHash, role })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/users/:id  — update name / role / isActive
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { name, role, isActive } = req.body;

  if (!name && role === undefined && isActive === undefined) {
    res.status(422).json({ success: false, message: 'Nothing to update' });
    return;
  }

  // Prevent removing last admin
  if (role && role !== 'admin') {
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
    if (target?.role === 'admin') {
      const [{ adminCount }] = await db.select({ adminCount: count() }).from(users).where(eq(users.role, 'admin'));
      if (Number(adminCount) <= 1) {
        res.status(422).json({ success: false, message: 'Cannot remove the last admin' });
        return;
      }
    }
  }

  try {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/users/:id/password  — reset a user's password
router.put('/:id/password', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(422).json({ success: false, message: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/users/:id  — soft delete (deactivate)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));

  if (id === req.user!.id) {
    res.status(422).json({ success: false, message: 'Cannot deactivate your own account' });
    return;
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
