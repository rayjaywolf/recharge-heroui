/** Shape returned by Better Auth GET /api/auth/get-session */
export type AuthGetSessionResponse = {
  session: {
    id: string;
    userId: string;
    expiresAt: string | Date;
    token: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role?: string | null;
    [key: string]: unknown;
  };
} | null;
