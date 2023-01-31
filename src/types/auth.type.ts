export interface AuthDiscordCredentials {
  code: string;
  roomId?: string;
}

export type TokenRecord = {
  token: string;
  validUntil: string;
};

export type AuthTokens = Record<'access' | 'refresh', TokenRecord>;
