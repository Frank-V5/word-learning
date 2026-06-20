<template>
  <div class="admin-page">
    <h2>后台 · 误提取词标记复核</h2>
    <p class="sub">共 {{ flags.length }} 个被标记的词。点"取消标记"保留合法词（如只是大写的真词）。需删除的垃圾词另行用后台命令清理（页面不设删除钮，防孩子误删）。</p>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="flags.length === 0" class="empty">✅ 暂无被标记的词</div>

    <table v-else>
      <thead>
        <tr><th>词</th><th>出处</th><th>标记人</th><th>标记时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="f in flags" :key="f.word_id">
          <td class="w">{{ f.word }}</td>
          <td>{{ f.video_title || f.video_id }} <span class="cat">[{{ f.category }}]</span></td>
          <td>{{ f.flagged_by }}</td>
          <td class="t">{{ f.flagged_at }}</td>
          <td class="actions">
            <button class="unflag" :disabled="busy === f.word_id" @click="unflag(f)" title="保留该词, 仅清掉标记">取消标记</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'Admin',
  data() {
    return { flags: [], loading: true, busy: null }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const r = await fetch('/api/admin/flags')
        const d = await r.json()
        if (d.success) this.flags = d.data
      } catch (e) {
        console.error('加载标记失败', e)
      } finally {
        this.loading = false
      }
    },
    async unflag(f) {
      this.busy = f.word_id
      try {
        const r = await fetch('/api/admin/flags/unflag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordId: f.word_id })
        })
        const d = await r.json()
        if (d.success) {
          this.flags = this.flags.filter(x => x.word_id !== f.word_id)
        } else {
          alert('取消失败: ' + d.error)
        }
      } catch (e) {
        alert('取消失败')
      } finally {
        this.busy = null
      }
    }
  }
}
</script>

<style scoped>
.admin-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; }
h2 { margin-bottom: 4px; }
.sub { color: #666; font-size: 13px; margin-top: 0; margin-bottom: 16px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; background: #fff; }
th, td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; }
th { background: #f5f5f5; }
.w { font-weight: 600; }
.cat { color: #999; font-size: 11px; }
.t { color: #888; font-size: 12px; white-space: nowrap; }
.unflag { background: #eee; color: #555; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.unflag:hover:not(:disabled) { background: #ddd; }
.unflag:disabled { opacity: .6; cursor: default; }
.actions { white-space: nowrap; }
.loading, .empty { color: #888; padding: 24px; font-size: 14px; }
</style>
