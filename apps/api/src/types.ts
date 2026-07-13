export const roles = ['ADMINISTRADOR', 'ADULTO_MAYOR'] as const;
export type Role = (typeof roles)[number];

export interface AuthUser {
  id_usuario: number;
  nombre: string;
  rol: Role;
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

