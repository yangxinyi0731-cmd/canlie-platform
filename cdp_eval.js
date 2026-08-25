// CDP eval: 在逻辑层执行表达式并返回结果。node cdp_eval.js "<expression>"
const CDP = 'http://127.0.0.1:9222'

async function main() {
  const expr = process.argv[2]
  const r = await fetch(CDP + '/json')
  const targets = await r.json()
  const app = targets.find((t) => t.title.includes('小程序逻辑层') || t.url.includes('appservice'))
  if (!app) throw new Error('appservice not found')
  const ws = new WebSocket(app.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  const result = await new Promise((resolve) => {
    const onmsg = (ev) => {
      try {
        const m = JSON.parse(ev.data)
        if (m.id === 1) {
          ws.removeEventListener('message', onmsg)
          resolve(m)
        }
      } catch {}
    }
    ws.addEventListener('message', onmsg)
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
  })
  console.log(JSON.stringify(result.result?.result ?? result.result ?? result, null, 1).slice(0, 3000))
  ws.close()
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
