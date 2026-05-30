import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

// Estende o tipo Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware de autenticação.
 * Extrai o JWT do header Authorization, valida usando Supabase,
 * e injeta req.userId para uso nas rotas.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação ausente' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Erro ao validar token' });
  }
}
