export interface AgentFilters {
  isActive?: boolean;
}

export interface LogFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}
