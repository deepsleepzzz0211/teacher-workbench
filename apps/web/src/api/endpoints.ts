import type {
  Achievement,
  AchievementCreateInput,
  AchievementQuery,
  AchievementStats,
  AchievementUpdateInput,
  ApplicationCreateInput,
  ApplicationRecord,
  ApplicationReviewInput,
  AuthUser,
  ClassGroup,
  Course,
  DashboardOverview,
  EnterprisePractice,
  LoginInput,
  LoginResponse,
  Notice,
  NoticeCreateInput,
  NoticeListResult,
  Paginated,
  PracticeCreateInput,
  PracticeProgress,
  ScheduleEntry,
  TeachingTask,
  TeachingTaskCreateInput,
  TeachingTaskUpdateInput,
  Term,
  Todo,
  TodoCreateInput,
  TodoUpdateInput,
  WorkloadItem,
  WorkloadItemCreateInput,
  WorkloadSummaryView,
} from '@tw/shared'

import { api } from './client'

export interface ScheduleResult {
  term: Term
  week: number
  entries: ScheduleEntry[]
}

export const authApi = {
  login: (payload: LoginInput) => api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
}

export const catalogApi = {
  terms: () => api.get<Term[]>('/catalog/terms').then((r) => r.data),
  courses: () => api.get<Course[]>('/catalog/courses').then((r) => r.data),
  classes: () => api.get<ClassGroup[]>('/catalog/classes').then((r) => r.data),
}

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/dashboard').then((r) => r.data),
}

export const scheduleApi = {
  get: (params: { termId?: string; week?: number }) =>
    api.get<ScheduleResult>('/schedule', { params }).then((r) => r.data),
}

export const workloadApi = {
  summary: (termId?: string) =>
    api.get<WorkloadSummaryView>('/workload/summary', { params: { termId } }).then((r) => r.data),
  tasks: (termId?: string) =>
    api.get<TeachingTask[]>('/workload/tasks', { params: { termId } }).then((r) => r.data),
  createTask: (payload: TeachingTaskCreateInput) =>
    api.post<TeachingTask>('/workload/tasks', payload).then((r) => r.data),
  updateTask: (id: string, payload: TeachingTaskUpdateInput) =>
    api.patch<TeachingTask>(`/workload/tasks/${id}`, payload).then((r) => r.data),
  deleteTask: (id: string) => api.delete(`/workload/tasks/${id}`).then((r) => r.data),
  items: (termId?: string) =>
    api.get<WorkloadItem[]>('/workload/items', { params: { termId } }).then((r) => r.data),
  createItem: (payload: WorkloadItemCreateInput) =>
    api.post<WorkloadItem>('/workload/items', payload).then((r) => r.data),
  deleteItem: (id: string) => api.delete(`/workload/items/${id}`).then((r) => r.data),
}

export const achievementApi = {
  list: (query: AchievementQuery) =>
    api.get<Paginated<Achievement>>('/achievements', { params: query }).then((r) => r.data),
  stats: () => api.get<AchievementStats>('/achievements/stats').then((r) => r.data),
  create: (payload: AchievementCreateInput) =>
    api.post<Achievement>('/achievements', payload).then((r) => r.data),
  update: (id: string, payload: AchievementUpdateInput) =>
    api.patch<Achievement>(`/achievements/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/achievements/${id}`).then((r) => r.data),
}

export const practiceApi = {
  progress: () => api.get<PracticeProgress>('/practices').then((r) => r.data),
  create: (payload: PracticeCreateInput) =>
    api.post<EnterprisePractice>('/practices', payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/practices/${id}`).then((r) => r.data),
}

export const applicationApi = {
  list: (params: { status?: string; mine?: boolean; page?: number; pageSize?: number } = {}) =>
    api
      .get<Paginated<ApplicationRecord>>('/applications', { params })
      .then((r) => r.data),
  pending: () => api.get<ApplicationRecord[]>('/applications/pending').then((r) => r.data),
  create: (payload: ApplicationCreateInput) =>
    api.post<ApplicationRecord>('/applications', payload).then((r) => r.data),
  review: (id: string, payload: ApplicationReviewInput) =>
    api.post<ApplicationRecord>(`/applications/${id}/review`, payload).then((r) => r.data),
}

export const noticeApi = {
  list: (params: { page?: number; pageSize?: number } = {}) =>
    api.get<NoticeListResult>('/notices', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Notice>(`/notices/${id}`).then((r) => r.data),
  markRead: (id: string) => api.post(`/notices/${id}/read`).then((r) => r.data),
  create: (payload: NoticeCreateInput) => api.post<Notice>('/notices', payload).then((r) => r.data),
}

export const todoApi = {
  list: (status?: 'pending' | 'done') =>
    api.get<Todo[]>('/todos', { params: { status } }).then((r) => r.data),
  create: (payload: TodoCreateInput) => api.post<Todo>('/todos', payload).then((r) => r.data),
  update: (id: string, payload: TodoUpdateInput) =>
    api.patch<Todo>(`/todos/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/todos/${id}`).then((r) => r.data),
}

export type {
  Achievement,
  ApplicationRecord,
  Notice,
  PracticeProgress,
  TeachingTask,
  Todo,
  WorkloadItem,
  WorkloadSummaryView,
}
