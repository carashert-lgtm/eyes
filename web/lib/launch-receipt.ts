import { decodeEventLog, type Address, type Hash, type Log } from 'viem'
import { LAUNCH_FACTORY_ABI } from '@/lib/contracts/launch-factory'

export type ParsedLaunchCreated = {
  launchId: number
  token: Address
  creator: Address
}

export function parseLaunchCreatedLog(
  logs: Log[],
  factoryAddress: Address,
): ParsedLaunchCreated | null {
  const factory = factoryAddress.toLowerCase()
  for (const log of logs) {
    if (log.address.toLowerCase() !== factory) continue
    try {
      const decoded = decodeEventLog({
        abi: LAUNCH_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName !== 'LaunchCreated') continue
      const args = decoded.args as {
        launchId: bigint
        token: Address
        creator: Address
      }
      return {
        launchId: Number(args.launchId),
        token: args.token,
        creator: args.creator,
      }
    } catch {
      continue
    }
  }
  return null
}

export function txExplorerUrl(hash: Hash): string {
  return `https://basescan.org/tx/${hash}`
}
