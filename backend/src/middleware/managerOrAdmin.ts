import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function managerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!['admin', 'manager'].includes(req.user?.role ?? '')) {
    res.status(403).json({ success: false, message: 'Manager or admin access required' });
    return;
  }
  next();
}
