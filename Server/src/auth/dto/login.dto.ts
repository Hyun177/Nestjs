export class LoginDto {
  access_token: string;
  refresh_token: string;
  user?: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
}
