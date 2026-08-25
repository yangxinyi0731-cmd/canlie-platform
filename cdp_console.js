// 监听小程序逻辑层 console/异常，同时导航到指定页。node cdp_console.js <pagePath>
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
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const args = (m.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a.preview?.properties?.slice(0,4))).join(' ')
      console.log(`[console.${m.params.type}]`, args.slice(0, 500))
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry
      console.log(`[log.${e.level}]`, (e.text || '') + ' ' + (e.url || ''), (e.description || '').slice(0, 600))
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      console.log('[EXCEPTION]', (d.exception?.description || d.text || '').slice(0, 800))
    }
  })
  const rpc = (method, params) => new Promise((resolve) => {
    const i = ++id
    pending.set(i, resolve)
    ws.send(JSON.stringify({ id: i, method, params }))
  })

  await rpc('Runtime.enable', {})
  await rpc('Log.enable', {})
  console.log('--- 已挂载监听，导航到', pagePath)
  await rpc('Runtime.evaluate', { expression: `wx.reLaunch({url: '${pagePath}'})` })
  await new Promise((r) => setTimeout(r, 10000))
  ws.close()
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
