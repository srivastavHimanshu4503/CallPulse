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
  expiresIn: number;
}

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SerializedTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface AuthResponseData {
  user: SerializedUser;
  tenant: SerializedTenant;
  tokens: AuthTokens;
}

