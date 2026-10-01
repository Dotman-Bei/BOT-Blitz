<p align="center"><img src="brand/lockup-color.svg" alt="BOT Blitz" height="72"></p>

# BOT Blitz

**A 60-second game on BOT Chain where every tap is a transaction, and the contract keeps score.**

## Problem

Most blockchain games either hide the chain behind an ordinary game loop and post a final score at the end, or bury play under tokens, NFTs and long sessions. Neither shows what a fast, cheap chain is good for.

BOT Blitz goes the other way: short sessions, frequent on-chain actions, immediate confirmation, scores anyone can verify, and simple competition. The chain does real work here. You can't play the round off-chain and submit a number afterwards, because every point is awarded by the contract, one confirmed transaction at a time.

## How it works

1. **Connect** an EVM wallet. Your address is your player, with no account or password.
2. **Start a round.** One wallet approval calls `startRound`. The contract records the round, fixes a 60-second window from the block timestamp and lights the first cell of a 3×3 grid. The same call can name a short-lived **session key** and forward it a small gas float, so taps don't need a wallet popup each time.
3. **Tap the lit cell.** Each tap is a `submitAction(roundId, step, cell)` transaction. The contract checks the caller, the window, the step and the pace, then compares the cell with the target:
   - match: +1 point, and the next target is derived on-chain
   - anything else: a miss, with no point and the same target
4. **Settle.** Once the window closes, anyone can call `finalizeRound`. It records totals, updates your personal best and the on-chain top-20 board, and can't change the score. The app then sweeps the leftover float back to your wallet. If a round is never settled, your next `startRound` settles it first.

The next cell lights only after the chain confirms the previous tap, and the contract accepts at most **one action per block per round**. Your score is capped by how fast BOT Chain confirms.

### Rules (enforced by the contract)

| Rule | Where |
|---|---|
| 60-second round, from the start block's timestamp | `startRound`, `submitAction` (`block.timestamp < endTime`) |
| One active round per wallet | `startRound` reverts `RoundStillActive` |
| +1 per correct action, computed by the contract | `submitAction`; the player never sends a score |
| Each step can score once | `step` argument must equal `round.step` (`StaleStep`) |
| No scoring after expiry | `RoundExpired` |
| One action per block per round | `OneActionPerBlock` |
| Only the player or that round's session key can act | `NotRoundOwner` |
| Personal best = highest settled score | `_finalize` |
| No token, no entry fee | No token contract; `startRound` value goes only to the player's own session key |

## Architecture

```text
contracts/                    Foundry
  src/BOTBlitz.sol            the only contract: rounds, targets, scoring, expiry, stats, best, board, events
  test/BOTBlitz.t.sol         27 tests incl. fuzz
  script/Deploy.s.sol
web/                          Next.js 14 (static export) + Tailwind v3 + wagmi/viem
  src/app/                    / · /play · /leaderboard · /profile
  src/lib/useBlitzGame.ts     round state machine: start → live → settle → result, chain-authoritative
  src/lib/session.ts          session key: local signing, local nonce, raw send, float sweep
  src/lib/reads.ts            contract reads (stats, board, profile, history)
  scripts/check-chain.mjs     build guard: verifies RPC chain ID and contract code before every build
  scripts/e2e.mjs             scripted end-to-end round against any RPC (deployment evidence)
```

- **No backend.** The frontend is static files. It reads and writes the contract directly, so no server decides a score.
- **No indexer needed.** The leaderboard (bounded top 20, kept sorted on settle), per-player stats and per-player round history (O(1) indexed mapping) are all in contract storage. This matters on BOT Chain: the docs note that `eth_getLogs` is **disabled on the public mainnet RPC**, so a log-scanning leaderboard wouldn't work there. Events (`RoundStarted`, `ActionSubmitted`, `RoundFinalized`, `BestScoreUpdated`) are still emitted for explorers and any future indexer.
- **Refresh-safe.** On load, `/play` asks the contract for the wallet's `activeRoundId`. A live round resumes. If the round has expired, it settles. Browser memory never determines game state.
- **Transaction states** (FR11): disconnected, wrong network (with one-click switch or add), requested in the wallet, pending, confirmed (with measured latency), failed/reverted (with the reason in plain language, followed by a re-read from chain), and round expired. A tap counts in the UI only after its receipt shows the contract's `ActionSubmitted` event.

### Session keys

A wallet popup per tap would make a 60-second tap game unplayable. So `startRound(sessionKey)` names a browser-generated key that may submit actions **for that round only**, and forwards it a small gas float (about 90 taps' worth at the live gas price, shown before you approve). The key can't touch other rounds or other players, and the contract never holds funds. After settling, the app returns the remaining float to the player. The profile page shows the key and has a manual "Return float" button. Players who'd rather not delegate can pick **Sign every tap** on `/play`.

## Why BOT Chain

BOT Blitz only works on a chain where a transaction per tap is fast and cheap enough to be the game loop:

- **Frequent interactions:** one transaction per tap, dozens per minute per player.
- **Fast confirmation:** the next target appears only after the previous tap confirms, so block time is the pace of the game.
- **Low-cost micro-actions:** a scoring tap uses about 42k gas.
- **Transparent state:** scores, bests and the board are contract storage anyone can read on BOTScan.
- **Measurable activity:** every round is a burst of real wallet transactions.

We don't quote performance numbers from marketing. The app measures them live: the home page shows average block time over the last 100 blocks and the current gas cost of a tap, and `/play` shows your own tap-to-receipt latency per transaction. Figures from our deployment are recorded under [Deployment](#deployment).

## Setup

Prerequisites: Node 20+, [Foundry](https://book.getfoundry.sh/).

```bash
# contracts
cd contracts
forge install foundry-rs/forge-std   # if lib/forge-std is missing
forge build
forge test

# web
cd ../web
cp .env.example .env.local            # set NEXT_PUBLIC_BLITZ_ADDRESS after deploying
npm install
npm run dev                           # http://localhost:3000
npm run build                         # static site in web/out (runs check-chain first)
```

### Chain configuration

Network values come from the official BOT Chain docs ([Quick Guide](https://dev-docs.bohr.life/docs/Developers/quick-guide/), [JSON-RPC endpoints](https://dev-docs.bohr.life/docs/Developers/json-rpc-endpoint/)) and live only in env files. `npm run build` runs `scripts/check-chain.mjs`, which asks the RPC for its chain ID and checks that the contract has code there. A stale or mistyped config fails the build.

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC | https://rpc.bohr.life | https://rpc.botchain.ai |
| Explorer | https://scan.bohr.life | https://scan.botchain.ai |
| Faucet | https://faucet.botchain.ai/basic | - |

(Checked on 2026-09-29 and again on 2026-10-01: both RPCs returned the chain IDs above. On mainnet, BOT comes from the official DEX at https://dex.botchain.ai/#/swap, linked from the Quick Guide.)

**Gas price:** 20 gwei is the floor on mainnet. In a scan of 1,500 recent blocks, no user transaction was included below it; the only 0-gwei transactions are validator system calls. Deploys are pinned to it with `--legacy --with-gas-price 20gwei`.

### Deploy

```bash
cd contracts
cp .env.example .env                  # add DEPLOYER_PRIVATE_KEY
source .env

# mainnet (chain 677): needs ~0.054 BOT on hand, spends ~0.041
forge script script/Deploy.s.sol --rpc-url "$BOT_MAINNET_RPC_URL" --broadcast \
  --legacy --with-gas-price 20gwei --private-key "$DEPLOYER_PRIVATE_KEY"
forge verify-contract <ADDRESS> src/BOTBlitz.sol:BOTBlitz \
  --chain-id 677 --verifier blockscout --verifier-url "$BOT_MAINNET_EXPLORER_URL/api/"

# testnet (chain 968): tBOT from the faucet
forge script script/Deploy.s.sol --rpc-url "$BOT_RPC_URL" --broadcast \
  --legacy --with-gas-price 20gwei --private-key "$DEPLOYER_PRIVATE_KEY"
forge verify-contract <ADDRESS> src/BOTBlitz.sol:BOTBlitz \
  --chain-id 968 --verifier blockscout --verifier-url "$BOT_EXPLORER_URL/api/"
```

Then set `NEXT_PUBLIC_BLITZ_ADDRESS` (and the matching network block from `web/.env.example`) in `web/.env.local` and run `npm run build`. Deploy `web/out/` to any static host.

## Contract addresses

| Network | BOTBlitz | Verified |
|---|---|---|
| **BOT Chain Mainnet (677)** | [`0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C`](https://scan.botchain.ai/address/0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C) | Yes, source verified on BOTScan (Blockscout) |
| BOT Chain Testnet (968) | [`0x063ec46d1d1853d6ce3ea17f5e5451f587687724`](https://scan.bohr.life/address/0x063ec46d1d1853d6ce3ea17f5e5451f587687724) | Yes, source verified on BOTScan (Blockscout) |

## Deployment

The app runs on **mainnet**. The testnet deployment stays live for development.

### Mainnet (chain 677)

Deployed 2026-10-01 via `https://rpc.botchain.ai` at the 20 gwei floor. It's the same source that was tested and verified on testnet.

- **Deploy tx:** [`0xcbf1…04d6`](https://scan.botchain.ai/tx/0xcbf1a464a7f7cb5eadfa049005bdbc404df8d5137886c8a4d656c44ac5c004d6) in block 25,181,514, 2,056,404 gas (0.0411 BOT)
- **Deployer:** `0x869Ab0f7B9E7d8eD467F513Bb620ED9Fc81b3215`

#### First mainnet round (scripts/e2e.mjs, 4 taps, the 4th deliberately wrong)

| Step | Result | Tx |
|---|---|---|
| `startRound` with a session key and a 0.01158 BOT float | round #1 | [0x84a6…c7ad](https://scan.botchain.ai/tx/0x84a6579f1e136dab7bd030e5cd8277e1d8c4561b4a616bdda8153bc5d899c7ad) |
| tap 1 (hit) | score 1 | [0xabe3…35d6](https://scan.botchain.ai/tx/0xabe325dd4c9088555a4fe36ca3b48f4078d855bbc1c9929ed3971647f9e535d6) |
| tap 2 (hit) | score 2 | [0x489e…0e73](https://scan.botchain.ai/tx/0x489ed24fcffd42c0a30cbdd57fc3e754bf9635c58459d45f31d6f05c1e4e0e73) |
| tap 3 (hit) | score 3 | [0xf8d7…4df2](https://scan.botchain.ai/tx/0xf8d71f6e439600731420c6493198f0f791fe90a5c851e1c8674b4d49026b4df2) |
| tap 4 (deliberate miss) | score stays 3 | [0x6259…a7ae](https://scan.botchain.ai/tx/0x62593ef130a3ce717f96a9ab4f6a2b29ff989b1bf69f23f860971604cdb5a7ae) |
| replay of step 0 | rejected by contract (`StaleStep`) | - |
| tap after the 60s window | rejected by contract (`RoundExpired`) | - |
| `finalizeRound` | best 3, leaderboard #1 | [0x6d6e…5029](https://scan.botchain.ai/tx/0x6d6e10f077eb299cf80a159e9cd801db913c26b110bb71300aac666981005029) |
| float returned to player | 0.00437 BOT | [0xd3eb…63bf](https://scan.botchain.ai/tx/0xd3eb5047fb0661a8af4a0512e5ded58d4cb4bfe9cee3bd3e35e7bf244eeb63bf) |

Read back from the contract: round #1 score **3**, misses **1**, finalized; player best 3 (round #1); leaderboard rank #1.

#### Measured on mainnet (from this run)

- **Tap-to-receipt latency:** median **814 ms**, min 789 ms, max 843 ms over 4 taps.
- **Gas:** 20 gwei. A hit uses 42,395 gas, about **0.00085 BOT** (≈ $0.01 at $12.38/BOT on 2026-10-01). A miss uses 38,609 gas. `finalizeRound` used 173,502 gas.
- **The whole round** (start, 4 taps, settle, sweep) cost **0.0112 BOT**. Deploy plus round came to 0.0524 BOT.
- **Player float:** the app sets aside 0.071 BOT per round at 20 gwei. That covers the fastest possible round (75 taps, about one per confirmation), and the unspent part is returned automatically.

### Testnet (chain 968)

Deployed 2026-09-29 via `https://rpc.bohr.life`.

- **Deploy tx:** [`0xf693…3275`](https://scan.bohr.life/tx/0xf69312204cfa232d367478c53333ad0a3851ba1d9023d5880ad6a7b5414b3275) in block 25,048,514, 2,056,404 gas
- **Deployer:** `0x869Ab0f7B9E7d8eD467F513Bb620ED9Fc81b3215`

#### First testnet round (scripts/e2e.mjs, 12 taps, every 4th tap deliberately wrong)

| Step | Result | Tx |
|---|---|---|
| `startRound` with a session key and a 0.0254 BOT float | round #1 | [0xdd3b…a9f0](https://scan.bohr.life/tx/0xdd3be79861dc2ab889bd99af4dcc5f191825987a331e06989e6eae64c80aa9f0) |
| tap 1 (hit) | score 1 | [0x0598…e5af](https://scan.bohr.life/tx/0x05980ac1852dc3fd6390d046e263c597dc6fb8ba0b551550bcedb1537241e5af) |
| tap 4 (deliberate miss) | score stays 3 | [0x8d41…7ed8](https://scan.bohr.life/tx/0x8d4134e968a5e117c1c39f1902152fcc4543c2f3c957f41a156215de58067ed8) |
| tap 11 (hit) | score 9 | [0x1df5…e535](https://scan.bohr.life/tx/0x1df584c7e08860bd80013e5198cc607d40fdef64176a90ad4ca25e0a5ddfe535) |
| replay of step 0 | rejected by contract (`StaleStep`) | - |
| tap after the 60s window | rejected by contract (`RoundExpired`) | - |
| `finalizeRound` | best 9, leaderboard #1 | [0xe864…f7ac](https://scan.bohr.life/tx/0xe864cab584a8b6ade9d48181aba54ee4ff6bfc223970dc922599c81944cdf7ac) |
| float returned to player | 0.01158 BOT | [0xd441…fda9](https://scan.bohr.life/tx/0xd4410b609355a41808902d657ce3130bf6c4d8de77914ceb5111bed0adcffda9) |

Read back from the contract: round #1 score **9**, misses **3**, finalized; player best 9 (round #1), 1 round, 9 valid actions; leaderboard rank #1.

#### Measured on testnet (from this run, not quoted from docs)

- **Tap-to-receipt latency** (sign, send, then poll for the receipt from a home connection): median **835 ms**, min 765 ms, max 2,245 ms over 12 taps.
- **Gas price:** 20 gwei. A scoring tap uses 42,395 gas, about **0.00085 BOT**. A miss uses 38,609 gas. `finalizeRound` used 173,502 gas.
- **One full round** (start, 12 taps, settle) spent about 0.0138 BOT of the 0.0254 BOT float, and the rest was returned.

## Testing

### Contracts

```bash
cd contracts && forge test --gas-report
```

27 tests, all passing. They cover every case in PRD §15:

| PRD case | Test |
|---|---|
| player can start a round | `test_StartRound_CreatesState` |
| second active round rejected | `test_StartRound_SecondActiveRejected` |
| valid action increments score | `test_ValidAction_IncrementsScoreAndAdvances` |
| invalid action doesn't | `test_InvalidAction_DoesNotScore`, `test_InvalidChoiceOutOfRangeReverts` |
| step can't score twice | `test_StepCannotBeScoredTwice` |
| action after expiry rejected | `test_ActionAfterExpiryRejected` |
| exact expiry edge | `test_ExpiryBoundary_LastSecondScores_ExactEndRejected` (t = end−1 scores, t = end reverts) |
| completion deterministic | `test_FinalizeIsDeterministicAndOnce`, `test_StartRound_AutoFinalizesExpiredPrevious`, `test_FinalizeBeforeExpiryRejected` |
| best score updates / lower doesn't replace | `test_BestScoreUpdates`, `test_LowerScoreDoesNotReplaceBest`, `test_EqualScoreDoesNotReplaceBest` |
| player statistics | `test_PlayerStatisticsAndHistory` |
| events | `test_EventsEmitted` |
| other wallets can't act | `test_UnrelatedWalletCannotAct`, `test_SessionKeyCanActOnlyForItsRound` |
| leaderboard | `test_LeaderboardSortedAndTiesKeepEarlier`, `test_LeaderboardBoundedAndEvictsLowest`, `test_ZeroScoreRoundNotOnBoard` |
| pacing | `test_OneActionPerBlock` |
| session float | `test_StartRound_ForwardsFloatToSessionKey`, `..._FloatWithoutKeyRejected`, `..._FloatTransferFailureReverts` |
| score = correct choices (fuzz) | `testFuzz_ScoreEqualsCorrectChoices` |

Gas (optimizer on, 10k runs): `submitAction` 24k–59k (hit ≈ 42k including base cost on a live node), `startRound` ≈ 147k, `finalizeRound` 146k–252k (bounded by the top-20 board).

### End to end

`web/scripts/e2e.mjs` plays a real round over RPC using the same transaction path as the app: session key and float, raw-signed taps, receipt parsing, deliberate misses, replay and post-expiry rejection, finalize, float sweep, then reads back the score, best and leaderboard rank.

```bash
cd web
RPC_URL=https://rpc.bohr.life BLITZ_ADDRESS=0x... EXPLORER_URL=https://scan.bohr.life \
PLAYER_PRIVATE_KEY=0x... node scripts/e2e.mjs 10
```

It passed against local Anvil (1s blocks) and against BOT Chain testnet (see [Deployment](#deployment)).

### Frontend QA checklist (PRD §15)

Connect → switch to BOT Chain → start → several taps → wait for expiry → score read from contract → personal best → leaderboard → profile → refresh mid-round (resumes from chain). Failure paths: rejecting in the wallet, reverted tap (e.g. same-block), failed network switch (manual add instructions shown), expired round, duplicate/stale step, refresh during a round, disconnect/reconnect, RPC failure (error banners with retry, no stale data shown).

## Threat model and security notes

| Threat | Mitigation |
|---|---|
| Player submits their own score | No function accepts a score. Points come only from `choice == currentTarget`. |
| Replaying a scored step | `step` must equal the round's current step and advances on each hit. |
| Acting after the window | `block.timestamp >= endTime` reverts. Finalize can't change the score. |
| Acting on someone else's round | Only `round.player` or the round's own `sessionKey` may call `submitAction`. |
| Parallel rounds to farm bests | One active round per wallet. An expired round is settled before a new one starts. |
| Scripted clients spamming taps | At most one action per block per round, so the chain's block rate caps every client equally. |
| Predictable targets | Targets derive from a seed fixed at round start and the step number, so a script can compute them. **Accepted for the MVP:** knowing the next cell doesn't beat the one-per-block cap. The remaining edge is a bot that never misses and taps every block, versus a human needing roughly 1–2 blocks per tap. A future version could use commit-reveal or a VRF. |
| Sybil wallets | Out of scope. Each wallet is a player, and the board shows addresses. |
| Session key compromise (browser storage) | Worst case: someone else plays out that one round and spends the small float. It can't touch other rounds, stats beyond that round's score, or the player's wallet. |
| Reentrancy via the float transfer | The value transfer is the last step (CEI). Re-entering can't start a second round, and taps are paced per block. |
| Griefing via finalize | Anyone can finalize, but only after expiry, and it can't change the score. |
| Unbounded gas | No loops over players. The board update is bounded by 20. History pages cap at 50. |
| Admin abuse | No admin, owner, upgradeability or withdrawal functions. |
| Integer overflow | Solidity 0.8 checked arithmetic. Packed widths (uint32 score/step, uint40 time, uint64 ids) far exceed reachable values. |
| Frontend tampering | The UI only renders chain state. Every rule is checked in the contract, and a modified client can do nothing a direct contract call can't. |

The contract hasn't been audited. On mainnet that risk is bounded by design: the contract never holds funds (the only value it touches is a player's own float, forwarded straight to their session key), and it has no admin, owner or upgrade path. The worst a bug could do is corrupt game state or waste a player's gas. It can't take anyone's BOT.

## Demo

- **Demo URL:** _pending hosting_
- **Demo video:** _pending_

## Roadmap

- **M1: Deployed MVP.** Contract, tests, four routes, full 60-second loop, on-chain scores, leaderboard, profile, README, demo URL.
- **M2: First real users.** 25–100 players, real rounds and transaction history, gameplay feedback, and a published build log on the BOT Chain implementation.
- **M3: Retention.** Daily challenges, weekly board resets and seasons, achievement badges, more simple modes, ecosystem quests. These start only once the core game has users.

## Brand

The logo and its variants, with usage rules, are in [brand/](brand/README.md).

## License

MIT. See [LICENSE](LICENSE).
