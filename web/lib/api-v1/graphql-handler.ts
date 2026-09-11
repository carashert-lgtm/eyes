import { queryLaunches } from '@/lib/api-v1/launches-query'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { isLaunchChainKey } from '@/lib/launch-chains/registry'
import type { LaunchFilter, LaunchSort } from '@/lib/launch-ranking'

type GraphQLBody = { query?: string; variables?: Record<string, unknown> }

function parseArgs(query: string, field: string): Record<string, string | number> {
  const match = query.match(new RegExp(`${field}\\s*\\(([^)]*)\\)`))
  if (!match?.[1]) return {}
  const args: Record<string, string | number> = {}
  for (const part of match[1].split(',')) {
    const m = part.trim().match(/(\w+)\s*:\s*("([^"]+)"|(\d+))/)
    if (!m) continue
    args[m[1]] = m[3] ?? Number(m[4])
  }
  return args
}

export async function executeGraphQL(body: GraphQLBody) {
  const query = body.query?.trim() ?? ''
  if (!query) throw new Error('Query required')

  if (query.includes('__schema') || query.includes('__type')) {
    return {
      data: {
        __schema: {
          queryType: 'Query',
          fields: ['launches', 'launch'],
        },
      },
    }
  }

  if (/launch\s*\(\s*id\s*:/.test(query)) {
    const args = parseArgs(query, 'launch')
    const id = String(args.id ?? body.variables?.id ?? '')
    const snapshot = await loadLaunchesSnapshot()
    const launch = snapshot.launches.find((l) => l.id === id) ?? null
    return { data: { launch } }
  }

  if (query.includes('launches')) {
    const args = parseArgs(query, 'launches')
    const limit = Number(args.limit ?? body.variables?.limit ?? 20)
    const chainRaw = String(args.chain ?? body.variables?.chain ?? '')
    const chain = isLaunchChainKey(chainRaw) ? chainRaw : null
    const filter = (String(args.filter ?? body.variables?.filter ?? 'all') as LaunchFilter) || 'all'
    const sort = (String(args.sort ?? body.variables?.sort ?? 'rank') as LaunchSort) || 'rank'
    const result = await queryLaunches({ limit, chain, filter, sort })
    return { data: { launches: result.launches, total: result.total } }
  }

  throw new Error('Unsupported GraphQL query — try launches or launch(id:)')
}
