# BOT Blitz: Officially launched on BOT Chain Mainnet

**BOT Blitz is officially launched on BOT Chain Mainnet.** BOT Blitz is a 60-second game in which every tap is an on-chain transaction and the smart contract, not a server, keeps score. The contract is deployed on BOT Chain Mainnet (chain ID 677), and its source is verified on BOTScan.

- **Contract:** `0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C`
- **Explorer:** https://scan.botchain.ai/address/0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C
- **App:** [app link]

## Why we built it

Most on-chain games either run an ordinary game loop off-chain and post a final score at the end, or put tokens, NFTs and long sessions in front of play. Neither shows what a fast, low-cost chain is actually good for.

BOT Blitz takes the opposite approach: short sessions, frequent on-chain actions, immediate confirmation, and scores anyone can verify. A round can't be played off-chain and submitted afterwards, because the contract awards each point, one confirmed transaction at a time.

## How a round works

1. **Connect.** Any EVM wallet works. The wallet address is the player identity, so there is no account or password.
2. **Start.** `startRound` records the round, fixes a 60-second window from the block timestamp and lights the first cell of a 3×3 grid.
3. **Tap.** Each tap is a `submitAction(roundId, step, cell)` transaction. The contract checks the caller, the time window, the step and the pacing, then compares the cell with the target. A match earns +1 point and the contract derives the next target on-chain. Any other cell counts as a miss.
4. **Settle.** Once the window closes, anyone can call `finalizeRound`. It records the totals, updates the player's personal best and the on-chain top-20 leaderboard, and can't change the score.

The next cell lights only after the previous tap is confirmed. **On BOT Blitz, the chain's confirmation time is the pace of the game.**

## Rules enforced by the contract

The player never submits a score. Every rule below is checked on-chain, and the transaction reverts if it is broken:

| Rule | Revert |
|---|---|
| A step can only score once | `StaleStep` |
| No action counts after the 60-second window | `RoundExpired` |
| At most one action per block per round | `OneActionPerBlock` |
| Only the player or that round's session key may act | `NotRoundOwner` |
| One active round per wallet | `RoundStillActive` |

## Session keys

A wallet confirmation on every tap would make a 60-second game unplayable. `startRound` can therefore name a browser-generated session key and forward it a small gas float. The key is valid for that round only and can't act for other rounds or other players. After settlement, the app sweeps the unspent float back to the player, and the contract never holds funds. Players who prefer not to delegate can sign every tap from their own wallet instead.

## Architecture

- **No backend.** The frontend is a static build that reads and writes the contract directly, so no server decides a score.
- **No indexer.** The `eth_getLogs` method is disabled on the public mainnet RPC, so a leaderboard built by scanning logs wouldn't work there. Personal bests, player statistics, round history and a bounded top-20 leaderboard are kept in contract storage instead. The contract still emits events (`RoundStarted`, `ActionSubmitted`, `RoundFinalized`, `BestScoreUpdated`) for explorers and any future indexer.
- **Refresh-safe.** The app reads the wallet's active round from the contract on load. A live round resumes and an expired round settles, so browser memory never determines game state.

## Measured on mainnet

These figures were measured in our first mainnet round, not taken from documentation:

- **Tap-to-receipt latency:** 814 ms median (789 ms fastest, 843 ms slowest) across 4 taps
- **Gas price:** 20 gwei, the mainnet floor
- **Scoring tap:** 42,395 gas, about 0.00085 BOT
- **Missed tap:** 38,609 gas
- **Full round** (start, 4 taps, settlement and float return): 0.0112 BOT in total

The app also shows live figures: the average block time over the last 100 blocks, the current gas cost of a tap, and each player's own latency per transaction.

## Testing and verification

- 27 Foundry tests, all passing. They include a fuzz test asserting that the score always equals the number of correct taps, and an exact-boundary test showing that a tap at `end − 1` scores while a tap at `end` reverts.
- A scripted end-to-end round on mainnet went through start, hits, a deliberate miss, a replay rejected with `StaleStep`, a post-expiry tap rejected with `RoundExpired`, settlement and the float return.
- The same contract source is verified on BOTScan for both testnet (chain 968) and mainnet (chain 677).
- Mainnet deployment transaction: block 25,181,514.

## Get started

1. Get mainnet BOT from the official DEX: https://dex.botchain.ai/#/swap
2. Open BOT Blitz: [app link]
3. Connect your wallet, start a round and tap the lit cell.

BOT Blitz has no token and no entry fee. Players pay only network gas.

*BOT Blitz is officially launched on BOT Chain Mainnet. Every round is a burst of real, verifiable transactions, and every score can be checked on BOTScan.*
