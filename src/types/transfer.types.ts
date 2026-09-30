/**
 * Transfer shapes are aliases of the generated API contract (@pyrhouse/api, from backend/docs/openapi.yaml).
 */
import type { paths, Schemas } from '@pyrhouse/api';

export type TransferStatus = Schemas['TransferStatus'];
/** A transfer without its items (GET /transfers, GET /transfers/users/{id}) */
export type TransferSummary = Schemas['TransferSummary'];
/** Full transfer (GET /transfers/{id}) */
export type TransferDetails = Schemas['Transfer'];
export type TransferParticipant = Schemas['TransferParticipant'];
export type TransferDeliveryLocation = Schemas['DeliveryLocation'];

export type CreateTransferPayload =
  paths['/transfers']['post']['requestBody']['content']['application/json'];
