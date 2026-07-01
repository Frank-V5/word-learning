<template>
  <div class="su-page">
    <!-- 头部 -->
    <div class="su-header" :class="{ parent: parentMode }">
      <div class="su-h1">
        <span class="su-title">☀️ 暑假计划</span>
        <button class="su-parent" @click="parentMode ? exitParent() : enterParent()">
          {{ parentMode ? '👨‍👩‍👧 家长模式 · 退出' : '👨‍👩‍👧 家长' }}
        </button>
      </div>
      <div class="su-date">{{ prettyDate(currentDate) }} {{ weekdayLabel(currentDate) }}<span v-if="isToday(currentDate)"> · 今天</span></div>
      <!-- 分段 -->
      <div class="su-segs">
        <button :class="['su-seg', { on: tab === 'today' }]" @click="switchTab('today')">今日</button>
        <button :class="['su-seg', { on: tab === 'week' }]" @click="switchTab('week')">本周</button>
        <button :class="['su-seg', { on: tab === 'month' }]" @click="switchTab('month')">本月</button>
        <span v-if="tab === 'today'" class="su-prog">已完成 {{ approvedCount }}/{{ tasks.length }}</span>
        <button v-if="tab === 'today'" class="su-edit" @click="editing = !editing">{{ editing ? '✔ 完成' : '✏️ 编辑' }}</button>
      </div>
    </div>

    <!-- 今日 -->
    <div v-if="tab === 'today'" class="su-body">
      <div v-if="loading" class="su-empty">加载中…</div>

      <div v-else-if="!tasks.length && !editing" class="su-empty big">
        <div class="sun">☀️</div>
        <div>这一天还没有安排任务</div>
        <div class="su-empty-btns">
          <button class="su-add-main" @click="openAdd()">＋ 添加任务</button>
          <button class="su-copy" @click="copyYesterday()">复制昨天</button>
        </div>
      </div>

      <div v-else class="su-cards">
        <div v-for="(t, i) in tasks" :key="t.id || ('new'+i)" class="su-card" :class="cardClass(t)">
          <div class="su-card-bar"></div>
          <div class="su-card-main" @click="editing ? openEdit(t) : null">
            <div class="su-card-top">
              <span class="su-cat">{{ catEmoji(t.category) }}</span>
              <span class="su-name">{{ t.name }}</span>
              <span class="su-chip" :class="chipClass(t)">{{ chipText(t) }}</span>
            </div>
            <div class="su-standard">标准：{{ t.standard || '—' }}</div>
            <div class="su-meta">
              <span v-if="t.child_checked">🧒 已打卡{{ t.child_at ? ' · ' + shortTime(t.child_at) : '' }}</span>
              <span v-if="t.parent_status === 'approved'"> · 👨‍👩 已确认{{ t.parent_at ? ' · ' + shortTime(t.parent_at) : '' }}</span>
            </div>
          </div>

          <!-- 编辑模式控件 -->
          <div v-if="editing" class="su-edit-ctrls">
            <button @click.stop="move(i, -1)" :disabled="i === 0">↑</button>
            <button @click.stop="move(i, 1)" :disabled="i === tasks.length - 1">↓</button>
            <button class="del" @click.stop="remove(i)">🗑</button>
          </div>

          <!-- 操作按钮 (非编辑模式) -->
          <div v-else class="su-actions">
            <template v-if="!isApproved(t)">
              <button v-if="!t.child_checked" class="btn-child" @click.stop="doCheckin(t, true)">🧒 我做完了</button>
              <button v-else class="btn-undo" @click.stop="doCheckin(t, false)">撤销</button>
            </template>
            <template v-if="parentMode && t.child_checked">
              <button v-if="!isApproved(t)" class="btn-confirm" @click.stop="doConfirm(t, 'approve')">✅ 确认</button>
              <button class="btn-reject" @click.stop="doConfirm(t, 'reject')">🔁 {{ isApproved(t) ? '退回' : '打回' }}</button>
            </template>
          </div>
        </div>

        <button v-if="editing" class="su-add-row" @click="openAdd()">＋ 添加任务</button>
        <button v-if="editing && tasks.length" class="su-copy small" @click="copyYesterday()">从昨天复制</button>
      </div>
    </div>

    <!-- 本周 -->
    <div v-else-if="tab === 'week'" class="su-body">
      <div class="su-nav"><button @click="shiftWeek(-1)">‹</button><span>{{ prettyDate(weekDays[0]) }} - {{ prettyDate(weekDays[6]) }}</span><button @click="shiftWeek(1)">›</button></div>
      <div v-for="d in weekData" :key="d.date" class="su-wrow" :class="{ today: isToday(d.date) }" @click="gotoDate(d.date)">
        <span class="su-wd">{{ weekdayLabel(d.date) }} · {{ prettyDate(d.date) }}</span>
        <span class="su-wbar"><span class="su-wfill" :style="{ width: (d.total ? (d.approved / d.total) * 100 : 0) + '%' }"></span></span>
        <span class="su-wcnt">{{ d.approved }}/{{ d.total }}</span>
        <span class="su-wtag">{{ weekTag(d) }}</span>
      </div>
    </div>

    <!-- 本月 -->
    <div v-else class="su-body">
      <div class="su-nav"><button @click="shiftMonth(-1)">‹</button><span>{{ viewYear }}年{{ viewMonth }}月 · 坚持 {{ monthApprovedDays }}/{{ monthElapsedDays }} 天</span><button @click="shiftMonth(1)">›</button></div>
      <div class="su-cal">
        <div class="su-cal-h">一</div><div class="su-cal-h">二</div><div class="su-cal-h">三</div><div class="su-cal-h">四</div><div class="su-cal-h">五</div><div class="su-cal-h">六</div><div class="su-cal-h">日</div>
        <div v-for="(c, i) in calCells" :key="i" class="su-cal-cell" :class="cellClass(c)" @click="c.date && gotoDate(c.date)">
          <span v-if="c.date" class="su-cal-d">{{ Number(c.date.slice(8)) }}</span>
          <span v-if="c.date && c.total" class="su-cal-dot"></span>
        </div>
      </div>
      <div class="su-legend"><span>● 完成</span><span>◐ 部分</span><span>○ 未做</span><span>· 未来</span></div>
    </div>

    <!-- 编辑/添加 弹层 -->
    <div v-if="sheet.open" class="su-mask" @click.self="sheet.open = false">
      <div class="su-sheet">
        <div class="su-sheet-title">{{ sheet.task.id ? '编辑任务' : '添加任务' }}</div>
        <div class="su-field-label">分类</div>
        <div class="su-cats">
          <button v-for="c in CATS" :key="c.key" :class="['su-cat-chip', { on: sheet.task.category === c.key }]" @click="sheet.task.category = c.key">{{ c.emoji }} {{ c.key }}</button>
        </div>
        <div class="su-field-label">任务名</div>
        <input class="su-input" v-model="sheet.task.name" placeholder="如：数学 / 跳绳 / 洗碗" />
        <div class="su-field-label">完成标准</div>
        <textarea class="su-input" rows="2" v-model="sheet.task.standard" placeholder="怎样算完成？如：做2页且正确率≥80%"></textarea>
        <div class="su-sheet-btns">
          <button v-if="sheet.task.id" class="su-sheet-del" @click="deleteFromSheet()">删除</button>
          <button class="su-sheet-save" @click="saveFromSheet()" :disabled="!sheet.task.name.trim()">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { fetchSummerDay, saveSummerDay, summerCheckin, summerConfirm, fetchSummerWeek, fetchSummerMonth, todayStr, mondayOf, addDays, prettyDate, weekdayLabel } from '../utils/summer'

const CATS = [
  { key: '学习', emoji: '📚' },
  { key: '运动', emoji: '🏃' },
  { key: '家务', emoji: '🧹' },
  { key: '阅读', emoji: '📖' }
]
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.key, c.emoji]))

export default {
  name: 'Summer',
  data() {
    return {
      tab: 'today',
      currentDate: todayStr(),
      tasks: [], loading: true,
      weekData: [], monthData: [],
      parentMode: sessionStorage.getItem('summerParent') === '1',
      editing: false,
      sheet: { open: false, task: {} },
      viewYear: Number(todayStr().slice(0, 4)),
      viewMonth: Number(todayStr().slice(5, 7)),
      CATS
    }
  },
  computed: {
    approvedCount() { return this.tasks.filter(t => t.parent_status === 'approved').length },
    weekDays() { const m = mondayOf(this.currentDate); return Array.from({ length: 7 }, (_, i) => addDays(m, i)) },
    monthMap() { return Object.fromEntries(this.monthData.map(d => [d.date, d])) },
    calCells() {
      const first = `${this.viewYear}-${String(this.viewMonth).padStart(2, '0')}-01`
      const lead = (new Date(first + 'T00:00:00').getDay() + 6) % 7 // 前面补几个空格(周一起)
      const dim = new Date(this.viewYear, this.viewMonth, 0).getDate()
      const cells = []
      for (let i = 0; i < lead; i++) cells.push({})
      const today = todayStr()
      for (let d = 1; d <= dim; d++) {
        const ds = `${this.viewYear}-${String(this.viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push({ date: ds, ...(this.monthMap[ds] || {}), future: ds > today })
      }
      return cells
    },
    monthApprovedDays() { return this.monthData.filter(d => d.total && d.approved >= d.total).length },
    monthElapsedDays() {
      const t = todayStr()
      return this.monthData.filter(d => d.date <= t).length
    }
  },
  async mounted() { await this.loadDay() },
  methods: {
    prettyDate, weekdayLabel,
    isToday(d) { return d === todayStr() },
    catEmoji(c) { return CAT_MAP[c] || '📌' },
    isApproved(t) { return t.parent_status === 'approved' },
    cardClass(t) {
      if (this.isApproved(t)) return 'st-approved'
      if (t.child_checked) return 'st-pending'
      return 'st-todo'
    },
    chipClass(t) { return this.cardClass(t) },
    chipText(t) {
      if (this.isApproved(t)) return '✅ 已确认'
      if (t.child_checked) return '🟡 待确认'
      return '⚪ 待打卡'
    },
    shortTime(dt) { if (!dt) return ''; return dt.slice(11, 16) },
    async loadDay() {
      this.loading = true
      try { this.tasks = await fetchSummerDay(localStorage.getItem('userId'), this.currentDate) }
      catch (e) { console.error(e) } finally { this.loading = false }
    },
    async switchTab(t) {
      this.tab = t
      const uid = localStorage.getItem('userId')
      if (t === 'week') this.weekData = await fetchSummerWeek(uid, this.currentDate)
      if (t === 'month') { this.viewYear = Number(this.currentDate.slice(0, 4)); this.viewMonth = Number(this.currentDate.slice(5, 7)); this.monthData = await fetchSummerMonth(uid, this.viewYear, this.viewMonth) }
    },
    async gotoDate(d) { this.currentDate = d; this.tab = 'today'; this.editing = false; await this.loadDay() },
    async shiftWeek(n) { this.currentDate = addDays(mondayOf(this.currentDate), n * 7); this.weekData = await fetchSummerWeek(localStorage.getItem('userId'), this.currentDate) },
    async shiftMonth(n) {
      let m = this.viewMonth + n, y = this.viewYear
      if (m < 1) { m = 12; y-- } if (m > 12) { m = 1; y++ }
      this.viewMonth = m; this.viewYear = y
      this.monthData = await fetchSummerMonth(localStorage.getItem('userId'), y, m)
    },
    weekTag(d) {
      if (!d.total) return '未排'
      if (d.approved >= d.total) return '✅'
      if (d.checked > 0 && d.approved < d.checked) return '🟡'
      return ''
    },
    cellClass(c) {
      if (!c.date) return 'empty'
      if (c.future) return 'future'
      if (!c.total) return 'none'
      if (c.approved >= c.total) return 'full'
      if (c.approved > 0) return 'partial'
      return 'zero'
    },
    // 打卡 / 撤销
    async doCheckin(t, checked) {
      const r = await summerCheckin(localStorage.getItem('userId'), t.id, checked)
      Object.assign(t, r)
    },
    // 家长 确认 / 打回
    async doConfirm(t, action) {
      const r = await summerConfirm(localStorage.getItem('userId'), t.id, action)
      Object.assign(t, r)
    },
    // 家长 PIN
    enterParent() {
      let pin = localStorage.getItem('summerPin')
      if (!pin) {
        const p1 = prompt('首次设置家长 PIN（请家长操作）：')
        if (!p1) return
        if (prompt('再输入一次以确认：') !== p1) { alert('两次不一致，未设置'); return }
        localStorage.setItem('summerPin', p1); pin = p1
      }
      const enter = prompt('请输入家长 PIN：')
      if (enter === pin) { this.parentMode = true; sessionStorage.setItem('summerParent', '1') }
      else if (enter != null) alert('PIN 不正确')
    },
    exitParent() { this.parentMode = false; sessionStorage.removeItem('summerParent') },
    // 编辑
    openAdd() { this.sheet = { open: true, task: { category: '学习', name: '', standard: '' } } },
    openEdit(t) { this.sheet = { open: true, task: { ...t } } },
    async saveFromSheet() {
      const idx = this.tasks.findIndex(t => t.id === this.sheet.task.id)
      const cleaned = { id: this.sheet.task.id, category: this.sheet.task.category, name: this.sheet.task.name.trim(), standard: this.sheet.task.standard.trim(), sort_order: idx >= 0 ? idx : this.tasks.length }
      if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...cleaned }
      else this.tasks.push({ ...cleaned })
      this.sheet.open = false
      await this.persist()
    },
    async deleteFromSheet() {
      this.tasks = this.tasks.filter(t => t.id !== this.sheet.task.id)
      this.sheet.open = false
      await this.persist()
    },
    async move(i, dir) {
      const j = i + dir; if (j < 0 || j >= this.tasks.length) return
      const a = this.tasks; [a[i], a[j]] = [a[j], a[i]]
      await this.persist()
    },
    async remove(i) {
      this.tasks.splice(i, 1); await this.persist()
    },
    async persist() {
      const uid = localStorage.getItem('userId')
      this.tasks = await saveSummerDay(uid, this.currentDate,
        this.tasks.map((t, i) => ({ id: t.id, category: t.category, name: t.name, standard: t.standard, sort_order: i })))
    },
    async copyYesterday() {
      const y = addDays(this.currentDate, -1)
      const yd = await fetchSummerDay(localStorage.getItem('userId'), y)
      if (!yd.length) { alert('昨天没有任务可复制'); return }
      if (this.tasks.length && !confirm('覆盖当前任务为昨天的内容？')) return
      this.tasks = await saveSummerDay(localStorage.getItem('userId'), this.currentDate,
        yd.map((t, i) => ({ category: t.category, name: t.name, standard: t.standard, sort_order: i })))
    }
  }
}
</script>

<style scoped>
.su-page { font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 640px; margin: 0 auto; min-height: 100vh; background: #FFFBF5; color: #1F2937; }
/* 头部 */
.su-header { position: sticky; top: 0; z-index: 10; background: #FFF8EC; padding: 14px 16px 8px; box-shadow: 0 1px 6px rgba(245,158,11,.08); border-top: 3px solid #F59E0B; }
.su-header.parent { border-top-color: #4F46E5; background: #F6F7FF; }
.su-h1 { display: flex; justify-content: space-between; align-items: center; }
.su-title { font-size: 19px; font-weight: 800; color: #B45309; }
.su-header.parent .su-title { color: #4F46E5; }
.su-parent { background: #fff; border: 1px solid #F5D9B0; color: #B45309; border-radius: 20px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
.su-header.parent .su-parent { border-color: #C7D2FE; color: #4F46E5; }
.su-date { font-size: 13px; color: #92400E; margin: 6px 0 10px; }
.su-header.parent .su-date { color: #6366F1; }
.su-segs { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #F2E6CF; }
.su-seg { background: none; border: none; padding: 8px 12px; font-size: 14px; color: #9CA3AF; cursor: pointer; border-bottom: 2px solid transparent; }
.su-seg.on { color: #B45309; font-weight: 700; border-bottom-color: #F59E0B; }
.su-prog { margin-left: auto; font-size: 12px; color: #16A34A; font-weight: 600; }
.su-edit { background: #fff; border: 1px solid #F5D9B0; color: #B45309; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
/* body */
.su-body { padding: 14px 16px 60px; }
.su-empty { color: #9CA3AF; padding: 20px; text-align: center; font-size: 14px; }
.su-empty.big { padding: 50px 20px; }
.su-empty .sun { font-size: 44px; margin-bottom: 10px; }
.su-empty-btns { margin-top: 16px; display: flex; gap: 10px; justify-content: center; }
.su-add-main { background: #F59E0B; color: #fff; border: none; border-radius: 10px; padding: 9px 16px; font-size: 14px; cursor: pointer; }
.su-copy { background: #fff; border: 1px solid #F5D9B0; color: #B45309; border-radius: 10px; padding: 9px 16px; font-size: 14px; cursor: pointer; }
/* 卡片 */
.su-cards { display: flex; flex-direction: column; gap: 12px; }
.su-card { position: relative; display: flex; align-items: stretch; background: #fff; border: 1px solid #F0ECF7; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.su-card-bar { width: 4px; flex-shrink: 0; background: #D1D5DB; }
.su-card.st-pending .su-card-bar { background: #F59E0B; }
.su-card.st-pending { background: #FFFBF1; }
.su-card.st-approved .su-card-bar { background: #16A34A; }
.su-card.st-approved { background: #F2FDF5; }
.su-card-main { flex: 1; min-width: 0; padding: 12px 14px; }
.su-card-top { display: flex; align-items: center; gap: 8px; }
.su-cat { font-size: 16px; }
.su-name { font-size: 16px; font-weight: 700; }
.su-chip { margin-left: auto; font-size: 11px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; background: #F3F4F6; color: #6B7280; }
.su-chip.st-pending { background: #FEF3C7; color: #B45309; }
.su-chip.st-approved { background: #DCFCE7; color: #15803D; }
.su-standard { font-size: 13px; color: #6B7280; margin-top: 6px; line-height: 1.4; }
.su-meta { font-size: 11px; color: #9CA3AF; margin-top: 6px; }
.su-edit-ctrls { display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 0 10px; border-left: 1px dashed #EDE9DD; }
.su-edit-ctrls button { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; width: 34px; height: 30px; cursor: pointer; font-size: 14px; color: #6B7280; }
.su-edit-ctrls button:disabled { opacity: .3; }
.su-edit-ctrls .del { color: #DC2626; }
.su-actions { display: flex; flex-direction: column; gap: 6px; justify-content: center; padding: 0 12px; }
.btn-child { background: #F59E0B; color: #fff; border: none; border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn-undo { background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB; border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
.btn-confirm { background: #16A34A; color: #fff; border: none; border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn-reject { background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.su-add-row { background: #fff; border: 1.5px dashed #F5D9B0; color: #B45309; border-radius: 14px; padding: 14px; font-size: 14px; cursor: pointer; }
.su-copy.small { align-self: flex-start; background: transparent; border: 1px solid #F5D9B0; }
/* 本周 */
.su-nav { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px 12px; font-size: 14px; color: #6B7280; }
.su-nav button { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; color: #B45309; }
.su-wrow { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #F0ECF7; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; }
.su-wrow.today { border-color: #F59E0B; background: #FFFBF1; }
.su-wd { font-size: 13px; min-width: 130px; color: #374151; }
.su-wbar { flex: 1; height: 8px; background: #F3F4F6; border-radius: 4px; overflow: hidden; }
.su-wfill { display: block; height: 100%; background: linear-gradient(90deg,#F59E0B,#16A34A); transition: width .3s; }
.su-wcnt { font-size: 12px; color: #6B7280; min-width: 36px; text-align: right; }
.su-wtag { font-size: 13px; min-width: 28px; text-align: center; }
/* 本月 */
.su-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; background: #fff; border: 1px solid #F0ECF7; border-radius: 14px; padding: 10px; }
.su-cal-h { text-align: center; font-size: 11px; color: #9CA3AF; padding: 4px 0; }
.su-cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; font-size: 13px; color: #6B7280; position: relative; }
.su-cal-cell.empty { cursor: default; }
.su-cal-cell.future { color: #D1D5DB; }
.su-cal-cell.none { background: #FAFAFA; color: #C7C7CC; }
.su-cal-cell.zero { background: #F3F4F6; }
.su-cal-cell.partial { background: #FEF3C7; color: #B45309; }
.su-cal-cell.full { background: #DCFCE7; color: #15803D; }
.su-cal-d { font-weight: 600; }
.su-cal-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; margin-top: 2px; opacity: .6; }
.su-legend { display: flex; gap: 14px; justify-content: center; font-size: 11px; color: #9CA3AF; margin-top: 12px; }
/* 弹层 */
.su-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.su-sheet { background: #fff; width: 100%; max-width: 640px; border-radius: 18px 18px 0 0; padding: 18px 18px 28px; box-shadow: 0 -4px 20px rgba(0,0,0,.1); }
.su-sheet-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
.su-field-label { font-size: 12px; color: #6B7280; margin: 10px 0 6px; }
.su-cats { display: flex; gap: 8px; flex-wrap: wrap; }
.su-cat-chip { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 999px; padding: 6px 12px; font-size: 13px; cursor: pointer; color: #6B7280; }
.su-cat-chip.on { background: #FEF3C7; border-color: #F59E0B; color: #B45309; font-weight: 600; }
.su-input { width: 100%; box-sizing: border-box; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; font-size: 14px; font-family: inherit; resize: none; }
.su-input:focus { outline: none; border-color: #F59E0B; }
.su-sheet-btns { display: flex; gap: 10px; margin-top: 18px; }
.su-sheet-save { flex: 1; background: #F59E0B; color: #fff; border: none; border-radius: 10px; padding: 11px; font-size: 15px; cursor: pointer; }
.su-sheet-save:disabled { opacity: .4; }
.su-sheet-del { background: #FEE2E2; color: #DC2626; border: none; border-radius: 10px; padding: 11px 16px; font-size: 14px; cursor: pointer; }
</style>
