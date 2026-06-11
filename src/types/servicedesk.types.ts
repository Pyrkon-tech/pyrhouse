export type ServiceDeskStatus = 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type ServiceDeskPriority = 'high' | 'medium' | 'low';
export type ServiceDeskType = 'hardware_issue' | 'replacement' | 'technical_problem' | 'other';

export interface ServiceDeskRequest {
  id: number;
  title: string;
  description: string;
  type: ServiceDeskType;
  priority: ServiceDeskPriority;
  status: ServiceDeskStatus;
  location?: string;
  location_id?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  assigned_to_user?: {
    id: number;
    username: string;
    fullname?: string | null;
  } | null;
  created_by_user?: {
    id?: number;
    username?: string;
    fullname?: string | null;
  } | null;
}

/** Request type metadata returned by GET /service-desk/request-types */
export interface ServiceDeskRequestTypeInfo {
  id: string;
  name: string;
}

/** Minimal user shape the service desk UI needs (assignment dropdowns etc.) */
export interface ServiceDeskUserSummary {
  id: number;
  username: string;
  fullname?: string | null;
}
