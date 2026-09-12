-- 0000_init.sql —— 高职院校教师工作台初始结构
-- 约定：主键使用 uuid（gen_random_uuid，PostgreSQL 13+ 内置）；
--       学时/数量/分值使用 double precision 以便直接映射为 JS number；
--       日期使用 date（返回 YYYY-MM-DD 字符串），时间使用 timestamptz。

-- ============================== 用户 ==============================
create table users (
  id            uuid primary key default gen_random_uuid(),
  username      varchar(50)  not null unique,
  password_hash text         not null,
  name          varchar(50)  not null,
  employee_no   varchar(30)  not null,
  department    varchar(80)  not null,
  title         varchar(50)  not null,
  role          varchar(20)  not null default 'teacher',
  email         varchar(120),
  phone         varchar(30),
  created_at    timestamptz  not null default now()
);

-- ============================== 学期 ==============================
create table terms (
  id         uuid primary key default gen_random_uuid(),
  name       varchar(60) not null unique,
  start_date date        not null,
  end_date   date        not null,
  is_current boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ============================== 班级 ==============================
create table class_groups (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(80) not null unique,
  major         varchar(80) not null,
  grade         integer     not null,
  student_count integer     not null,
  created_at    timestamptz not null default now()
);

-- ============================== 课程 ==============================
create table courses (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(40)  not null unique,
  name        varchar(120) not null,
  course_type varchar(20)  not null,
  credits     double precision not null default 0,
  hours       integer      not null default 0,
  created_at  timestamptz  not null default now()
);

-- ============================= 授课任务 =============================
create table teaching_tasks (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references users(id) on delete cascade,
  term_id       uuid not null references terms(id) on delete cascade,
  course_id     uuid not null references courses(id) on delete restrict,
  class_id      uuid not null references class_groups(id) on delete restrict,
  location      varchar(60) not null default '',
  weekday       integer not null,
  start_section integer not null,
  end_section   integer not null,
  week_start    integer not null,
  week_end      integer not null,
  week_parity   varchar(10) not null default 'all',
  total_hours   double precision not null,
  student_count integer not null,
  repeat_index  integer not null default 1,
  remark        varchar(200) not null default '',
  created_at    timestamptz not null default now()
);

create index teaching_tasks_teacher_term_idx on teaching_tasks (teacher_id, term_id);
create index teaching_tasks_teacher_weekday_idx on teaching_tasks (teacher_id, weekday);

-- =========================== 其它工作量 ===========================
create table workload_items (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references users(id) on delete cascade,
  term_id     uuid not null references terms(id) on delete cascade,
  category    varchar(30)  not null,
  title       varchar(120) not null,
  quantity    double precision not null,
  occurred_on date         not null,
  remark      varchar(200) not null default '',
  created_at  timestamptz  not null default now()
);

create index workload_items_teacher_term_idx on workload_items (teacher_id, term_id);

-- ============================ 教科研成果 ============================
create table achievements (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references users(id) on delete cascade,
  category    varchar(30)  not null,
  title       varchar(200) not null,
  level       varchar(20)  not null,
  role        varchar(60)  not null,
  achieved_on date         not null,
  score       double precision,
  description text         not null default '',
  created_at  timestamptz  not null default now()
);

create index achievements_teacher_category_idx on achievements (teacher_id, category);
create index achievements_teacher_date_idx on achievements (teacher_id, achieved_on);

-- ======================= 企业实践（双师型） =======================
create table enterprise_practices (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references users(id) on delete cascade,
  company     varchar(120) not null,
  position    varchar(60)  not null,
  start_date  date         not null,
  end_date    date         not null,
  days        integer      not null,
  description text         not null default '',
  created_at  timestamptz  not null default now()
);

create index enterprise_practices_teacher_date_idx on enterprise_practices (teacher_id, start_date);

-- =========================== 调课 / 请假 ===========================
create table applications (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references users(id) on delete cascade,
  type             varchar(20)  not null,
  task_id          uuid references teaching_tasks(id) on delete set null,
  original_date    date         not null,
  original_section varchar(40)  not null default '',
  target_date      date,
  target_section   varchar(40)  not null default '',
  reason           varchar(500) not null,
  status           varchar(20)  not null default 'pending',
  reviewer_id      uuid references users(id) on delete set null,
  review_comment   varchar(300),
  reviewed_at      timestamptz,
  created_at       timestamptz  not null default now()
);

create index applications_status_idx on applications (status);
create index applications_teacher_idx on applications (teacher_id);

-- ============================ 通知公告 ============================
create table notices (
  id           uuid primary key default gen_random_uuid(),
  title        varchar(200) not null,
  content      text         not null,
  category     varchar(20)  not null,
  is_top       boolean      not null default false,
  publisher_id uuid references users(id) on delete set null,
  published_at timestamptz  not null default now()
);

create table notice_reads (
  notice_id uuid not null references notices(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  read_at   timestamptz not null default now(),
  constraint notice_reads_pk primary key (notice_id, user_id),
  constraint notice_reads_notice_user_unique unique (notice_id, user_id)
);

-- ============================== 待办 ==============================
create table todos (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references users(id) on delete cascade,
  title        varchar(200) not null,
  due_date     date         not null,
  priority     varchar(10)  not null default 'medium',
  status       varchar(10)  not null default 'pending',
  related_type varchar(40)  not null default '',
  created_at   timestamptz  not null default now(),
  completed_at timestamptz
);

create index todos_teacher_status_idx on todos (teacher_id, status);
