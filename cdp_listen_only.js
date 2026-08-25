// 纯监听逻辑层 console/异常（不求值，避免上下文问题）。node cdp_listen_only.js <seconds> <outfile>
const fs = require('fs')
const CDP = 'http://127.0.0.1:9222'

async function main() {
  const seconds = parseInt(process.argv[2] || '20')
  const outfile = process.argv[3] || 'console_capture.txt'
  const r = await fetch(CDP + '/json')
  const targets = await r.json()
  const app = targets.find((t) => t.title.includes('小程序逻辑层') || t.url.includes('appservice'))
  if (!app) throw new Error('appservice not found')
  const ws = new WebSocket(app.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let id = 0
  const pending = new Map()
  const lines = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
      return
    }
    let out = ''
    if (m.method === 'Runtime.consoleAPICalled') {
      const args = (m.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a.preview?.properties?.slice(0, 6))).join(' ')
      out = `[console.${m.params.type}] ${args.slice(0, 900)}`
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      out = `[EXCEPTION] ${(d.exception?.description || d.text || '').slice(0, 1200)}`
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry
      out = `[log.${e.level}] ${(e.text || '')} ${e.url || ''} ${(e.description || '').slice(0, 600)}`
    }
    if (out) {
      lines.push(new Date().toISOString().slice(11, 23) + ' ' + out)
      console.log(out.slice(0, 300))
    }
  })
  const rpc = (method, params) => new Promise((resolve) => {
    const i = ++id
    pending.set(i, resolve)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
  await rpc('Runtime.enable', {})
  await rpc('Log.enable', {})
  console.log('--- listening for', seconds, 's')
  await new Promise((r) => setTimeout(r, seconds * 1000))
  fs.writeFileSync(outfile, lines.join('\n'))
  console.log('--- captured', lines.length, 'events ->', outfile)
  ws.close()
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
