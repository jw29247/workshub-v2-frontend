import { apiService } from './apiService';

export type HealthScoreStatus = 'green' | 'amber' | 'red';

export type ServiceApplicability = 'all' | 'cro_only' | 'non_cro_only';

export interface HealthMetric {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  service_applicability: ServiceApplicability;
  created_at: string;
  updated_at: string;
}

export interface HealthMetricCreate {
  name: string;
  display_name: string;
  description?: string | null;
  order_index: number;
  is_active?: boolean;
  service_applicability?: ServiceApplicability;
}

export interface HealthMetricUpdate {
  name?: string;
  display_name?: string;
  description?: string | null;
  order_index?: number;
  is_active?: boolean;
  service_applicability?: ServiceApplicability;
}

export interface HealthScore {
  id: number;
  client_id: number;
  metric_id: number;
  score: HealthScoreStatus;
  week_starting: string;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  metric: HealthMetric;
}

export interface WeeklyReport {
  client_id: number;
  client_name: string;
  week_starting: string;
  scores: HealthScore[];
  status_summary: {
    green: number;
    amber: number;
    red: number;
  };
}

export interface BulkScoreCreate {
  client_id: number;
  week_starting: string;
  scores: Array<{
    metric_id: number;
    score: HealthScoreStatus;
    notes?: string;
  }>;
}

export interface HealthTrendItem {
  week_starting: string;
  metric_id: number;
  metric_name: string;
  score: HealthScoreStatus;
}

export interface HealthTrend {
  client_id: number;
  client_name: string;
  start_date: string;
  end_date: string;
  metrics: string[];
  trend_data: HealthTrendItem[];
}

export const clientHealthService = {
  // Get all health metrics
  async getMetrics(activeOnly: boolean = true): Promise<HealthMetric[]> {
    try {
      const params = new URLSearchParams({ active_only: activeOnly.toString() });
      const response = await apiService.get(`/api/client-health/metrics?${params}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  // Create a new health metric
  async createMetric(data: HealthMetricCreate): Promise<HealthMetric> {
    const response = await apiService.post(`/api/client-health/metrics`, data);
    return response.json();
  },

  // Update a health metric
  async updateMetric(metricId: number, data: HealthMetricUpdate): Promise<HealthMetric> {
    const response = await apiService.patch(`/api/client-health/metrics/${metricId}`, data);
    return response.json();
  },

  // Delete (deactivate) a health metric
  async deleteMetric(metricId: number): Promise<void> {
    await apiService.delete(`/api/client-health/metrics/${metricId}`);
  },

  // Create or update health scores in bulk
  async createScoresBulk(data: BulkScoreCreate): Promise<HealthScore[]> {
    const response = await apiService.post(`/api/client-health/scores/bulk`, data);
    return response.json();
  },

  // Get weekly report for a client
  async getWeeklyReport(clientId: number, weekStarting?: string): Promise<WeeklyReport> {
    const params = new URLSearchParams();
    if (weekStarting) {
      params.append('week_starting', weekStarting);
    }
    const response = await apiService.get(`/api/client-health/clients/${clientId}/weekly-report?${params}`);
    return response.json();
  },

  // Get health trend for a client
  async getHealthTrend(
    clientId: number,
    startDate?: string,
    endDate?: string,
    metricIds?: number[]
  ): Promise<HealthTrend> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (metricIds && metricIds.length > 0) {
      metricIds.forEach(id => { params.append('metric_ids', id.toString()); });
    }
    const response = await apiService.get(`/api/client-health/clients/${clientId}/trend?${params}`);
    return response.json();
  },

  // Get all clients weekly reports
  async getAllClientsWeeklyReports(weekStarting?: string, activeOnly: boolean = true): Promise<WeeklyReport[]> {
    try {
      const params = new URLSearchParams({ active_only: activeOnly.toString() });
      if (weekStarting) {
        params.append('week_starting', weekStarting);
      }
      const response = await apiService.get(`/api/client-health/reports/all-clients?${params}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
};
