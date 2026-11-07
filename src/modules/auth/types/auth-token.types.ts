export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
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
