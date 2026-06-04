import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(422).json({ success: false, message: 'Email and password are required' });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(422).json({ success: false, message: 'Email is required' });
    return;
  }

  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));

    // Always return success to prevent user enumeration
    if (user) {
      console.log(`Password reset requested for: ${email}`);
    }

    res.json({
      success: true,
      message: 'If this email is registered, you will receive a password reset link shortly.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, req.user!.id));

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/auth/profile — update own name
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(422).json({ success: false, message: 'Name is required' });
    return;
  }
  try {
    const [updated] = await db
      .update(users)
      .set({ name: name.trim() })
      .where(eq(users.id, req.user!.id))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/auth/change-password — change own password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(422).json({ success: false, message: 'Current password and new password (min 6 chars) required' });
    return;
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ success: false, message: 'Current password is incorrect' }); return; }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, req.user!.id));
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
