export class LoginDto {
  access_token: string;
  refresh_token: string;
  user?: {
    id: number;
    name?: string;
    firstname: string;
    lastname: string;
    email: string;
    roles: string[];
  };
}
