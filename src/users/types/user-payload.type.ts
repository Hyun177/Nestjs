export type UserPayload = {
  userId: number;
  email: string;
  role: string;
};
export type RequestWithUser = Request & {
  user: UserPayload;
};
