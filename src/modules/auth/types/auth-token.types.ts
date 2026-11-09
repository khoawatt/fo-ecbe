export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface TokenPairResponse extends LoginResponse {
  refreshToken: string;
  refreshExpiresIn: number;
}

export interface AccessTokenClaims {
  sub: string;
  roleCodes: string[];
  tokenType: 'access';
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
