import { Request } from 'express';
export type UserPayload = {
  userId: number;
  email: string;
  roles: string[];
};
export type RequestWithUser = Request & {
  user: UserPayload;
};
