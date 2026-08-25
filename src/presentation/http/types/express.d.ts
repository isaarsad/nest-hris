import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';

declare global {
  namespace Express {
    interface Request {
      user?: RequestingUser;
    }
  }
}

export {};
