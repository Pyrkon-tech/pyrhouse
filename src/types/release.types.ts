/**
 * Release (permanent hand-back to an origin) shapes are aliases of the generated API contract
 * (@pyrhouse/api, from backend/docs/openapi.yaml).
 */
import type { Schemas } from '@pyrhouse/api';

export type Release = Schemas['Release'];
export type ReleaseStatus = Release['status'];
export type ReleaseAsset = Schemas['ReleaseAsset'];
export type ReleaseStock = Schemas['ReleaseStock'];
export type ReleaseDetail = Schemas['ReleaseDetail'];
export type SuggestedAsset = Schemas['SuggestedAsset'];
export type SuggestedStock = Schemas['SuggestedStock'];
export type SuggestResponse = Schemas['SuggestResponse'];
export type CreateReleasePayload = Schemas['CreateReleaseRequest'];
export type UpdateReleaseItemsPayload = Schemas['UpdateItemsRequest'];
