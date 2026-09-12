import { sql } from 'drizzle-orm'

import { env } from '../config/env'
import { hashPassword } from '../utils/password'
import { db } from './client'
import * as schema from './schema'

/* 演示数据的时间坐标：以"当前学期"为基准构造，保证登录后看到的是有意义的在学期数据 */
const CURRENT_TERM_START = '2026-09-01'
const CURRENT_TERM_END = '2027-01-15'

const DEMO_PASSWORD = env.seedDefaultPassword

async function truncateAll(): Promise<void> {
  await db.execute(sql`
    truncate table
      notice_reads, applications, todos, achievements, enterprise_practices,
      workload_items, teaching_tasks, notices, courses, class_groups, terms, users
    restart identity cascade
  `)
}

/**
 * 写入演示数据。可重复执行（每次先清空业务表）。
 */
export async function seedDemoData(): Promise<void> {
  await truncateAll()

  const passwordHash = hashPassword(DEMO_PASSWORD)

  /* ------------------------------- 用户 ------------------------------- */
  const insertedUsers = await db
    .insert(schema.users)
    .values([
      {
        username: 't1001',
        passwordHash,
        name: '陈立群',
        employeeNo: 'JS2019034',
        department: '智能制造学院',
        title: '讲师',
        role: 'teacher',
        email: 'chenliqun@example.edu.cn',
        phone: '13800000001',
      },
      {
        username: 't1002',
        passwordHash,
        name: '王海燕',
        employeeNo: 'JS2015021',
        department: '智能制造学院',
        title: '副教授',
        role: 'teacher',
        email: 'wanghaiyan@example.edu.cn',
        phone: '13800000002',
      },
      {
        username: 'admin',
        passwordHash,
        name: '刘建国',
        employeeNo: 'GL2014007',
        department: '智能制造学院',
        title: '教学秘书',
        role: 'dept_admin',
        email: 'liujianguo@example.edu.cn',
        phone: '13800000003',
      },
    ])
    .returning({ id: schema.users.id, username: schema.users.username })

  const userByName = new Map(insertedUsers.map((row) => [row.username, row.id]))
  const teacher1 = userByName.get('t1001')!
  const teacher2 = userByName.get('t1002')!
  const admin = userByName.get('admin')!

  /* ------------------------------- 学期 ------------------------------- */
  const insertedTerms = await db
    .insert(schema.terms)
    .values([
      { name: '2025-2026学年第一学期', startDate: '2025-09-01', endDate: '2026-01-16', isCurrent: false },
      { name: '2025-2026学年第二学期', startDate: '2026-02-23', endDate: '2026-07-10', isCurrent: false },
      { name: '2026-2027学年第一学期', startDate: CURRENT_TERM_START, endDate: CURRENT_TERM_END, isCurrent: true },
    ])
    .returning({ id: schema.terms.id, name: schema.terms.name })

  const termByName = new Map(insertedTerms.map((row) => [row.name, row.id]))
  const currentTerm = termByName.get('2026-2027学年第一学期')!
  const previousTerm = termByName.get('2025-2026学年第二学期')!

  /* ------------------------------- 班级 ------------------------------- */
  const insertedClasses = await db
    .insert(schema.classGroups)
    .values([
      { name: '机电一体化技术2301', major: '机电一体化技术', grade: 2023, studentCount: 45 },
      { name: '机电一体化技术2302', major: '机电一体化技术', grade: 2023, studentCount: 43 },
      { name: '数控技术2302', major: '数控技术', grade: 2023, studentCount: 38 },
      { name: '电气自动化技术2303', major: '电气自动化技术', grade: 2023, studentCount: 52 },
      { name: '工业机器人技术2401', major: '工业机器人技术', grade: 2024, studentCount: 42 },
      { name: '物联网应用技术2401', major: '物联网应用技术', grade: 2024, studentCount: 40 },
      { name: '汽车检测与维修技术2402', major: '汽车检测与维修技术', grade: 2024, studentCount: 36 },
    ])
    .returning({ id: schema.classGroups.id, name: schema.classGroups.name })

  const classByName = new Map(insertedClasses.map((row) => [row.name, row.id]))

  /* ------------------------------- 课程 ------------------------------- */
  const insertedCourses = await db
    .insert(schema.courses)
    .values([
      { code: 'JC01001', name: '机械制图与CAD', courseType: 'theory', credits: 4, hours: 64 },
      { code: 'JC01002', name: '液压与气动技术', courseType: 'integrated', credits: 3.5, hours: 56 },
      { code: 'JC01003', name: '数控加工工艺与编程', courseType: 'practice', credits: 4, hours: 72 },
      { code: 'JD02001', name: 'PLC控制系统安装与调试', courseType: 'integrated', credits: 4, hours: 64 },
      { code: 'JD02002', name: '工业机器人操作与编程', courseType: 'practice', credits: 3.5, hours: 56 },
      { code: 'ZD03001', name: '电气控制线路安装与检修', courseType: 'practice', credits: 4, hours: 72 },
      { code: 'ZD03002', name: '传感器与检测技术', courseType: 'theory', credits: 3, hours: 48 },
      { code: 'ZX04001', name: '顶岗实习', courseType: 'internship', credits: 8, hours: 240 },
    ])
    .returning({ id: schema.courses.id, code: schema.courses.code })

  const courseByCode = new Map(insertedCourses.map((row) => [row.code, row.id]))
  const id = (map: Map<string, string>, key: string): string => map.get(key)!

  /* ------------------------------ 授课任务 ------------------------------ */
  await db.insert(schema.teachingTasks).values([
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'JC01001'),
      classId: id(classByName, '机电一体化技术2301'),
      location: 'A101 制图室',
      weekday: 1,
      startSection: 1,
      endSection: 2,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 64,
      studentCount: 45,
      repeatIndex: 1,
      remark: '使用项目化教学，配套三维建模实训',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'JC01002'),
      classId: id(classByName, '机电一体化技术2301'),
      location: '液压实训室',
      weekday: 1,
      startSection: 3,
      endSection: 4,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 56,
      studentCount: 45,
      repeatIndex: 1,
      remark: '',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'JC01003'),
      classId: id(classByName, '数控技术2302'),
      location: '数控实训中心',
      weekday: 2,
      startSection: 1,
      endSection: 4,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 72,
      studentCount: 38,
      repeatIndex: 1,
      remark: '含 FANUC 系统加工中心操作实训',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'JD02001'),
      classId: id(classByName, '电气自动化技术2303'),
      location: '电气实训室',
      weekday: 3,
      startSection: 5,
      endSection: 6,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'odd',
      totalHours: 48,
      studentCount: 52,
      repeatIndex: 1,
      remark: '单周上课，合班教学',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'ZD03002'),
      classId: id(classByName, '物联网应用技术2401'),
      location: 'B203',
      weekday: 4,
      startSection: 1,
      endSection: 2,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 48,
      studentCount: 40,
      repeatIndex: 1,
      remark: '',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      courseId: id(courseByCode, 'JC01001'),
      classId: id(classByName, '工业机器人技术2401'),
      location: 'A102 制图室',
      weekday: 5,
      startSection: 3,
      endSection: 4,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 64,
      studentCount: 42,
      repeatIndex: 2,
      remark: '同一课程第二次授课，按重复课系数 0.9 折算',
    },
    {
      teacherId: teacher2,
      termId: currentTerm,
      courseId: id(courseByCode, 'ZD03001'),
      classId: id(classByName, '机电一体化技术2302'),
      location: '电气实训室',
      weekday: 2,
      startSection: 5,
      endSection: 8,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 72,
      studentCount: 43,
      repeatIndex: 1,
      remark: '',
    },
    {
      teacherId: teacher2,
      termId: previousTerm,
      courseId: id(courseByCode, 'JD02002'),
      classId: id(classByName, '工业机器人技术2401'),
      location: '机器人实训中心',
      weekday: 4,
      startSection: 5,
      endSection: 8,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      totalHours: 56,
      studentCount: 42,
      repeatIndex: 1,
      remark: '',
    },
  ])

  /* ---------------------------- 其它工作量 ---------------------------- */
  await db.insert(schema.workloadItems).values([
    {
      teacherId: teacher1,
      termId: currentTerm,
      category: 'competition_guide',
      title: '2026年省职业院校技能大赛"工业机器人技术应用"赛项指导',
      quantity: 1,
      occurredOn: '2026-05-22',
      remark: '获省级二等奖',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      category: 'thesis_guide',
      title: '2027届毕业设计（论文）指导',
      quantity: 8,
      occurredOn: '2026-09-10',
      remark: '',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      category: 'internship_guide',
      title: '2027届顶岗实习巡回指导',
      quantity: 16,
      occurredOn: '2026-09-08',
      remark: '覆盖 4 家合作企业',
    },
    {
      teacherId: teacher1,
      termId: currentTerm,
      category: 'teaching_research',
      title: '智能制造教研室集体备课与听课评课',
      quantity: 8,
      occurredOn: '2026-09-09',
      remark: '',
    },
    {
      teacherId: teacher1,
      termId: previousTerm,
      category: 'social_training',
      title: '面向合作企业职工开展 PLC 控制系统技能提升培训',
      quantity: 16,
      occurredOn: '2026-06-18',
      remark: '',
    },
  ])

  /* ---------------------------- 教科研成果 ---------------------------- */
  await db.insert(schema.achievements).values([
    {
      teacherId: teacher1,
      category: 'paper',
      title: '产教融合背景下高职数控专业课程改革实践',
      level: 'provincial',
      role: '第一作者',
      achievedOn: '2026-03-15',
      score: null,
      description: '发表于《职业技术教育》2026年第3期',
    },
    {
      teacherId: teacher1,
      category: 'project',
      title: '基于数字孪生的智能制造实训教学改革研究',
      level: 'provincial',
      role: '主持人',
      achievedOn: '2025-11-20',
      score: null,
      description: '省教育科学规划课题，在研',
    },
    {
      teacherId: teacher1,
      category: 'competition',
      title: '省职业院校技能大赛 工业机器人技术应用赛项 二等奖',
      level: 'provincial',
      role: '指导教师',
      achievedOn: '2026-05-22',
      score: null,
      description: '指导学生团队获省级二等奖',
    },
    {
      teacherId: teacher1,
      category: 'patent',
      title: '一种数控机床自动上下料装置',
      level: 'national',
      role: '第一发明人',
      achievedOn: '2025-09-08',
      score: null,
      description: '实用新型专利，已授权',
    },
    {
      teacherId: teacher1,
      category: 'textbook',
      title: '《液压与气动技术项目化教程》',
      level: 'school',
      role: '副主编',
      achievedOn: '2025-06-30',
      score: null,
      description: '校级规划教材',
    },
    {
      teacherId: teacher1,
      category: 'training',
      title: '2026年暑期"双师型"教师企业实践能力提升研修班',
      level: 'national',
      role: '参训学员',
      achievedOn: '2026-07-20',
      score: null,
      description: '国家级培训项目，计 60 学时',
    },
    {
      teacherId: teacher1,
      category: 'paper',
      title: '高职实训课教学质量评价指标体系构建',
      level: 'school',
      role: '独著',
      achievedOn: '2026-06-10',
      score: null,
      description: '校级优秀论文',
    },
    {
      teacherId: teacher1,
      category: 'competition',
      title: '校级教师教学能力比赛 一等奖',
      level: 'school',
      role: '主讲人',
      achievedOn: '2026-04-28',
      score: null,
      description: '推荐参加省级比赛',
    },
    {
      teacherId: teacher2,
      category: 'project',
      title: '高职电气类专业"岗课赛证"融通人才培养模式研究',
      level: 'municipal',
      role: '主持人',
      achievedOn: '2026-01-12',
      score: null,
      description: '市厅级教改课题',
    },
  ])

  /* ------------------------ 企业实践（双师型） ------------------------ */
  await db.insert(schema.enterprisePractices).values([
    {
      teacherId: teacher1,
      company: '宁波海天精工股份有限公司',
      position: '数控工艺工程师',
      startDate: '2024-07-08',
      endDate: '2024-08-16',
      days: 40,
      description: '参与加工中心工艺编制与夹具设计，完成 3 套典型零件工艺文件',
    },
    {
      teacherId: teacher1,
      company: '浙江双环传动机械股份有限公司',
      position: '智能产线调试工程师',
      startDate: '2025-07-07',
      endDate: '2025-08-29',
      days: 54,
      description: '参与齿轮加工自动线调试，形成教学案例 2 个',
    },
    {
      teacherId: teacher1,
      company: '杭州新松机器人自动化有限公司',
      position: '机器人应用工程师',
      startDate: '2026-07-06',
      endDate: '2026-08-07',
      days: 33,
      description: '参与协作机器人工作站集成调试，反哺《工业机器人操作与编程》课程',
    },
    {
      teacherId: teacher2,
      company: '正泰电器股份有限公司',
      position: '电气设计工程师',
      startDate: '2025-07-01',
      endDate: '2025-08-20',
      days: 51,
      description: '参与低压电器成套设备电气设计',
    },
  ])

  /* --------------------------- 调课 / 请假 --------------------------- */
  await db.insert(schema.applications).values([
    {
      teacherId: teacher1,
      type: 'adjust_class',
      taskId: null,
      originalDate: '2026-09-15',
      originalSection: '第1-4节',
      targetDate: '2026-09-17',
      targetSection: '第5-8节',
      reason: '赴合作企业参加产教融合项目对接会，申请将《数控加工工艺与编程》调至本周四下午',
      status: 'pending',
    },
    {
      teacherId: teacher1,
      type: 'leave',
      originalDate: '2026-09-10',
      originalSection: '第1-2节',
      targetDate: null,
      targetSection: '',
      reason: '参加省级教师教学能力提升培训，需请假一次',
      status: 'approved',
      reviewerId: admin,
      reviewComment: '同意，已协调同教研室教师代课',
      reviewedAt: new Date('2026-09-08T09:20:00+08:00'),
    },
    {
      teacherId: teacher1,
      type: 'adjust_class',
      originalDate: '2026-09-08',
      originalSection: '第5-6节',
      targetDate: '2026-09-11',
      targetSection: '第7-8节',
      reason: '个人事务需要调整上课时间，申请调至本周五',
      status: 'rejected',
      reviewerId: admin,
      reviewComment: '本周实训室已排满，建议改约下周并提前三天提交',
      reviewedAt: new Date('2026-09-05T16:05:00+08:00'),
    },
    {
      teacherId: teacher2,
      type: 'adjust_class',
      originalDate: '2026-09-16',
      originalSection: '第5-8节',
      targetDate: '2026-09-18',
      targetSection: '第1-4节',
      reason: '实训设备检修，申请调整《电气控制线路安装与检修》上课时间',
      status: 'pending',
    },
  ])

  /* ----------------------------- 通知公告 ----------------------------- */
  const insertedNotices = await db
    .insert(schema.notices)
    .values([
      {
        title: '关于开展 2026 年度"双师型"教师认定工作的通知',
        content:
          '各二级学院：\n根据《职业教育"双师型"教师基本标准（试行）》及学校相关规定，现启动 2026 年度"双师型"教师认定工作。\n\n一、申报条件\n1. 具有讲师及以上专业技术职务；\n2. 近 5 年累计企业实践时间不少于 6 个月；\n3. 具备相应职业资格证书或主持（参与）过校企合作项目。\n\n二、材料要求\n1. 《"双师型"教师认定申请表》；\n2. 企业实践证明材料（协议、鉴定表、考勤记录）；\n3. 教学与科研成果佐证材料。\n\n三、时间安排\n请于 9 月 30 日前将纸质材料报送教师发展中心（行政楼 411），电子版发送至 jsfz@example.edu.cn。',
        category: 'hr',
        isTop: true,
        publisherId: admin,
        publishedAt: new Date('2026-09-08T08:30:00+08:00'),
      },
      {
        title: '2026-2027 学年第一学期教学任务核对通知',
        content:
          '各位老师：\n本学期教学任务已在教学工作台发布，请于 9 月 15 日前完成核对。\n\n核对要点：课程名称、授课班级、人数、总学时、上课时间与地点。\n如发现信息有误，请通过"调课申请"模块提交，或联系教务处 张老师（内线 8021）。\n\n特别提醒：本学期起，教学工作量按课程类型系数、班级规模系数与重复课系数自动折算，具体规则见工作台"教学工作量"页面说明。',
        category: 'academic',
        isTop: false,
        publisherId: admin,
        publishedAt: new Date('2026-09-05T10:00:00+08:00'),
      },
      {
        title: '关于申报 2026 年度校级教科研课题的通知',
        content:
          '各二级学院、各部门：\n为深化产教融合、提升教师教科研能力，现组织申报 2026 年度校级教科研课题。\n\n选题方向：\n1. 专业设置与产业需求动态匹配机制研究；\n2. "岗课赛证"融通的人才培养模式改革；\n3. 数字化实训教学资源建设与应用。\n\n申报截止时间：2026 年 9 月 25 日。\n申报材料：《课题申请书》一式三份及电子稿。',
        category: 'research',
        isTop: false,
        publisherId: admin,
        publishedAt: new Date('2026-09-03T14:20:00+08:00'),
      },
      {
        title: '教师企业实践登记与材料提交提醒',
        content:
          '各位老师：\n按学校师资队伍建设规划要求，专任教师每 5 年应累计赴企业集中实践 6 个月（约 180 天）。\n请尚未录入企业实践记录的老师，登录教学工作台"企业实践"模块完成登记，并上传企业实践鉴定表扫描件。\n\n工作台已自动统计近 5 年累计实践天数并显示进度，请据此规划本年度实践安排。',
        category: 'hr',
        isTop: false,
        publisherId: admin,
        publishedAt: new Date('2026-08-28T09:15:00+08:00'),
      },
      {
        title: '2026 年校级教师教学能力比赛报名开始',
        content:
          '为提升教师教学能力，选拔参加省赛团队，学校决定举办 2026 年校级教师教学能力比赛。\n\n比赛内容：教学设计、课堂教学展示、教学反思。\n报名方式：以教学团队为单位，9 月 22 日前报送初赛作品。\n奖励：设一、二、三等奖，获奖情况计入教师年度考核与职称评审业绩。',
        category: 'academic',
        isTop: false,
        publisherId: admin,
        publishedAt: new Date('2026-08-25T11:40:00+08:00'),
      },
      {
        title: '实训室安全检查与设备报修流程调整',
        content:
          '为规范实训室管理，自本学期起设备报修统一通过教学平台提交，实训室管理员 2 个工作日内响应。\n请各位任课教师在开学第一周完成所辖实训室的安全自查，检查表交实训中心备案。',
        category: 'general',
        isTop: false,
        publisherId: admin,
        publishedAt: new Date('2026-08-20T15:00:00+08:00'),
      },
    ])
    .returning({ id: schema.notices.id, title: schema.notices.title })

  /* ------------------------------ 通知已读 ------------------------------ */
  const readTitles = ['2026-2027 学年第一学期教学任务核对通知', '实训室安全检查与设备报修流程调整']
  const readRows = insertedNotices
    .filter((notice) => readTitles.includes(notice.title))
    .map((notice) => ({ noticeId: notice.id, userId: teacher1 }))
  if (readRows.length > 0) {
    await db.insert(schema.noticeReads).values(readRows)
  }

  /* -------------------------------- 待办 -------------------------------- */
  await db.insert(schema.todos).values([
    {
      teacherId: teacher1,
      title: '提交 2026-2027 学年第一学期教学任务确认单',
      dueDate: '2026-09-15',
      priority: 'high',
      status: 'pending',
      relatedType: '教学任务',
    },
    {
      teacherId: teacher1,
      title: '完成"双师型"教师认定材料上传',
      dueDate: '2026-09-20',
      priority: 'high',
      status: 'pending',
      relatedType: '师资认定',
    },
    {
      teacherId: teacher1,
      title: '填写本学期实训室使用计划',
      dueDate: '2026-09-18',
      priority: 'medium',
      status: 'pending',
      relatedType: '实训管理',
    },
    {
      teacherId: teacher1,
      title: '申报 2026 年度校级教科研课题',
      dueDate: '2026-09-25',
      priority: 'medium',
      status: 'pending',
      relatedType: '教科研',
    },
    {
      teacherId: teacher1,
      title: '上报 2027 届毕业设计指导选题汇总表',
      dueDate: '2026-09-28',
      priority: 'low',
      status: 'pending',
      relatedType: '毕业设计',
    },
    {
      teacherId: teacher1,
      title: '参加师德师风专题学习',
      dueDate: '2026-09-05',
      priority: 'low',
      status: 'done',
      relatedType: '培训',
      completedAt: new Date('2026-09-04T17:10:00+08:00'),
    },
  ])
}

async function runCli(): Promise<void> {
  console.log('[seed] 正在写入演示数据 ...')
  await seedDemoData()
  console.log(`[seed] 完成。演示账号：t1001 / t1002 / admin，密码：${DEMO_PASSWORD}`)
  const { pool } = await import('./client')
  await pool.end()
}

const entry = process.argv[1] ? process.argv[1].split(/[\\/]/).pop() : ''
if (entry === 'seed.ts' || entry === 'seed.js' || entry === 'seed.mts') {
  runCli().catch(async (error) => {
    console.error('[seed] 失败：', error)
    process.exit(1)
  })
}
