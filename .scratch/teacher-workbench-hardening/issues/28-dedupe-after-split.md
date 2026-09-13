# 28: 宽重构后遗留的三处重复代码

**What to build:** 两轴评审（Standards）指出工单 19–24 的宽重构在消除"页面内重复"之后，把重复**搬到了新抽出的模块之间**：同一段列定义、同一段进度文案与算式、同一个柱状图配置各出现了两份。这几处都不影响正确性，但正是当初做这次重构要消灭的东西，留着会让下一个人照着复制第三份。

**Blocked by:** 24 拆分超大页面

**Status:** ready-for-agent

- [ ] 申请页两份列定义合一：`MyApplications` 与 `PendingApprovals` 的列定义中，申请类型 / 关联课程班级 / 原上课时间 / 调整后时间 / 事由五列逐字相同，仅"操作"列不同
- [ ] 工作量进度展示合一：`workload/WorkloadSummary.tsx` 与 `dashboard/ProgressPanels.tsx` 都在算 `Math.min(100, Math.round(rate * 1000) / 10)` 并输出同一套"已超出基本工作量…／距离基本工作量还差…"文案；`dashboard/DashboardStats.tsx` 还重复了"达成"的措辞
- [ ] 柱状图配置合一：`achievement/chartOptions.ts::buildCategoryOption` 与 `dashboard/chartOptions.ts::buildAchievementChartOption` 结构相同，仅 `barWidth` 与 `axisLabel.rotate` 不同
- [ ] 全量测试与类型检查保持绿色

## 来源

工单 22/24 完成后跑的两轴代码评审，Standards 轴给出的三条 Duplicated Code（判为 judgement call，非硬性违规）。本工单记录在案，避免随会话结束而丢失。

## 说明

这三处都是**跨模块的重复**，与工单 21 处理的"页面内重复 UI 写法"不同：21 的目标已达成（那类写法在页面里只剩构建块一处）。本工单属于重构的收尾清理，**不应在做 19–24 时顺手做掉**——那时页面还在迁移中，提前抽象容易抽到错的形状。现在结构稳定了，抽象的依据才清楚。
