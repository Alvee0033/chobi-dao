import { SetMetadata } from "@nestjs/common";

export type AuthRole = "photographer" | "user" | "admin";
export const AUTH_ROLES_KEY = "auth_roles";
export const AuthRoles = (...roles: AuthRole[]) => SetMetadata(AUTH_ROLES_KEY, roles);
