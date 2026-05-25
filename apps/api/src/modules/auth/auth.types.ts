import type { AuthTokens } from "@antigravity/types";

export interface RegisterResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  tokens: AuthTokens;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  tokens: AuthTokens;
}
