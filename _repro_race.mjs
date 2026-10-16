// Repro sementara: POST /api/vocab paralel → deteksi lost update.
const base = process.env.BASE || 'http://localhost:3999'
const N = Number(process.env.N || 10)

const before = await (await fetch(`${base}/api/vocab?limit=1`)).json()
const results = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    fetch(`${base}/api/vocab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jp: `kata${i}`, romaji: `kata${i}`, arti: `arti ${i}`, kategori: 'Tes' }),
    }).then((r) => r.status),
  ),
)
const after = await (await fetch(`${base}/api/vocab?limit=1`)).json()
const ids = (await (await fetch(`${base}/api/vocab?limit=1000`)).json()).items.map((x) => x.id)
const dup = ids.filter((v, i) => ids.indexOf(v) !== i)

console.log(JSON.stringify({
  total_before: before.total,
  post_statuses: results,
  expected_total: before.total + N,
  actual_total: after.total,
  lost: before.total + N - after.total,
  duplicate_ids: [...new Set(dup)],
}, null, 2))
