export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type UserRoleCode = 1 | 2;

export type AdminLoginResponse = {
  token: string;
  expiresIn: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: UserRoleCode;
  };
  organization: {
    id: string;
    name: string;
  };
};

export const ADMIN_TOKEN_STORAGE_KEY = "mudhro_admin_token";
export const ADMIN_INFO_STORAGE_KEY = "mudhro_admin_info";
export const ADMIN_ORG_STORAGE_KEY = "mudhro_admin_org";
