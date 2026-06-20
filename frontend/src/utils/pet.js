// PET 备考子系统 API (独立, 走 /api/pet/*)

export async function fetchPetGroups(userId) {
  const r = await fetch(`/api/pet/groups?userId=${userId}`)
  return (await r.json()).data
}

export async function fetchPetUnit(unit, userId) {
  const r = await fetch(`/api/pet/units/${unit}/words?userId=${userId}`)
  return (await r.json()).data
}

export async function petProgress(userId, canonicalId, status) {
  const r = await fetch('/api/pet/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, canonicalId, status })
  })
  return (await r.json()).data
}

export async function fetchPetReview(userId) {
  const r = await fetch(`/api/pet/review?userId=${userId}`)
  return (await r.json()).data
}

export async function fetchPetTroublesome(userId) {
  const r = await fetch(`/api/pet/troublesome?userId=${userId}`)
  return (await r.json()).data
}

export async function fetchPetVideoLink(canonicalId) {
  const r = await fetch(`/api/pet/video-link?canonicalId=${canonicalId}`)
  return (await r.json()).data
}

// PET 角标用: 全部 PET 词的 norm_key 集合 (小学/初中/高中卡片查)
let _petSet = null
export async function fetchPetWordSet() {
  if (_petSet) return _petSet
  const r = await fetch('/api/pet/pet-words')
  const d = await r.json()
  _petSet = new Set(d.data)
  return _petSet
}

// 与后端一致的 norm_key (前端 SHA-1 用同一归一)
export function normKey(t) {
  return String(t).toLowerCase().replace(/\s+/g, ' ').trim()
}
