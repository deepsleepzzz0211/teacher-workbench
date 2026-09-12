import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/* --------------------------------- 用户 --------------------------------- */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  employeeNo: varchar('employee_no', { length: 30 }).notNull(),
  department: varchar('department', { length: 80 }).notNull(),
  title: varchar('title', { length: 50 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('teacher'),
  email: varchar('email', { length: 120 }),
  phone: varchar('phone', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* --------------------------------- 学期 --------------------------------- */

export const terms = pgTable('terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull().unique(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* --------------------------------- 班级 --------------------------------- */

export const classGroups = pgTable('class_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull().unique(),
  major: varchar('major', { length: 80 }).notNull(),
  grade: integer('grade').notNull(),
  studentCount: integer('student_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* --------------------------------- 课程 --------------------------------- */

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  courseType: varchar('course_type', { length: 20 }).notNull(),
  credits: doublePrecision('credits').notNull().default(0),
  hours: integer('hours').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* ------------------------------- 授课任务 ------------------------------- */

export const teachingTasks = pgTable(
  'teaching_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    termId: uuid('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classGroups.id, { onDelete: 'restrict' }),
    location: varchar('location', { length: 60 }).notNull().default(''),
    weekday: integer('weekday').notNull(),
    startSection: integer('start_section').notNull(),
    endSection: integer('end_section').notNull(),
    weekStart: integer('week_start').notNull(),
    weekEnd: integer('week_end').notNull(),
    weekParity: varchar('week_parity', { length: 10 }).notNull().default('all'),
    totalHours: doublePrecision('total_hours').notNull(),
    studentCount: integer('student_count').notNull(),
    repeatIndex: integer('repeat_index').notNull().default(1),
    remark: varchar('remark', { length: 200 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('teaching_tasks_teacher_term_idx').on(table.teacherId, table.termId),
    index('teaching_tasks_teacher_weekday_idx').on(table.teacherId, table.weekday),
  ],
)

/* ------------------------------ 其它工作量 ------------------------------ */

export const workloadItems = pgTable(
  'workload_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    termId: uuid('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 30 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    quantity: doublePrecision('quantity').notNull(),
    occurredOn: date('occurred_on').notNull(),
    remark: varchar('remark', { length: 200 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('workload_items_teacher_term_idx').on(table.teacherId, table.termId)],
)

/* ------------------------------- 教科研成果 ------------------------------ */

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 30 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    level: varchar('level', { length: 20 }).notNull(),
    role: varchar('role', { length: 60 }).notNull(),
    achievedOn: date('achieved_on').notNull(),
    score: doublePrecision('score'),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('achievements_teacher_category_idx').on(table.teacherId, table.category),
    index('achievements_teacher_date_idx').on(table.teacherId, table.achievedOn),
  ],
)

/* --------------------------- 企业实践（双师型） --------------------------- */

export const enterprisePractices = pgTable(
  'enterprise_practices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: varchar('company', { length: 120 }).notNull(),
    position: varchar('position', { length: 60 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    days: integer('days').notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('enterprise_practices_teacher_date_idx').on(table.teacherId, table.startDate)],
)

/* ------------------------------ 调课/请假 ------------------------------ */

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    taskId: uuid('task_id').references(() => teachingTasks.id, { onDelete: 'set null' }),
    originalDate: date('original_date').notNull(),
    originalSection: varchar('original_section', { length: 40 }).notNull().default(''),
    targetDate: date('target_date'),
    targetSection: varchar('target_section', { length: 40 }).notNull().default(''),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    reviewComment: varchar('review_comment', { length: 300 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('applications_status_idx').on(table.status),
    index('applications_teacher_idx').on(table.teacherId),
  ],
)

/* ------------------------------- 通知公告 ------------------------------- */

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  isTop: boolean('is_top').notNull().default(false),
  publisherId: uuid('publisher_id').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
})

export const noticeReads = pgTable(
  'notice_reads',
  {
    noticeId: uuid('notice_id')
      .notNull()
      .references(() => notices.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.noticeId, table.userId], name: 'notice_reads_pk' }),
    unique('notice_reads_notice_user_unique').on(table.noticeId, table.userId),
  ],
)

/* --------------------------------- 待办 --------------------------------- */

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    dueDate: date('due_date').notNull(),
    priority: varchar('priority', { length: 10 }).notNull().default('medium'),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    relatedType: varchar('related_type', { length: 40 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('todos_teacher_status_idx').on(table.teacherId, table.status)],
)
