import { GET } from '@/web/common/api/request';
import type {
  StatisticsKPIData,
  AppTrendData,
  SystemTrendData,
  TrafficDistributionData,
  ErrorTypeData,
  UserTrendData
} from '@fastgpt/service/core/statistics/overviewController';
import type { AppDetailData } from '@fastgpt/service/core/statistics/appListController';
import type { UserDetailData } from '@fastgpt/service/core/statistics/userListController';
import type { UserStatisticsData } from '@fastgpt/service/core/statistics/userController';
import type { AppStatisticsData } from '@fastgpt/service/core/statistics/appController';

export interface StatisticsOverviewResponse {
  kpi: StatisticsKPIData;
  appTrend: AppTrendData[];
  systemTrend: SystemTrendData[];
  trafficDistribution: TrafficDistributionData[];
  dailyMessages: TrafficDistributionData[];
  errorTypes: ErrorTypeData[];
  userTrend: UserTrendData[];
}

export interface AppListResponse {
  apps: AppDetailData[];
  total: number;
}

export interface UserListResponse {
  users: UserDetailData[];
  total: number;
}

export type { UserStatisticsData };

export const getStatisticsOverview = (params: {
  startDate: string;
  endDate: string;
  timeUnit?: 'day' | 'week' | 'month';
}) => {
  return GET<StatisticsOverviewResponse>('/admin/statistics/overview', params);
};

export const getAppList = (params: {
  startDate: string;
  endDate: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  return GET<AppListResponse>('/admin/statistics/apps', params);
};

export const getUserList = (params: {
  startDate: string;
  endDate: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'session' | 'messages';
}) => {
  return GET<UserListResponse>('/admin/statistics/users', params);
};

export const getUserStatistics = (
  userId: string,
  params: {
    startDate: string;
    endDate: string;
    timeUnit?: 'day' | 'week' | 'month';
  }
) => {
  return GET<UserStatisticsData>(`/admin/statistics/user/${userId}`, params);
};

export const getAppStatistics = (
  appId: string,
  params: {
    startDate: string;
    endDate: string;
    timeUnit?: 'day' | 'week' | 'month';
  }
) => {
  return GET<AppStatisticsData>(`/admin/statistics/app/${appId}`, params);
};
