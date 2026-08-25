// CDP 截图工具 v2：带超时和分步日志。node cdp_shot.js shot <path> <out>
const fs = require('fs')
const CDP = 'http://127.0.0.1:9222'
const TIMEOUT = 10000

function withTimeout(p, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + label)), TIMEOUT)),
  ])
}

async function getTargets() {
  const r = await fetch(CDP + '/json')
  return r.json()
}

function connect(wsUrl, label) {
  return withTimeout(
    new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => resolve(ws)
      ws.onerror = (e) => reject(new Error('ws error ' + label))
    }),
    'connect ' + label
  )
}

function rpc(ws, id, method, params, label) {
  return withTimeout(
    new Promise((resolve, reject) => {
      const onmsg = (ev) => {
        try {
          const m = JSON.parse(ev.data)
          if (m.id === id) {
            ws.removeEventListener('message', onmsg)
            m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result)
          }
        } catch {}
      }
      ws.addEventListener('message', onmsg)
      ws.send(JSON.stringify({ id, method, params }))
    }),
    label || method
  )
}

async function main() {
  const pagePath = process.argv[2]
  const out = process.argv[3]

  console.log('[1] 连接逻辑层...')
  const targets = await getTargets()
  const app = targets.find((t) => t.title.includes('小程序逻辑层') || t.url.includes('appservice/s1'))
  if (!app) throw new Error('appservice not found')
  const appWs = await connect(app.webSocketDebuggerUrl, 'appservice')
  console.log('[2] 导航到', pagePath)
  const isTab = ['/pages/jobs/index', '/pages/chat/index', '/pages/profile/index'].includes(pagePath)
  const navRes = await rpc(
    appWs, 1, 'Runtime.evaluate',
    { expression: `wx.${isTab ? 'switchTab' : 'reLaunch'}({url: '${pagePath}'}); 'nav-ok'` },
    'navigate'
  )
  console.log('[2] 导航结果:', JSON.stringify(navRes?.result?.value || navRes))
  appWs.close()

  await new Promise((r) => setTimeout(r, 2500))

  console.log('[3] 找页面帧...')
  const targets2 = await getTargets()
  const want = pagePath.replace(/^\//, '')
  const frame = targets2.find((t) => t.url.includes('__pageframe__') && t.url.includes(want))
    || targets2.find((t) => t.url.includes('__pageframe__'))
  if (!frame) throw new Error('frame not found')
  console.log('[3] 帧URL:', frame.url)

  console.log('[4] 截图...')
  const ws = await connect(frame.webSocketDebuggerUrl, 'frame')
  try {
    await rpc(ws, 10, 'Page.enable', {}, 'page-enable')
  } catch (e) {
    console.log('    Page.enable 跳过:', e.message)
  }
  const shot = await rpc(ws, 11, 'Page.captureScreenshot', { format: 'png' }, 'screenshot')
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('[5] 已保存', out, shot.data.length, 'bytes(b64)')
  ws.close()
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
