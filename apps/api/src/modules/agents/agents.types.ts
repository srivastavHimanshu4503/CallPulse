export interface AgentFilters {
  isActive?: boolean;
}

export interface LogFilters {
  type?: string;
  extractionStatus?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}
