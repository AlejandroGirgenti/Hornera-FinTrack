// Agrega a Request los campos que completan nuestros middlewares.
declare global {
  namespace Express {
    interface Request {
      /** Identificador de la petición, también devuelto en la cabecera X-Request-Id. */
      id: string;
      /** Id del usuario autenticado (lo completa `requireAuth`). */
      userId?: string;
    }
  }
}

export {};
