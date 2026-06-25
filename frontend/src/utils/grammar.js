// 语法训练模块 API (隔离, /api/grammar/*)
export async function fetchGrammarCategories(userId) {
  const r = await fetch(`/api/grammar/categories?userId=${userId}`); return (await r.json()).data
}
export async function fetchGrammarCat(cat, userId) {
  const r = await fetch(`/api/grammar/category/${encodeURIComponent(cat)}?userId=${userId}`); return (await r.json()).data
}
export async function fetchGrammarPoint(id) {
  const r = await fetch(`/api/grammar/point/${id}`); return (await r.json()).data
}
export async function grammarProgress(userId, pointId, status) {
  const r = await fetch('/api/grammar/progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pointId, status })
  }); return (await r.json()).data
}
export async function fetchGrammarTroublesome(userId) {
  const r = await fetch(`/api/grammar/troublesome?userId=${userId}`); return (await r.json()).data
}
export async function fetchGrammarPractice(pointId) {
  const r = await fetch(`/api/grammar/practice/${pointId}`); return (await r.json()).data
}
export async function grammarAnswer(userId, questionId, userAnswer) {
  const r = await fetch('/api/grammar/answer', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questionId, userAnswer })
  }); return (await r.json()).data
}
export async function fetchGrammarWrong(userId) {
  const r = await fetch(`/api/grammar/wrong?userId=${userId}`); return (await r.json()).data
}
export async function grammarRedo(userId, questionId, userAnswer) {
  const r = await fetch('/api/grammar/redo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, questionId, userAnswer })
  }); return (await r.json()).data
}
export async function fetchGrammarMixed(count = 10) {
  const r = await fetch(`/api/grammar/mixed?count=${count}`); return (await r.json()).data
}
export async function fetchGrammarDiagnosis(userId) {
  const r = await fetch(`/api/grammar/diagnosis?userId=${userId}`); return (await r.json()).data
}
