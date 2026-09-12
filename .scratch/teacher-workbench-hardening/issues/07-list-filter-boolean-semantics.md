# 07: 列表筛选布尔语义修正

**What to build:** 申请列表的 `mine` 查询参数用了强制布尔转换，而查询串永远是字符串，转换语义是"非空即真"。实测：`?mine=false`、`?mine=0`、`?mine=False` 全部被当成 `true`。于是管理员想显式声明"不限定为本人"、查看全院系申请时，反而被强制只看自己的数据。这是难以察觉的语义错误——看代码像对的，跑起来是错的。

**Blocked by:** None（可立即开始）

**Status:** done

- [x] `?mine=true` 表示只看本人
- [x] `?mine=false` 表示不限定为本人（管理员可看本院系全部）
- [x] 不传 `mine` 时保持既有默认行为：管理员看本院系全部，普通教师只看本人
- [x] 非法取值（如 `?mine=abc`）被拒绝为参数错误，而不是静默当成真
- [x] 新增测试覆盖 true / false / 缺省 / 非法 四种取值（`apps/api/test/application.test.ts` 新增 6 条）
- [x] 全量测试与类型检查保持绿色（shared 2 / api 8 / web 2 个测试文件全通过，`typecheck` exit 0）

**实现说明：** 改为显式接受 `'true' | 'false'` 两个字符串再转换，取值不在其中即 400。先写测试见 4 条失败（`mine=false` 返回 0 条、非法取值返回 200），再改契约转绿。

**顺带修掉同源问题：** 发布通知的 `isTop` 也用了同样的强制转换（来自 JSON body，真布尔时无害，但传字符串 `"false"` 会被静默当成真）。一并改为严格布尔。这是同一根因，放在同一次提交里。

**影响的消费方已核对：** 前端 `applicationApi.list` 传 `mine: true`（序列化为 `mine=true`），`noticeApi.create` 传真实布尔，均与新契约兼容。
