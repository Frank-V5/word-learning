// 单词误提取标记 API (全局标记: 用户标记 -> 管理员后台清理)

// 拉取所有已标记 word_id, 返回 Set 供卡片比对
export async function fetchFlaggedSet() {
  try {
    const r = await fetch('/api/word-flags')
    const d = await r.json()
    if (!d.success) return new Set()
    return new Set(d.data.map(x => x.word_id))
  } catch (e) {
    console.error('拉取标记失败', e)
    return new Set()
  }
}

// toggle 标记, 返回标记后布尔
export async function toggleFlag(wordId, userId) {
  const r = await fetch('/api/word-flags/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId, userId })
  })
  const d = await r.json()
  if (!d.success) {
    console.error('标记失败', d.error)
    return null
  }
  return d.data.flagged
}
