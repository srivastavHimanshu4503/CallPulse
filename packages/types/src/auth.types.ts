export interface UserSession {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: UserSession;
  tokens: AuthTokens;
}
