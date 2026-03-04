import { AuthUser } from './auth.type';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
