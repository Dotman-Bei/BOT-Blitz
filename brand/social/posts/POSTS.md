# BOT Blitz mainnet launch posts

Five posts: 1 thread and 4 single posts. Each post fits X's 280-character limit for unverified accounts. Replace `[app link]` with the live app URL before posting. All figures are measured mainnet values from the README's Deployment section.

---

## Thread (attach `01-thread-launch.png` to post 1)

### 1/6
BOT Blitz: Officially launched on BOT Chain Mainnet (chain ID 677).

A 60-second game where every tap is a transaction and the smart contract keeps score. No backend. No token. No entry fee.

Verified contract:
0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C

Breakdown below.

### 2/6
2/ Round lifecycle:

- startRound fixes a 60s window from block.timestamp and lights the first cell of a 3x3 grid
- submitAction(roundId, step, cell) is validated and scored by the contract
- finalizeRound records the total, updates the personal best and the top-20 board

### 3/6
3/ The chain is the game loop.

The next cell lights only after the previous tap is confirmed, and the contract accepts one action per block per round.

Measured on mainnet: median tap-to-receipt latency of 814 ms (min 789 ms, max 843 ms).

### 4/6
4/ Session keys.

A wallet popup per tap would make a 60s game unplayable. startRound can name a browser-generated key, valid for that round only, and forward it a small gas float.

After settlement, the unspent float is swept back to the player. The contract never holds funds.

### 5/6
5/ No indexer required.

eth_getLogs is disabled on the public mainnet RPC, so bests, player stats, round history and a bounded top-20 leaderboard are kept in contract storage.

Events are still emitted for explorers and future indexers.

### 6/6
6/ Costs at the 20 gwei floor: a scoring tap uses 42,395 gas (~0.00085 BOT). Our first full mainnet round, start to settlement, cost 0.0112 BOT.

Play: [app link]
Contract: https://scan.botchain.ai/address/0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C

---

## Post 1: Latency (attach `02-latency.png`)
Median tap-to-receipt on BOT Chain mainnet, measured by BOT Blitz: 814 ms.

The next target lights only after the previous transaction confirms, so the pace of every round is set by block confirmation, not a client-side timer.

Play: [app link]

## Post 2: Cost (attach `03-cost.png`)
Cost of one scoring tap in BOT Blitz: 42,395 gas, about 0.00085 BOT at the 20 gwei mainnet floor. A miss uses 38,609 gas.

Session keys reduce a 60-second round to a single wallet approval. Any unspent gas float is returned to the player automatically.

## Post 3: Contract rules (attach `04-rules.png`)
Players never submit a score in BOT Blitz. The contract derives each target, awards each point and reverts on:

StaleStep: step already scored
RoundExpired: action after 60s
OneActionPerBlock: second tap in a block
NotRoundOwner: caller is not the player or its session key

## Post 4: Verification (attach `06-tests.png`)
BOT Blitz contract status:

27/27 Foundry tests passing, including a fuzz test asserting score = correct taps
Expiry boundary covered: end-1 scores, end reverts
Source verified on BOTScan (testnet + mainnet)
Mainnet deployment: block 25,181,514
