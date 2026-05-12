import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string }
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireBarber(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'BARBER') { res.status(403).json({ error: 'Barbers only' }); return }
  next()
}

export function requireCustomer(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'CUSTOMER') { res.status(403).json({ error: 'Customers only' }); return }
  next()
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'STAFF') { res.status(403).json({ error: 'Staff only' }); return }
  next()
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return }
  next()
}
