/** Outbound LPC jobs. The exe pulls these; Railway never has to dial the PC. */

const pending = new Map()
let seq = 1

export function enqueueLpcJob(job) {
  const id = `lpc-${Date.now()}-${seq++}`
  let resolve
  const done = new Promise((res) => {
    resolve = res
  })
  pending.set(id, {
    job: { id, ...job },
    taken: false,
    resolve,
    at: Date.now(),
  })
  return { id, done }
}

export function takeLpcJobs() {
  const out = []
  for (const row of pending.values()) {
    if (row.taken) continue
    row.taken = true
    out.push(row.job)
  }
  return out
}

export function finishLpcJob(id, result) {
  const row = pending.get(id)
  if (!row) return false
  pending.delete(id)
  row.resolve(result || { ok: false, error: 'Empty result.' })
  return true
}

export function expireOldLpcJobs(ms = 25000) {
  const cutoff = Date.now() - ms
  for (const [id, row] of pending) {
    if (row.at > cutoff) continue
    pending.delete(id)
    row.resolve({ ok: false, error: 'Launchpad Command did not pick this up. Keep the exe open.' })
  }
}

setInterval(() => expireOldLpcJobs(), 5000).unref?.()
