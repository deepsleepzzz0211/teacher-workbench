import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  DASHBOARD_NOTICE_LIMIT,
  type DashboardOverview,
  type Notice,
  type NoticeCategory,
  summarizeWorkload,
  type TodayCourse,
  type Todo,
  type TodoPriority,
  type TodoStatus,
} from '@tw/shared'

import { db } from '../db/client'
import { applications, noticeReads, notices, todos, users } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import {
  addDays,
  getCurrentTerm,
  isoWeekday,
  matchesWeekParity,
  requiredHoursOf,
  toDateString,
  weekOfTerm,
} from '../services/common'
import { notFound } from '../utils/http'
import { computeAchievementStats, recentAchievements } from './achievement'
import { buildPracticeProgress } from './practice'
import { listItems, listTasks } from './workload'

const TODAY_TODO_LIMIT = 8

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<DashboardOverview> => {
    const userId = request.currentUser.sub
    const term = await getCurrentTerm()
    const today = new Date()
    const weekday = isoWeekday(today)
    const week = weekOfTerm(term)

    const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!userRow) throw notFound('用户不存在')

    const tasks = await listTasks(userId, term.id)
    const activeThisWeek = tasks.filter(
      (task) => task.weekStart <= week && task.weekEnd >= week && matchesWeekParity(task.weekParity, week),
    )

    let todayTasks = activeThisWeek.filter((task) => task.weekday === weekday)
    let showingFrom: string | null = null
    if (todayTasks.length === 0) {
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = addDays(today, offset)
        const candidateWeekday = isoWeekday(candidate)
        if (candidateWeekday > 5) continue
        const found = activeThisWeek.filter((task) => task.weekday === candidateWeekday)
        if (found.length > 0) {
          todayTasks = found
          showingFrom = toDateString(candidate)
          break
        }
      }
    }

    const todayCourses: TodayCourse[] = todayTasks.map((task) => ({
      taskId: task.id,
      courseName: task.courseName,
      className: task.className,
      location: task.location,
      startSection: task.startSection,
      endSection: task.endSection,
    }))
    const todayHours = Math.round(todayTasks.reduce((sum, task) => sum + task.effectiveHours, 0) * 10) / 10

    const [items, todoRows, todoCountRow, noticeRows, unreadRow, pendingAppRow, achievementStats, achievementRecent, practice] =
      await Promise.all([
        listItems(userId, term.id),
        db
          .select()
          .from(todos)
          .where(and(eq(todos.teacherId, userId), eq(todos.status, 'pending')))
          .orderBy(asc(todos.dueDate))
          .limit(TODAY_TODO_LIMIT),
        db
          .select({ value: count() })
          .from(todos)
          .where(and(eq(todos.teacherId, userId), eq(todos.status, 'pending'))),
        db
          .select({ notice: notices, publisherName: users.name, readAt: noticeReads.readAt })
          .from(notices)
          .leftJoin(users, eq(notices.publisherId, users.id))
          .leftJoin(
            noticeReads,
            and(eq(noticeReads.noticeId, notices.id), eq(noticeReads.userId, userId)),
          )
          .orderBy(desc(notices.isTop), desc(notices.publishedAt))
          .limit(DASHBOARD_NOTICE_LIMIT),
        db
          .select({ value: count() })
          .from(notices)
          .leftJoin(
            noticeReads,
            and(eq(noticeReads.noticeId, notices.id), eq(noticeReads.userId, userId)),
          )
          .where(isNull(noticeReads.readAt)),
        db
          .select({ value: count() })
          .from(applications)
          .where(
            userRow.role === 'dept_admin'
              ? eq(applications.status, 'pending')
              : and(eq(applications.status, 'pending'), eq(applications.teacherId, userId)),
          ),
        computeAchievementStats(userId),
        recentAchievements(userId, 5),
        buildPracticeProgress(userId),
      ])

    const todoList: Todo[] = todoRows.map((row) => ({
      id: row.id,
      teacherId: row.teacherId,
      title: row.title,
      dueDate: row.dueDate,
      priority: row.priority as TodoPriority,
      status: row.status as TodoStatus,
      relatedType: row.relatedType,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    }))

    const noticeList: Notice[] = noticeRows.map((row) => ({
      id: row.notice.id,
      title: row.notice.title,
      content: row.notice.content,
      category: row.notice.category as NoticeCategory,
      isTop: row.notice.isTop,
      publisherId: row.notice.publisherId,
      publisherName: row.publisherName ?? '教务处',
      publishedAt: row.notice.publishedAt.toISOString(),
      isRead: row.readAt !== null,
    }))

    const summary = summarizeWorkload({
      tasks: tasks.map((task) => ({ courseType: task.courseType, effectiveHours: task.effectiveHours })),
      items: items.map((item) => ({ category: item.category, hours: item.hours })),
      requiredHours: requiredHoursOf(term),
    })

    const allAchievementsTotal = achievementStats.total

    return {
      teacher: {
        name: userRow.name,
        department: userRow.department,
        title: userRow.title,
        role: userRow.role,
      },
      today: {
        date: toDateString(today),
        weekday,
        isTeachingDay: weekday <= 5,
        courses: todayCourses,
        hours: todayHours,
        showingFrom,
      },
      currentTerm: { id: term.id, name: term.name, week },
      workload: {
        termId: term.id,
        termName: term.name,
        ...summary,
        weekly: [],
        taskCount: tasks.length,
        itemCount: items.length,
      },
      todos: todoList,
      notices: noticeList,
      achievement: {
        total: allAchievementsTotal,
        scoreSum: achievementStats.scoreSum,
        byCategory: achievementStats.byCategory,
        recent: achievementRecent,
      },
      practice,
      weekSchedule: activeThisWeek.map((task) => ({
        taskId: task.id,
        courseName: task.courseName,
        courseType: task.courseType,
        className: task.className,
        location: task.location,
        weekday: task.weekday,
        startSection: task.startSection,
        endSection: task.endSection,
        weekStart: task.weekStart,
        weekEnd: task.weekEnd,
        weekParity: task.weekParity,
      })),
      counters: {
        pendingTodos: todoCountRow[0]?.value ?? 0,
        unreadNotices: unreadRow[0]?.value ?? 0,
        pendingApplications: pendingAppRow[0]?.value ?? 0,
      },
    }
  })
}
