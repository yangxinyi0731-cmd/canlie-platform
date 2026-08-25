// 在页面帧(webview)里执行表达式。node cdp_frame_eval.js <frameUrlContains> "<expression>"
const CDP = 'http://127.0.0.1:9222'

async function main() {
  const match = process.argv[2]
  const expr = process.argv[3]
  const r = await fetch(CDP + '/json')
  const targets = await r.json()
  const frame = targets.find((t) => t.url.includes(match))
  if (!frame) throw new Error('frame not found: ' + match)
  const ws = new WebSocket(frame.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  const res = await new Promise((resolve) => {
    const onmsg = (ev) => {
      try {
        const m = JSON.parse(ev.data)
        if (m.id === 1) { ws.removeEventListener('message', onmsg); resolve(m) }
      } catch {}
    }
    ws.addEventListener('message', onmsg)
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
  })
  const r2 = res.result?.result
  console.log(r2?.type === 'string' ? r2.value : JSON.stringify(r2 ?? res, null, 1).slice(0, 2500))
  ws.close()
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
