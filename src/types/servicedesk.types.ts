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
}
