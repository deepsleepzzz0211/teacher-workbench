import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const SIZES = [128, 64, 32, 24, 16]

const CANDIDATES = [
  {
    key: 'A',
    file: 'a-cap.svg',
    name: '学士帽',
    why: '教育属性最直白，跨文化都一眼认出。优点通用好认；缺点是与"工作台"这个具体产品关系弱——别的教育类产品也能用同一个图标。',
  },
  {
    key: 'B',
    file: 'b-board.svg',
    name: '业务档案板 + 工作量柱状',
    why: '最贴合产品：外板=教师个人业务档案（需求原文就提到"建立教师个人业务档案"），内部三根递增柱=工作量自动折算汇总。一个图标里放进"承载物"和"产品能力"两层意思。',
  },
  {
    key: 'C',
    file: 'c-trend.svg',
    name: '工作量趋势线',
    why: '直指"录入即自动汇总"这个卖点，形状最简、16px 下最不容易糊。缺点是偏通用的"数据工具"感，教育属性完全没有。',
  },
  {
    key: 'D',
    file: 'd-monogram.svg',
    name: 'T 字标（Teacher）+ 柱状',
    why: '品牌向：横杠是 T 的顶，中间竖杠既是 T 的竖、也是最高的那根柱，两侧短柱补足"数据"。字形与图表共用笔画，记忆点最强；缺点是 T 与工作量的关联需要一句解释。',
  },
]

const svgOf = (file) => {
  const raw = readFileSync(resolve(dir, file), 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '')
  return raw.replace(/\swidth="64"\sheight="64"/, '')
}

const dataUri = (file) =>
  'data:image/svg+xml;base64,' + Buffer.from(svgOf(file), 'utf8').toString('base64')

const img = (file, size) =>
  `<img src="${dataUri(file)}" width="${size}" height="${size}" alt="">`

const section = (c) => `
  <section class="card">
    <div class="head"><span class="key">${c.key}</span><span class="name">${c.name}</span></div>
    <p class="why">${c.why}</p>

    <div class="sizes">
      ${SIZES.map((s) => `<div class="size">${img(c.file, s)}<div class="label">${s}px</div></div>`).join('')}
    </div>

    <div class="plates">
      <div class="plate light">${img(c.file, 16)}<span class="cap">浅色标签栏</span></div>
      <div class="plate dark">${img(c.file, 16)}<span class="cap">深色标签栏</span></div>
    </div>

    <div class="tabs dark">
      <div class="tab active">${img(c.file, 16)}<span class="t">高职院校教师工作台</span><span class="x">×</span></div>
      <div class="tab"><span class="t">新建标签页</span></div>
    </div>
    <div class="tabs light">
      <div class="tab active">${img(c.file, 16)}<span class="t">高职院校教师工作台</span><span class="x">×</span></div>
      <div class="tab"><span class="t">新建标签页</span></div>
    </div>
  </section>`

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>favicon 候选评审</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --page:#f8fafc; --card:#fff; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px; background:var(--page); color:var(--ink);
         font:14px/1.6 "PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 28px; font-size:13px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px;
          padding:18px 20px 0; margin-bottom:16px; overflow:hidden; }
  .head { display:flex; align-items:center; gap:10px; }
  .key { font-weight:700; background:#1d4ed8; color:#fff; width:22px; height:22px;
         border-radius:6px; display:inline-grid; place-items:center; font-size:12px; }
  .name { font-weight:600; }
  .why { color:var(--muted); font-size:12.5px; margin:8px 0 16px 32px; }
  .sizes { display:flex; gap:28px; align-items:flex-end; flex-wrap:wrap; margin-left:32px; }
  .size { text-align:center; }
  .size .label { font-size:11px; color:var(--muted); margin-top:6px; }
  .plates { display:flex; gap:10px; margin:16px 0 0 32px; flex-wrap:wrap; }
  .plate { border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:10px; }
  .plate.light { background:#fff; border:1px solid var(--line); }
  .plate.dark { background:#202124; border:1px solid #202124; }
  .plate .cap { font-size:11px; }
  .plate.light .cap { color:var(--muted); }
  .plate.dark .cap { color:#9aa0a6; }
  .tabs { margin-left:32px; padding:6px 6px 0; display:flex; gap:4px; }
  .tabs.dark { background:#202124; margin-top:16px; border-radius:8px 8px 0 0; }
  .tabs.light { background:#dee1e6; margin-top:0; }
  .tab { display:flex; align-items:center; gap:7px; padding:6px 12px;
         border-radius:8px 8px 0 0; font-size:12px; max-width:250px; }
  .tabs.dark .tab { color:#9aa0a6; }
  .tabs.dark .tab.active { background:#35363a; color:#e8eaed; }
  .tabs.light .tab { color:#5f6368; }
  .tabs.light .tab.active { background:#fff; color:#202124; }
  .tab .t { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tab .x { font-size:13px; }
  .note { color:var(--muted); font-size:12.5px; margin-top:8px; }
</style>
</head>
<body>
  <h1>favicon 候选 · 4 个方向</h1>
  <p class="sub">按真实尺寸渲染（不是放大效果图），并各放在浅色 / 深色标签栏上看一次。<strong>重点看 16px 那一列</strong>——标签页里九成时间就是它。</p>
  ${CANDIDATES.map(section).join('\n')}
  <p class="note">看中哪个方向告诉我，我再按它出微调版本（线宽、留白、明暗对比），最后接进 apps/web/public 并加一行 index.html 声明。</p>
</body>
</html>
`

writeFileSync(resolve(dir, 'index.html'), html, 'utf8')
console.log('已生成静态预览页，内联 SVG 数：', CANDIDATES.length * (SIZES.length + 4))
