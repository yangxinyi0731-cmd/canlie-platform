// CDP 截图工具 v3：适配还原后的新页面列表。node cdp_shot3.js shot <path> <out>
// tab 页用 reLaunch（本项目已改为自定义底部导航，全部页面均可 reLaunch）
const fs = require('fs')
const CDP = 'http://127.0.0.1:9222'
const TIMEOUT = 15000

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
      ws.onerror = () => reject(new Error('ws error ' + label))
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

async function getAppWs() {
  const targets = await getTargets()
  // 优先选与真实页面帧（非 skyline 占位）同端口的逻辑层，排除僵尸会话
  const realFrames = targets.filter((t) => t.url.includes('__pageframe__') && !t.url.includes('pages/index/index'))
  const livePort = realFrames.length ? realFrames[0].url.match(/:(\d+)\//)?.[1] : null
  const apps = targets.filter((t) => t.title.includes('小程序逻辑层') || t.url.includes('appservice/s'))
  const app = (livePort && apps.find((a) => a.url.includes(':' + livePort + '/'))) || apps[0]
  if (!app) throw new Error('appservice not found')
  return connect(app.webSocketDebuggerUrl, 'appservice')
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'eval') {
    // node cdp_shot3.js eval "<expression>"
    const expr = process.argv[3]
    const ws = await getAppWs()
    const res = await rpc(ws, 1, 'Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, 'eval')
    console.log(JSON.stringify(res?.result ?? res, null, 2))
    ws.close()
    return
  }

  // 默认 shot 模式: node cdp_shot3.js <pagePath> <out>
  const pagePath = process.argv[2]
  const out = process.argv[3]

  const appWs = await getAppWs()
  await rpc(appWs, 1, 'Runtime.evaluate', { expression: `wx.reLaunch({url: '${pagePath}'}); 'nav-ok'` }, 'navigate')
  appWs.close()

  // 轮询等待目标页面帧出现（最多 12 秒）
  const want = pagePath.replace(/^\//, '').split('?')[0]
  let frame = null
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const targets = await getTargets()
    const frames = targets.filter((t) => t.url.includes('__pageframe__'))
    frame = frames.find((t) => t.url.includes(want)) || null
    // 要求帧稳定：连续两次都能找到且帧数不再变化
    if (frame) {
      await new Promise((r) => setTimeout(r, 800))
      const targets2 = await getTargets()
      const frames2 = targets2.filter((t) => t.url.includes('__pageframe__'))
      const frame2 = frames2.find((t) => t.url.includes(want))
      if (frame2 && frame2.id === frame.id && frames2.length === frames.length) {
        frame = frame2
        break
      }
    }
  }
  if (!frame) {
    const targets = await getTargets()
    console.error('frames:', targets.filter((t) => t.url.includes('__pageframe__')).map((t) => t.url))
    throw new Error('frame not found for ' + want)
  }

  const ws = await connect(frame.webSocketDebuggerUrl, 'frame')
  try {
    await rpc(ws, 10, 'Page.enable', {}, 'page-enable')
  } catch (e) {
    console.log('    Page.enable 跳过:', e.message)
  }
  // 首次 capture 可能超时，重试一次
  let shot
  try {
    shot = await rpc(ws, 11, 'Page.captureScreenshot', { format: 'png' }, 'screenshot')
  } catch (e) {
    console.log('    首次截图超时，重试...')
    await new Promise((r) => setTimeout(r, 1500))
    shot = await rpc(ws, 12, 'Page.captureScreenshot', { format: 'png' }, 'screenshot-retry')
  }
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('saved', out)
  ws.close()
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
