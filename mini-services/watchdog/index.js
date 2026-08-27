const { execSync, spawn } = require('child_process')
const http = require('http')
const net = require('net')

let nextProcess = null
const PORT = 3000

function startNext() {
  console.log('[watchdog] Starting Next.js server...')
  nextProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1536' },
  })

  nextProcess.stdout?.on('data', (d) => process.stdout.write(d))
  nextProcess.stderr?.on('data', (d) => process.stderr.write(d))

  nextProcess.on('exit', (code) => {
    console.log(`[watchdog] Next.js exited with code ${code}, restarting in 3s...`)
    nextProcess = null
    setTimeout(startNext, 3000)
  })

  nextProcess.on('error', (err) => {
    console.error('[watchdog] Error:', err.message)
    nextProcess = null
    setTimeout(startNext, 3000)
  })
}

// Check if port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => { server.close(); resolve(false) })
    server.listen(port, '127.0.0.1')
  })
}

// Monitor loop
async function monitor() {
 while (true) {
    await new Promise(r => setTimeout(r, 5000))
    const inUse = await isPortInUse(PORT)
    if (!inUse && !nextProcess) {
      console.log('[watchdog] Port 3000 is free and no process, starting...')
      startNext()
    }
  }
}

startNext()
monitor()
