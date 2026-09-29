# BOT Blitz — Product Requirements Document

## 1. Product Overview

**Project name:** BOT Blitz

**Category:** On-chain game / consumer application

**Target chain:** BOT Chain

**Primary goal:** Build and deploy a simple, fast, competitive on-chain game that demonstrates why BOT Chain is useful for frequent, low-cost blockchain interactions.

BOT Blitz is a short-session game where players enter a 60-second round and complete as many valid game actions as possible before the timer ends. Each completed action produces an on-chain state change and contributes to the player's score.

The MVP must be a real deployable product, not a prototype or slide-only concept. The game must work end-to-end on BOT Chain, with verified contracts, a working web application, persistent on-chain scores, and a public leaderboard.

The project should remain intentionally simple. Do not expand the MVP into a large GameFi economy, NFT collection, token system, multiplayer engine, or complex game world.

---

## 2. Problem

Most blockchain games either hide the blockchain behind a normal game loop or introduce unnecessary complexity such as tokens, NFTs, large economies, and long gameplay sessions.

BOT Blitz should demonstrate a different use case:

- very short gameplay sessions;
- frequent player actions;
- immediate blockchain confirmation;
- transparent, verifiable scores;
- simple competition between players.

The blockchain should be load-bearing. A player should not be able to complete the core game entirely off-chain and simply submit a final score afterward.

---

## 3. Product Objective

Build the smallest useful version of BOT Blitz that proves:

1. Players can connect a wallet and start a game.
2. A game round has a fixed 60-second duration.
3. Players perform repeated valid actions during the round.
4. Valid actions are recorded by the BOT Chain smart contract.
5. The contract calculates or validates score progression.
6. A round cannot continue after its 60-second window.
7. A player's best score and/or current score can be read from chain.
8. A public leaderboard ranks players by their best verified score.
9. The application handles transaction pending, success, and failure states correctly.
10. The project can be deployed and demonstrated on BOT Chain.

---

## 4. Target Users

### Primary user

A crypto user who wants a quick competitive on-chain game that can be played in under two minutes.

### Secondary user

BOT Chain community members who want a simple way to interact with the chain and compete with other ecosystem participants.

---

## 5. MVP Game Concept

### Core loop

The MVP game mode is called **Blitz Round**.

A player:

1. Connects a compatible EVM wallet.
2. Starts a round through the smart contract.
3. Receives a round identifier and a server-independent/contract-verifiable round start timestamp.
4. Has exactly 60 seconds of active play time.
5. Submits valid game actions during that window.
6. Earns points for valid actions.
7. Ends automatically when the 60-second period expires.
8. Has the final verified score stored/read from the contract.
9. Sees whether the score becomes their personal best.
10. Appears on the global leaderboard when applicable.

The game must not require a separate backend to decide whether a player won or what score they earned. Critical game state must be verifiable from the smart contract.

---

## 6. Recommended Simple Game Mechanic

The MVP should use a **target-action mechanic** rather than a complex game engine.

Each active round has a current target. The player must submit the correct action/value for the current target.

Example flow:

- Contract creates a round with a target state.
- Frontend displays the current target.
- Player chooses/submits the matching action.
- Contract verifies the action.
- Correct action increases the score.
- Contract advances the player to the next target.
- Incorrect actions do not increase the score.
- The process repeats until the round expires.

The exact target-generation implementation may be changed by the building agent when implementing the contract, but it must satisfy the following requirements:

- players must receive objectively verifiable targets;
- the correct response must be deterministic from contract state;
- players must not be able to choose their own score;
- target progression must happen on-chain;
- replaying an already-used target/action must not award additional points.

The initial implementation should favor the simplest secure mechanism over sophisticated randomness. A pseudo-random target mechanism is acceptable for an MVP only if it cannot be used by a player to directly manipulate their own score. Do not introduce a separate randomness oracle unless the chosen mechanic actually needs it.

---

## 7. Functional Requirements

### FR1 — Wallet connection

The application must allow a user to connect an EVM-compatible wallet.

The application must detect whether the user is connected to BOT Chain and provide a way to switch networks when supported by the wallet.

The chain configuration must be pulled from the official BOT Chain documentation at build time. Do not hardcode chain configuration from memory.

### FR2 — Player identity

A wallet address is the player's primary identity.

No account/password system is required for the MVP.

The application may display a shortened wallet address, but the full address must remain available where needed for blockchain interactions.

### FR3 — Start round

The player must be able to start a new 60-second round.

The contract must create and persist the round state.

At minimum, the round state must contain:

- round ID;
- player address;
- start timestamp;
- end timestamp or equivalent expiry condition;
- current target/state;
- current score;
- action count/progression state;
- active/completed status.

A player must not have multiple simultaneously active rounds unless the contract design explicitly supports it. The MVP should use one active round per wallet.

### FR4 — Submit action

During an active round, the player can submit a game action.

The contract must verify:

- the round belongs to the caller;
- the round is active;
- the round has not expired;
- the action is valid for the current target/state;
- the same progression step cannot be scored twice.

A valid action must update the on-chain game state.

### FR5 — Score

Every successful valid action increases the player's round score according to a deterministic contract rule.

The player must never provide the resulting score directly to the contract.

The contract must calculate the resulting score.

The MVP should use a simple score rule such as **+1 point per correct action**.

Do not add multipliers, streak systems, combos, boosts, or power-ups in the MVP unless they are necessary for the basic game to function.

### FR6 — Round expiry

A round lasts 60 seconds from its recorded start time.

The contract must reject gameplay actions after expiry.

The final score must remain readable after the round ends.

The frontend should automatically update its local state when the timer reaches zero, but the blockchain remains authoritative.

### FR7 — End/settle round

The project must have a deterministic way to mark a round as completed.

Preferred MVP approach:

- Gameplay transactions update state while active.
- Once expired, anyone or the player can call a lightweight `finalizeRound` function if necessary.
- Finalization must not change the score earned before expiry.

The implementation may instead infer completion from `block.timestamp >= endTime` if that is cleaner and secure. Avoid unnecessary settlement transactions.

### FR8 — Personal best

When a round is completed, the contract must compare the result against the player's stored best score.

If the new result is higher, the player's best score must be updated.

The contract must also store enough information to identify the round associated with the current best score.

### FR9 — Leaderboard

The application must provide a public leaderboard.

The MVP leaderboard should display at minimum:

- rank;
- wallet/player identifier;
- best score;
- best round ID or equivalent reference.

The leaderboard must be based on verifiable data rather than frontend-only local storage.

Because fully on-chain sorting over an unbounded player list is inefficient, the building agent may use a simple indexed/read layer for leaderboard discovery while treating the contract events and storage as the source of truth.

For the first deployment, the implementation may use a bounded leaderboard or a small indexed set of top players. Do not implement an unnecessarily complex decentralized indexing protocol.

### FR10 — Player profile/history

A player must be able to view basic on-chain game statistics.

Minimum statistics:

- wallet address;
- best score;
- total rounds completed;
- total valid actions;
- best round ID.

The MVP does not need social profiles, usernames, avatars, friends, chat, or messaging.

### FR11 — Transaction states

The frontend must correctly represent:

- wallet disconnected;
- wrong network;
- transaction requested;
- transaction pending;
- transaction confirmed;
- transaction failed/reverted;
- round expired.

Transaction errors must not leave the frontend believing an action succeeded when the transaction did not confirm.

### FR12 — No mandatory token economy

The MVP must not require a new project token.

No token should be created merely for points, status, or presentation.

If a future version introduces rewards, that must be a separate product/economic design decision after the core game has users and activity.

### FR13 — No paid entry required for MVP

The MVP should not require players to pay an entry fee to play.

The building agent may implement a zero-value/free gameplay model so the project can focus on proving the on-chain game loop and attracting initial users.

### FR14 — On-chain event history

The contract must emit useful events for important actions, such as:

- `RoundStarted`;
- `ActionSubmitted` or equivalent;
- `RoundCompleted` / `RoundFinalized`;
- `BestScoreUpdated` when applicable.

Events should contain enough information for a frontend or indexing layer to reconstruct useful game history.

---

## 8. Smart Contract Requirements

Use Solidity and standard EVM tooling such as Foundry or Hardhat.

The contract architecture should remain small and understandable.

### Suggested contract responsibilities

A single primary `BOTBlitz` contract is preferred for the MVP.

It should manage:

- round creation;
- active round state;
- target/state progression;
- action verification;
- score calculation;
- round expiry;
- player statistics;
- best score storage;
- relevant events.

A separate token, NFT contract, marketplace contract, or treasury contract is not required.

### Security requirements

The implementation must include at minimum:

- access control where admin functions exist;
- checks-effects-interactions where relevant;
- protection against replaying an already-scored action/state;
- protection against actions after round expiry;
- protection against starting conflicting simultaneous rounds;
- safe integer types / overflow-safe arithmetic;
- no unbounded loops in state-changing functions;
- no user-controlled score values;
- no reliance on mutable frontend state for game validity;
- a documented threat model in the README.

These requirements are consistent with the BOT Chain Builder security baseline in the source MD. fileciteturn0file0L75-L79

### Gas/transaction considerations

BOT Blitz intentionally expects frequent gameplay transactions. Contract functions must therefore be simple and gas-efficient.

Do not store unnecessary large arrays on-chain.

Do not perform loops proportional to the number of players inside gameplay functions.

Do not make every frontend interaction a blockchain transaction unless it contributes to the actual game state.

---

## 9. Frontend Requirements

There are **4 standard pages/routes** in the MVP:

| # | Page | Route | Purpose |
|---|---|---|---|
| 1 | Home | `/` | Explain the game, show basic global stats, and let the user connect/start playing. |
| 2 | Play | `/play` | Main 60-second gameplay experience and active/completed round state. |
| 3 | Leaderboard | `/leaderboard` | Display globally ranked verified player scores. |
| 4 | Profile | `/profile` | Display the connected wallet's on-chain game statistics and personal history. |

**Total standard pages: 4.**

There should be no separate standard route for round results. The completed-round result can be represented within `/play`.

There should be no separate login page. Wallet connection is part of the application shell/home/play experience.

There should be no separate admin page in the user-facing MVP unless implementation or deployment operations genuinely require one.

### Frontend implementation instruction

**Do not include or invent any design requirements in this PRD.**

When implementation reaches the frontend/UI stage, the building agent must read and follow **`frontend.md`** as the source of truth for frontend design, visual structure, styling, components, layout, and interaction presentation.

This PRD only defines product behavior and functional requirements. It does not override or duplicate `frontend.md`.

---

## 10. Suggested Application Structure

A reasonable implementation can be:

```text
BOT Blitz
├── Smart Contract
│   └── BOTBlitz.sol
│
├── Frontend
│   ├── Home (/)
│   ├── Play (/play)
│   ├── Leaderboard (/leaderboard)
│   └── Profile (/profile)
│
├── Blockchain integration
│   ├── Wallet connection
│   ├── Contract reads
│   ├── Contract writes
│   └── Transaction state handling
│
└── Optional indexing/read layer
    └── Leaderboard/history discovery
```

The optional indexing layer must not become the authority for score correctness. Smart contract state/events remain authoritative.

---

## 11. Data Model

### Player

Minimum conceptual fields:

```text
address wallet
uint256 bestScore
uint256 bestRoundId
uint256 totalRounds
uint256 totalValidActions
```

### Round

Minimum conceptual fields:

```text
uint256 roundId
address player
uint256 startTime
uint256 endTime
uint256 score
uint256 currentStep
uint256 currentTarget
bool finalized/completed
```

The building agent may alter the exact Solidity representation if it improves security or gas usage without removing required behavior.

---

## 12. Game Rules

The MVP rules are intentionally simple:

1. A round lasts 60 seconds.
2. One wallet can have one active round at a time.
3. A player must start a round before submitting actions.
4. Every valid action earns 1 point.
5. Invalid actions earn 0 points.
6. The contract verifies the action against the current target/state.
7. Each progression step can award points only once.
8. No actions can score after the round expires.
9. The player's highest verified score becomes their personal best.
10. The global leaderboard ranks verified best scores.
11. No project token is required.
12. No paid entry is required for the MVP.

---

## 13. BOT Chain Fit

BOT Blitz must make a clear case for why it is built on BOT Chain instead of being an identical application on an arbitrary EVM chain.

The product should specifically demonstrate:

- frequent blockchain interactions during short gameplay sessions;
- fast confirmation in the gameplay experience;
- low-cost micro-interactions;
- transparent on-chain score/state;
- a consumer-facing use case for BOT Chain;
- measurable wallet and transaction activity.

BOT Chain is described in the source material as an EVM-compatible AI-native L1 with sub-second latency, near-zero fees, and native MEV resistance, making frequent agent or micro-transaction interactions a suitable design target. fileciteturn0file0L16-L19

Games are listed as an acceptable ecosystem category, with the requirement that the project have a working demo and a real reason for its chain economics. fileciteturn0file0L37-L46

The building agent must not make unsupported performance claims. Actual deployed latency, transaction cost, and throughput should be measured and reported from the real deployment.

---

## 14. Mainnet / Testnet Deployment

Before deployment, the building agent must fetch and verify current BOT Chain configuration from official BOT Chain documentation and the chain registry.

Do not hardcode RPC URLs, explorer URLs, chain IDs, or contract addresses from memory.

Required deployment evidence:

- deployed contract address;
- verified contract source where supported;
- deployed frontend URL;
- working wallet connection;
- successful test gameplay;
- successful leaderboard reads;
- successful profile reads;
- transaction links/explorer evidence;
- README updated with deployment information.

The source MD explicitly requires current chain configuration to be fetched at build time and recommends verified contracts plus a working demo URL. fileciteturn0file0L62-L68

---

## 15. Testing Requirements

### Smart contract tests

At minimum test:

- player can start a round;
- second active round is rejected;
- valid action increments score;
- invalid action does not increment score;
- a previously processed step cannot be scored twice;
- action after expiry is rejected;
- round completion is deterministic;
- best score updates correctly;
- lower score does not replace best score;
- player statistics update correctly;
- events are emitted correctly;
- unrelated wallets cannot modify another player's round;
- edge cases around the exact expiry timestamp are handled correctly.

### Frontend tests / QA

Verify end-to-end:

1. Connect wallet.
2. Switch to BOT Chain.
3. Start round.
4. Perform multiple actions.
5. Wait until expiry.
6. Confirm final score from contract state.
7. Confirm personal best update.
8. Confirm leaderboard update.
9. Confirm profile statistics.
10. Refresh the page and confirm state still comes from blockchain/indexed data rather than only browser memory.

### Failure testing

Test:

- rejected wallet transaction;
- reverted contract call;
- network switch failure;
- expired round;
- duplicate action submission;
- refresh during an active round;
- wallet disconnect/reconnect;
- RPC/read failure.

---

## 16. Analytics / Success Metrics

The MVP should collect measurable, privacy-conscious product metrics through public blockchain data and optional application analytics.

Primary metrics:

- unique participating wallets;
- total rounds started;
- total rounds completed;
- total gameplay transactions;
- average valid actions per round;
- highest verified score;
- daily/weekly active players;
- repeat-player rate.

The first milestone should prioritize real users over vanity metrics.

The source MD explicitly identifies evidence of usage such as testnet users, transaction counts, and early community as useful incubation evidence. fileciteturn0file0L62-L69

---

## 17. Milestone Roadmap

### M1 — Deployed MVP

Deliver:

- smart contract implemented and tested;
- contract deployed and verified;
- four frontend routes working;
- wallet connection;
- complete 60-second game loop;
- on-chain scores;
- leaderboard;
- player profile;
- README;
- demo URL.

### M2 — First Real Users

Target:

- first 25–100 real players;
- real completed rounds;
- real transaction history;
- collect gameplay feedback;
- identify any UX/gameplay issues;
- publish a build log or tutorial explaining the BOT Chain implementation.

### M3 — Retention / Ecosystem Growth

Potential additions after the MVP proves usage:

- daily challenges;
- weekly leaderboard resets;
- seasons;
- achievement badges;
- additional simple game modes;
- ecosystem quests;
- referral mechanics.

Do not build these during the MVP unless the core game is already working.

The milestone-based roadmap is intentional because the BOT Labs incubation model releases support against phased milestones. fileciteturn0file0L23-L25

---

## 18. Out of Scope for MVP

Do **not** build the following unless a later milestone explicitly requires them:

- custom project token;
- NFT collection;
- token staking;
- yield farming;
- paid tournament economy;
- complex matchmaking;
- real-time multiplayer networking;
- chat or social messaging;
- guilds/clans;
- elaborate character system;
- 3D game engine;
- mobile native app;
- DAO governance;
- complicated oracle infrastructure;
- cross-chain support;
- advanced anti-cheat infrastructure;
- unbounded on-chain global sorting;
- unnecessary backend infrastructure.

The goal is to prove the basic on-chain game loop first.

---

## 19. README / Submission Requirements

The finished repository must include a README containing:

1. one-sentence project pitch;
2. problem statement;
3. how BOT Blitz works;
4. architecture overview;
5. why BOT Chain is relevant;
6. setup/install instructions;
7. contract addresses;
8. deployment information;
9. testing instructions/results;
10. threat model/security notes;
11. demo URL;
12. demo video link;
13. roadmap;
14. license.

The source MD recommends a public repository, real commit history, open-source licensing, deployment evidence, a 2–4 minute demo video, and a milestone roadmap. fileciteturn0file0L62-L69

---

## 20. Demo Requirements

The final demo should prove the complete product rather than showing static screens.

Recommended flow:

1. Open BOT Blitz.
2. Connect wallet.
3. Show BOT Chain network.
4. Start a round.
5. Perform several valid game actions.
6. Show on-chain transactions being confirmed.
7. Let the round expire or demonstrate completion.
8. Show final verified score.
9. Show leaderboard entry.
10. Open player profile and show persisted statistics.

Keep the demo focused on a working product.

---

## 21. Build Agent Instructions

The building agent must follow these rules:

### Repository inspection first

Before writing code:

- inspect the existing repository;
- inspect `frontend.md` before implementing any frontend/UI work;
- inspect existing package/tooling choices;
- preserve useful existing infrastructure where possible;
- avoid introducing unnecessary frameworks or services.

### Frontend source of truth

**`frontend.md` is mandatory for frontend implementation.**

This PRD intentionally contains no visual or design requirements.

When the build reaches the frontend stage, read `frontend.md` and implement its instructions exactly unless doing so would conflict with a functional requirement in this PRD.

### Chain configuration

Before deployment:

- retrieve current BOT Chain RPC/network details from official sources;
- verify chain ID and deployment configuration;
- never rely on stale hardcoded configuration;
- use environment variables for deployment/runtime configuration where appropriate.

### Implementation preference

Choose the simplest architecture that satisfies every requirement.

Prefer:

- one primary game contract;
- standard EVM libraries;
- minimal backend dependencies;
- simple read/indexing infrastructure;
- contract-derived game state;
- deterministic game rules;
- straightforward tests.

Do not over-engineer the MVP.

### Definition of done

BOT Blitz is complete only when:

- contracts compile;
- contract tests pass;
- security-sensitive paths have tests;
- contract is deployed;
- deployment is verified where supported;
- frontend connects to the deployed contract;
- the complete 60-second round works end-to-end;
- score is verifiably stored/read from chain;
- leaderboard works;
- profile statistics work;
- transaction failures are handled correctly;
- README is complete;
- demo URL works;
- demo video can show real gameplay.

---

## 22. Final Product Definition

**BOT Blitz is a 60-second, fully on-chain competitive micro-game built on BOT Chain, where players perform verifiable actions during a timed round, earn an on-chain score, and compete on a public leaderboard.**

The MVP succeeds when a new user can connect a wallet, play a complete round, see real BOT Chain transactions, receive a verifiable score, and see that score reflected in their profile and the public leaderboard.

The product should prove BOT Chain's practical value through frequent, low-cost, fast on-chain interactions without requiring a complicated game economy.
