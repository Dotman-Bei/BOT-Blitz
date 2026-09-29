// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title BOT Blitz
/// @notice A 60-second on-chain micro-game. The contract lights one cell of a 3x3 grid; the player
///         submits the matching cell. Every correct action is +1 point, computed here, never supplied
///         by the player. Targets advance on-chain, each step can score once, and nothing scores after
///         the round's 60-second window.
/// @dev    No admin, no token, no fees. The only value that moves is an optional gas float the player
///         forwards to their own session key in `startRound`; this contract never holds funds.
contract BOTBlitz {
    // ---------------------------------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------------------------------

    uint256 public constant ROUND_DURATION = 60;
    uint8 public constant GRID_CELLS = 9;
    uint256 public constant LEADERBOARD_SIZE = 20;
    uint256 public constant MAX_HISTORY_PAGE = 50;

    // ---------------------------------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------------------------------

    /// @dev Packed into three storage slots so a gameplay transaction touches as little state as possible.
    struct Round {
        // slot 0
        address player;
        uint40 startTime;
        uint40 endTime;
        uint8 currentTarget;
        bool finalized;
        // slot 1
        address sessionKey; // optional delegate allowed to submit actions for this round only
        uint32 score;
        uint32 step; // progression counter: number of targets cleared
        uint32 misses;
        // slot 2
        uint64 lastActionBlock;
        uint192 seed;
    }

    struct PlayerStats {
        uint64 bestScore;
        uint64 bestRoundId;
        uint64 totalRounds; // completed (finalized) rounds
        uint64 totalValidActions;
        uint64 activeRoundId; // 0 when none
        uint64 roundsStarted; // also the length of this player's round history
    }

    // ---------------------------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------------------------

    uint256 public nextRoundId = 1;
    uint256 public totalRoundsCompleted;
    uint256 public totalValidActions;
    uint256 public totalActions; // valid + missed, tallied at finalization
    uint256 public uniquePlayers;

    mapping(uint256 => Round) private _rounds;
    mapping(address => PlayerStats) private _players;
    /// @dev player => index => roundId. Indexed writes keep history O(1) without a growing array.
    mapping(address => mapping(uint256 => uint256)) private _history;

    /// @dev Bounded top-N by best score, kept sorted descending. Ties keep the earlier holder above.
    address[LEADERBOARD_SIZE] private _board;
    uint256 public boardSize;

    // ---------------------------------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------------------------------

    event RoundStarted(
        uint256 indexed roundId,
        address indexed player,
        address sessionKey,
        uint256 startTime,
        uint256 endTime,
        uint8 firstTarget
    );
    event ActionSubmitted(
        uint256 indexed roundId,
        address indexed player,
        uint32 step,
        uint8 choice,
        bool correct,
        uint32 score,
        uint8 nextTarget
    );
    event RoundFinalized(uint256 indexed roundId, address indexed player, uint32 score, uint32 misses);
    event BestScoreUpdated(
        address indexed player, uint256 indexed roundId, uint64 previousBest, uint64 newBest
    );

    // ---------------------------------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------------------------------

    error RoundStillActive(uint256 roundId);
    error UnknownRound();
    error NotRoundOwner();
    error RoundExpired();
    error RoundNotExpired();
    error RoundAlreadyFinalized();
    error StaleStep(uint32 expected);
    error OneActionPerBlock();
    error InvalidChoice();
    error SessionKeyRequired();
    error FloatTransferFailed();

    // ---------------------------------------------------------------------------------------------
    // Gameplay
    // ---------------------------------------------------------------------------------------------

    /// @notice Start a 60-second round. An expired-but-unfinalized previous round is finalized first.
    /// @param sessionKey Optional address allowed to submit actions for this round (address(0) for none).
    ///        Any `msg.value` is forwarded to it as a gas float; nothing is kept by this contract.
    function startRound(address sessionKey) external payable returns (uint256 roundId) {
        if (msg.value != 0 && sessionKey == address(0)) revert SessionKeyRequired();

        PlayerStats storage p = _players[msg.sender];
        uint256 active = p.activeRoundId;
        if (active != 0) {
            if (block.timestamp < _rounds[active].endTime) revert RoundStillActive(active);
            _finalize(active);
        }

        roundId = nextRoundId++;
        uint192 seed =
            uint192(uint256(keccak256(abi.encode(blockhash(block.number - 1), msg.sender, roundId))));
        uint8 firstTarget = _targetFor(seed, 0, 0);
        uint40 start = uint40(block.timestamp);
        uint40 end = start + uint40(ROUND_DURATION);

        _rounds[roundId] = Round({
            player: msg.sender,
            startTime: start,
            endTime: end,
            currentTarget: firstTarget,
            finalized: false,
            sessionKey: sessionKey,
            score: 0,
            step: 0,
            misses: 0,
            lastActionBlock: uint64(block.number),
            seed: seed
        });

        if (p.roundsStarted == 0) uniquePlayers++;
        _history[msg.sender][p.roundsStarted] = roundId;
        p.roundsStarted++;
        p.activeRoundId = uint64(roundId);

        emit RoundStarted(roundId, msg.sender, sessionKey, start, end, firstTarget);

        // Interaction last (checks-effects-interactions).
        if (msg.value != 0) {
            (bool ok,) = sessionKey.call{value: msg.value}("");
            if (!ok) revert FloatTransferFailed();
        }
    }

    /// @notice Submit a cell for the current target.
    /// @param roundId The round being played.
    /// @param step    The progression step the caller is answering; must equal the round's current step,
    ///                so a step can never be scored twice and stale or replayed transactions revert.
    /// @param choice  Grid cell, 0-8.
    function submitAction(uint256 roundId, uint32 step, uint8 choice) external {
        Round storage r = _rounds[roundId];
        address player = r.player;
        if (player == address(0)) revert UnknownRound();
        if (msg.sender != player && msg.sender != r.sessionKey) revert NotRoundOwner();
        if (r.finalized) revert RoundAlreadyFinalized();
        if (block.timestamp >= r.endTime) revert RoundExpired();
        if (step != r.step) revert StaleStep(r.step);
        if (block.number <= r.lastActionBlock) revert OneActionPerBlock();
        if (choice >= GRID_CELLS) revert InvalidChoice();

        r.lastActionBlock = uint64(block.number);

        if (choice == r.currentTarget) {
            uint32 newScore = r.score + 1;
            uint32 newStep = step + 1;
            uint8 next = _targetFor(r.seed, newStep, r.currentTarget);
            r.score = newScore;
            r.step = newStep;
            r.currentTarget = next;
            emit ActionSubmitted(roundId, player, step, choice, true, newScore, next);
        } else {
            r.misses += 1;
            emit ActionSubmitted(roundId, player, step, choice, false, r.score, r.currentTarget);
        }
    }

    /// @notice Settle an expired round: record stats, personal best and leaderboard. Callable by anyone;
    ///         it cannot change the score, which was fixed when the window closed.
    function finalizeRound(uint256 roundId) external {
        Round storage r = _rounds[roundId];
        if (r.player == address(0)) revert UnknownRound();
        if (r.finalized) revert RoundAlreadyFinalized();
        if (block.timestamp < r.endTime) revert RoundNotExpired();
        _finalize(roundId);
    }

    // ---------------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------------

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function getPlayer(address player) external view returns (PlayerStats memory) {
        return _players[player];
    }

    /// @notice True while actions can still score.
    function isLive(uint256 roundId) external view returns (bool) {
        Round storage r = _rounds[roundId];
        return r.player != address(0) && !r.finalized && block.timestamp < r.endTime;
    }

    /// @notice Newest-first page of a player's round IDs.
    function getPlayerRounds(address player, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory ids)
    {
        uint256 total = _players[player].roundsStarted;
        if (offset >= total) return new uint256[](0);
        if (limit > MAX_HISTORY_PAGE) limit = MAX_HISTORY_PAGE;
        uint256 remaining = total - offset;
        uint256 n = remaining < limit ? remaining : limit;
        ids = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            ids[i] = _history[player][total - 1 - offset - i];
        }
    }

    function getLeaderboard()
        external
        view
        returns (address[] memory players, uint64[] memory scores, uint64[] memory roundIds)
    {
        uint256 n = boardSize;
        players = new address[](n);
        scores = new uint64[](n);
        roundIds = new uint64[](n);
        for (uint256 i; i < n; ++i) {
            address a = _board[i];
            players[i] = a;
            scores[i] = _players[a].bestScore;
            roundIds[i] = _players[a].bestRoundId;
        }
    }

    function globalStats()
        external
        view
        returns (
            uint256 roundsStarted,
            uint256 roundsCompleted,
            uint256 validActions,
            uint256 actions,
            uint256 players
        )
    {
        return (nextRoundId - 1, totalRoundsCompleted, totalValidActions, totalActions, uniquePlayers);
    }

    // ---------------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------------

    /// @dev Deterministic from contract state. Never repeats the previous cell, so every new target is
    ///      visibly a change. Pseudo-random is fine here: knowing the next cell early doesn't help,
    ///      because each round accepts at most one action per block.
    function _targetFor(uint192 seed, uint32 step, uint8 previous) private pure returns (uint8) {
        uint256 h = uint256(keccak256(abi.encode(seed, step)));
        if (step == 0) return uint8(h % GRID_CELLS);
        return uint8((uint256(previous) + 1 + (h % (GRID_CELLS - 1))) % GRID_CELLS);
    }

    function _finalize(uint256 roundId) private {
        Round storage r = _rounds[roundId];
        r.finalized = true;

        address player = r.player;
        uint32 score = r.score;
        PlayerStats storage p = _players[player];
        p.activeRoundId = 0;
        p.totalRounds += 1;
        p.totalValidActions += score;

        totalRoundsCompleted += 1;
        totalValidActions += score;
        totalActions += uint256(score) + r.misses;

        emit RoundFinalized(roundId, player, score, r.misses);

        if (score > p.bestScore) {
            uint64 previous = p.bestScore;
            p.bestScore = score;
            p.bestRoundId = uint64(roundId);
            emit BestScoreUpdated(player, roundId, previous, score);
            _updateBoard(player, score);
        }
    }

    /// @dev Bounded by LEADERBOARD_SIZE; independent of the number of players.
    function _updateBoard(address player, uint64 score) private {
        uint256 size = boardSize;
        uint256 idx = size;
        for (uint256 i; i < size; ++i) {
            if (_board[i] == player) {
                idx = i;
                break;
            }
        }
        if (idx == size) {
            if (size < LEADERBOARD_SIZE) {
                boardSize = size + 1;
            } else {
                if (score <= _players[_board[size - 1]].bestScore) return;
                idx = size - 1; // evict the lowest entry
            }
        }
        while (idx > 0) {
            address above = _board[idx - 1];
            if (_players[above].bestScore >= score) break;
            _board[idx] = above;
            unchecked {
                --idx;
            }
        }
        _board[idx] = player;
    }
}
