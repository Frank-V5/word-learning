// 暑假任务计划 API (独立, 走 /api/summer/*)

export async function fetchSummerDay(userId, date) {
  const r = await fetch(`/api/summer/day?userId=${userId}&date=${date}`)
  return (await r.json()).data
}
export async function saveSummerDay(userId, date, tasks) {
  const r = await fetch('/api/summer/day', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, date, tasks })
  })
  return (await r.json()).data
}
export async function summerCheckin(userId, taskId, checked) {
  const r = await fetch('/api/summer/checkin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, taskId, checked })
  })
  return (await r.json()).data
}
export async function summerConfirm(userId, taskId, action) {
  const r = await fetch('/api/summer/confirm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, taskId, action })
  })
  return (await r.json()).data
}
export async function fetchSummerWeek(userId, date) {
  const r = await fetch(`/api/summer/week?userId=${userId}&date=${date}`)
  return (await r.json()).data
}
export async function fetchSummerMonth(userId, y, m) {
  const r = await fetch(`/api/summer/month?userId=${userId}&y=${y}&m=${m}`)
  return (await r.json()).data
}

// ── 本地日期工具 (前端显式传 date, 避免服务器时区问题) ──
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
export function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7 // 周一=0
  return addDays(dateStr, -offset)
}
export function weekdayLabel(dateStr) {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][(new Date(dateStr + 'T00:00:00').getDay() + 6) % 7]
}
export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}
