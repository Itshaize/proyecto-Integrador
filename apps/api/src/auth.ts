import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import type { AuthUser, Role } from './types.js';

export function createToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '8h', issuer: 'cuido-api' });
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  try { req.user = jwt.verify(token, config.jwtSecret, { issuer: 'cuido-api' }) as AuthUser; next(); }
  catch { res.status(401).json({ message: 'Tu sesión venció. Inicia sesión nuevamente.' }); }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) { res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' }); return; }
    next();
  };
}

