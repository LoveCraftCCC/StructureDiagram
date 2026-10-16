/**
 * demo-html.mjs — HTML 版样张（主产物）。内容与 pptx 版 demo 一致，便于对比。
 * 运行：node examples/demo-html.mjs
 * 目检：node scripts/render-check-html.mjs examples/out/demo.html
 */
import { Deck } from '../scripts/html-deck.mjs';

const d = new Deck();

d.cover({
  title: '智能客服系统 Q3 运营复盘',
  subtitle: '降本已达标，提效瓶颈在复杂工单流转',
  meta: '运营分析组 · 2026-10',
});

d.agenda({
  items: ['结论先行', '关键指标', '成本结构变化', '效率瓶颈定位', '改进优先级', '下一步'],
});

d.bullets({
  title: 'Q3 结论：成本下降 18%，但复杂工单处理时长反升 22%',
  items: [
    { h: '降本达标', t: '单位会话成本 2.4→1.97 元，主要来自自助解决率提升' },
    { h: '提效遇阻', t: '简单问题 78% 由机器人闭环，复杂工单仍全量转人工' },
    { h: '根因明确', t: '复杂工单平均流转 2.7 次，知识库覆盖率仅 41%' },
    { h: '对策聚焦', t: 'Q4 优先建复杂工单辅助流，预期再降人工时长 15%' },
  ],
});

d.kpi({
  title: '三项核心指标全部改善，唯独人工处理时长恶化',
  items: [
    { value: '1.97 元', label: '单位会话成本', delta: '18%', dir: 'down', tone: 'good' },
    { value: '78%', label: '自助解决率', delta: '11pp', dir: 'up', tone: 'good' },
    { value: '41%', label: '知识库覆盖率', delta: '4pp', dir: 'up', tone: 'good' },
    { value: '14.2 分钟', label: '人工平均处理时长', delta: '22%', dir: 'up', tone: 'bad' },
  ],
  source: '客服平台 Q3 报表（7–9 月日均）',
});

d.chart({
  title: '单位会话成本逐月下降，9 月已低于年度目标线',
  subtitle: '单位：元 / 会话（年度目标 2.10 元，9 月首次低于目标）',
  kind: 'line',
  axisMin: 1.8, axisMax: 2.5,
  data: {
    labels: ['7月', '8月', '9月'],
    series: [{ name: '单位会话成本', values: [2.41, 2.15, 1.97] }],
  },
  source: '客服平台成本报表',
});

d.waterfall({
  title: '成本下降主因是自助率提升，模型调用费小幅上升',
  subtitle: '单位会话成本环比变化拆解（元）',
  start: 2.41,
  items: [
    { label: '自助率提升', delta: -0.36 },
    { label: '会话时长缩短', delta: -0.14 },
    { label: '模型调用', delta: +0.05 },
    { label: '夜间坐席', delta: +0.01 },
  ],
  end: 1.97,
  source: '成本报表 × 归因模型',
});

d.matrix({
  title: '改进举措按「收益 × 实施难度」排序，知识库补齐是首选',
  xLeft: '实施快', xRight: '实施慢', yTop: '收益高', yBottom: '收益低',
  cells: [
    { head: '立刻做', items: ['知识库补齐 Top200 场景', '复杂工单自动摘要'] },
    { head: '排期做', items: ['工单辅助流（Agent 辅助填单）', '坐席话术实时推荐'] },
    { head: '顺手做', items: ['报表口径统一', '满意度回访自动化'] },
    { head: '暂不做', items: ['全渠道中台重构'] },
  ],
});

d.columns({
  title: '复杂工单的 2.7 次流转中，67% 卡在信息补全环节',
  columns: [
    { head: '流转环节', items: ['用户提交 → 一线', '一线 → 二线', '二线 → 专家'] },
    { head: '占比', items: ['21%', '67%', '12%'] },
    { head: '卡点', items: ['描述不全，缺设备信息', '权限与知识断层', '仅限疑难缺陷'] },
  ],
  source: '工单系统 9 月抽样 1,200 单',
});

d.timeline({
  title: 'Q4 落地节奏：辅助流 11 月上线，12 月复盘验收',
  events: [
    { when: '10 月', what: '知识库 Top200 补齐，口径统一' },
    { when: '11 月上', what: '复杂工单辅助流灰度（20% 流量）' },
    { when: '11 月下', what: '全量上线，坐席话术推荐' },
    { when: '12 月中', what: '效果复盘，目标人工时长 -15%' },
  ],
  source: '项目排期 v1.2',
});

d.table({
  title: '各渠道自助率差异大，App 端是短板',
  head: ['渠道', '会话量（万）', '自助率', '环比'],
  aligns: ['left', 'right', 'right', 'right'],
  rows: [
    ['小程序', '412', '83%', '+6pp'],
    ['App', '265', '64%', '-2pp'],
    ['网页', '98', '81%', '+9pp'],
    ['电话', '31', '—', '—'],
  ],
  source: '客服平台 Q3 报表',
});

d.closing({
  title: '下一步',
  items: [
    { what: '知识库 Top200 场景补齐', who: '知识运营组', when: '10 月底' },
    { what: '复杂工单辅助流灰度上线', who: '平台研发', when: '11 月上' },
    { what: 'App 端自助入口改版', who: '端侧 + 设计', when: '11 月下' },
    { what: 'Q4 复盘：人工时长 -15% 验收', who: '运营分析组', when: '12 月中' },
  ],
});

d.build('examples/out/demo.html', { title: '智能客服系统 Q3 运营复盘' });
