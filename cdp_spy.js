// 监听逻辑层事件并导航（正确处理执行上下文）。node cdp_spy.js <pagePath>
const CDP = 'http://127.0.0.1:9222'

async function main() {
  const pagePath = process.argv[2]
  const r = await fetch(CDP + '/json')
  const targets = await r.json()
  const app = targets.find((t) => t.title.includes('小程序逻辑层') || t.url.includes('appservice'))
  if (!app) throw new Error('appservice not found')
  const ws = new WebSocket(app.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let id = 0
  const pending = new Map()
  const contexts = [] // {id, name}
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    } else if (m.method === 'Runtime.executionContextCreated') {
      contexts.push({ id: m.params.context.id, name: m.params.context.name || m.params.context.origin })
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const args = (m.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a.preview?.properties?.slice(0, 6))).join(' ')
      console.log(`[console.${m.params.type}]`, args.slice(0, 800))
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      console.log('[EXCEPTION]', (d.exception?.description || d.text || '').slice(0, 900))
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry
      console.log(`[log.${e.level}]`, (e.text || '') + ' ' + (e.url || ''), (e.description || '').slice(0, 600))
    }
  })
  const rpc = (method, params) => new Promise((resolve) => {
    const i = ++id
    pending.set(i, resolve)
    ws.send(JSON.stringify({ id: i, method, params }))
  })

  await rpc('Runtime.enable', {})
  await rpc('Log.enable', {})
  await new Promise((r) => setTimeout(r, 1500))
  console.log('contexts:', JSON.stringify(contexts))

  // 找有 wx 的上下文
  let ctxId
  for (const c of contexts) {
    const t = await rpc('Runtime.evaluate', { expression: 'typeof wx', contextId: c.id })
    if (t.result?.result?.value === 'object') { ctxId = c.id; break }
  }
  console.log('app contextId:', ctxId)
  if (ctxId == null) throw new Error('no wx context')

  console.log('--- navigate', pagePath)
  const nav = await rpc('Runtime.evaluate', { expression: `wx.reLaunch({url: '${pagePath}'})`, contextId: ctxId })
  console.log('nav:', JSON.stringify(nav.result?.result ?? nav.result).slice(0, 200))
  await new Promise((r) => setTimeout(r, 12000))
  ws.close()
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
