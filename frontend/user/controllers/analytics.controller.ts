import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

export interface AnalyticsKPI {
  value: string;
  trend: string;
  is_positive: boolean;
  sparkline: number[];
}

export interface AnalyticsKPIsData {
  total_calls: AnalyticsKPI;
  ai_answer_rate: AnalyticsKPI;
  ai_resolution_rate: AnalyticsKPI;
  appointments_booked: AnalyticsKPI;
  conversion_rate: AnalyticsKPI;
  avg_call_duration: AnalyticsKPI;
}

export interface HeatmapData {
  days: string[];
  hours: string[];
  matrix: number[][];
}

export interface CallOutcomeItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CallOutcomesData {
  total_calls: number;
  items: CallOutcomeItem[];
}

export interface VolumeTrendPoint {
  date: string;
  calls: number;
  answer_rate: number;
}

export interface TopCallReasonItem {
  reason: string;
  category: string;
  percentage: number;
  count: number;
  color: string;
}

export interface AnalyticsSummaryResponse {
  period: string;
  date_range_label: string;
  kpis: AnalyticsKPIsData;
  heatmap: HeatmapData;
  outcomes: CallOutcomesData;
  trend: VolumeTrendPoint[];
  top_reasons: TopCallReasonItem[];
}

export class AnalyticsController {
  public static async getSummary(period: string = '30d'): Promise<AnalyticsSummaryResponse | null> {
    try {
      const businessId = StorageService.getBusinessId();
      if (!businessId) {
        return this.getDefaultSummary(period);
      }

      const res = await ApiService.get<AnalyticsSummaryResponse>(
        API_ENDPOINTS.ANALYTICS.GET_SUMMARY(businessId, period)
      );
      if (res) return res;
      return this.getDefaultSummary(period);
    } catch (err) {
      console.warn('Could not fetch analytics from API:', err);
      return this.getDefaultSummary(period);
    }
  }

  public static getDefaultSummary(period: string = '30d'): AnalyticsSummaryResponse {
    return {
      period,
      date_range_label: 'Selected Period',
      kpis: {
        total_calls: {
          value: '0',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
        ai_answer_rate: {
          value: '0%',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
        ai_resolution_rate: {
          value: '0%',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
        appointments_booked: {
          value: '0',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
        conversion_rate: {
          value: '0%',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
        avg_call_duration: {
          value: '00:00',
          trend: '0% vs last month',
          is_positive: true,
          sparkline: [0, 0, 0, 0, 0, 0],
        },
      },
      heatmap: {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        hours: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'],
        matrix: [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
      },
      outcomes: {
        total_calls: 0,
        items: [],
      },
      trend: [],
      top_reasons: [],
    };
  }
}
