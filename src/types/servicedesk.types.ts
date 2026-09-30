/**
 * Service desk shapes are aliases of the generated API contract (@pyrhouse/api, from backend/docs/openapi.yaml).
 */
import type { Schemas } from '@pyrhouse/api';

export type ServiceDeskStatus = Schemas['ServiceDeskStatus'];
export type ServiceDeskPriority = Schemas['ServiceDeskPriority'];
export type ServiceDeskType = Schemas['ServiceDeskType'];
export type ServiceDeskRequest = Schemas['ServiceDeskRequest'];
export type ServiceDeskComment = Schemas['ServiceDeskComment'];
/** Request type metadata returned by GET /service-desk/request-types */
export type ServiceDeskRequestTypeInfo = Schemas['ServiceDeskRequestType'];
export type CreateServiceDeskRequestPayload = Schemas['CreateServiceDeskRequest'];

/** User shape the service desk shows (assignee, author, assignment dropdowns) */
export type ServiceDeskUserSummary = Schemas['ServiceDeskUser'];
