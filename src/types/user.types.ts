/**
 * User shapes are aliases of the generated API contract (@pyrhouse/api, from backend/docs/openapi.yaml).
 * The JWT payload and OAuth link payloads below are client-side / hand-written.
 */
import type { paths, Schemas } from '@pyrhouse/api';

export type UserRole = Schemas['Role'];
/** How the account was created */
export type AuthProvider = Schemas['AuthProvider'];
/** A row of GET /users (no OAuth identifiers) */
export type UserListItem = Schemas['UserListItem'];
/** GET /users/{id} — OAuth fields are null when not linked */
export type UserDetails = Schemas['UserDetails'];

export type UpdateUserPayload = NonNullable<
  paths['/users/{id}']['patch']['requestBody']
>['content']['application/json'];
export type AdjustPointsResponse =
  paths['/users/{id}/points']['post']['responses']['200']['content']['application/json'];
export type MergeDiscordResponse =
  paths['/users/{id}/merge-discord']['post']['responses']['200']['content']['application/json'];
export type LinkGooglePayload =
  paths['/users/{id}/link-google']['post']['requestBody']['content']['application/json'];
export type LinkDiscordPayload =
  paths['/users/{id}/link-discord']['post']['requestBody']['content']['application/json'];

/**
 * Zdekodowany token JWT
 */
export interface JwtPayload {
  role: UserRole;
  exp: number;
  userID: number;
  iat?: number;
}
