// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
import {BOTBlitz} from "../src/BOTBlitz.sol";

contract RejectingReceiver {
    receive() external payable {
        revert("no");
    }
}

contract BOTBlitzTest is Test {
    BOTBlitz internal game;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal aliceKey = makeAddr("aliceKey");
    address internal mallory = makeAddr("mallory");

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

    function setUp() public {
        vm.warp(1_700_000_000);
        vm.roll(100);
        game = new BOTBlitz();
        vm.deal(alice, 10 ether);
    }

    // ------------------------------------------------------------------ helpers

    function _start(address who) internal returns (uint256 id) {
        vm.prank(who);
        id = game.startRound(address(0));
    }

    function _nextBlock() internal {
        vm.roll(block.number + 1);
    }

    function _hit(address who, uint256 id) internal {
        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(id);
        vm.prank(who);
        game.submitAction(id, r.step, r.currentTarget);
    }

    function _wrong(uint256 id) internal view returns (uint8) {
        return (game.getRound(id).currentTarget + 1) % 9;
    }

    function _play(address who, uint256 hits) internal returns (uint256 id) {
        id = _start(who);
        for (uint256 i; i < hits; ++i) {
            _hit(who, id);
        }
        vm.warp(block.timestamp + 60);
        game.finalizeRound(id);
    }

    // ------------------------------------------------------------------ start

    function test_StartRound_CreatesState() public {
        uint256 id = _start(alice);
        assertEq(id, 1);
        BOTBlitz.Round memory r = game.getRound(id);
        assertEq(r.player, alice);
        assertEq(r.startTime, block.timestamp);
        assertEq(r.endTime, block.timestamp + 60);
        assertLt(r.currentTarget, 9);
        assertEq(r.score, 0);
        assertEq(r.step, 0);
        assertFalse(r.finalized);
        assertTrue(game.isLive(id));
        assertEq(game.getPlayer(alice).activeRoundId, id);
        assertEq(game.nextRoundId(), 2);
        assertEq(game.uniquePlayers(), 1);
    }

    function test_StartRound_SecondActiveRejected() public {
        uint256 id = _start(alice);
        vm.warp(block.timestamp + 59);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BOTBlitz.RoundStillActive.selector, id));
        game.startRound(address(0));
    }

    function test_StartRound_AutoFinalizesExpiredPrevious() public {
        uint256 first = _start(alice);
        _hit(alice, first);
        vm.warp(block.timestamp + 60);
        uint256 second = _start(alice);
        assertEq(second, 2);
        assertTrue(game.getRound(first).finalized);
        BOTBlitz.PlayerStats memory p = game.getPlayer(alice);
        assertEq(p.totalRounds, 1);
        assertEq(p.bestScore, 1);
        assertEq(p.activeRoundId, second);
        assertEq(game.uniquePlayers(), 1);
    }

    function test_StartRound_ForwardsFloatToSessionKey() public {
        vm.prank(alice);
        game.startRound{value: 0.1 ether}(aliceKey);
        assertEq(aliceKey.balance, 0.1 ether);
        assertEq(address(game).balance, 0);
    }

    function test_StartRound_FloatWithoutKeyRejected() public {
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.SessionKeyRequired.selector);
        game.startRound{value: 1}(address(0));
    }

    function test_StartRound_FloatTransferFailureReverts() public {
        RejectingReceiver bad = new RejectingReceiver();
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.FloatTransferFailed.selector);
        game.startRound{value: 1}(address(bad));
        assertEq(game.getPlayer(alice).activeRoundId, 0);
    }

    // ------------------------------------------------------------------ actions

    function test_ValidAction_IncrementsScoreAndAdvances() public {
        uint256 id = _start(alice);
        uint8 before = game.getRound(id).currentTarget;
        _hit(alice, id);
        BOTBlitz.Round memory r = game.getRound(id);
        assertEq(r.score, 1);
        assertEq(r.step, 1);
        assertTrue(r.currentTarget != before, "target must change");
        assertLt(r.currentTarget, 9);
    }

    function test_InvalidAction_DoesNotScore() public {
        uint256 id = _start(alice);
        uint8 target = game.getRound(id).currentTarget;
        _nextBlock();
        uint8 wrong = _wrong(id);
        vm.prank(alice);
        game.submitAction(id, 0, wrong);
        BOTBlitz.Round memory r = game.getRound(id);
        assertEq(r.score, 0);
        assertEq(r.step, 0);
        assertEq(r.misses, 1);
        assertEq(r.currentTarget, target, "miss keeps the target");
    }

    function test_InvalidChoiceOutOfRangeReverts() public {
        uint256 id = _start(alice);
        _nextBlock();
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.InvalidChoice.selector);
        game.submitAction(id, 0, 9);
    }

    function test_StepCannotBeScoredTwice() public {
        uint256 id = _start(alice);
        uint8 firstTarget = game.getRound(id).currentTarget;
        _hit(alice, id);
        _nextBlock();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BOTBlitz.StaleStep.selector, uint32(1)));
        game.submitAction(id, 0, firstTarget); // replay of step 0
        assertEq(game.getRound(id).score, 1);
    }

    function test_OneActionPerBlock() public {
        uint256 id = _start(alice);
        // Same block as start.
        uint8 t = game.getRound(id).currentTarget;
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.OneActionPerBlock.selector);
        game.submitAction(id, 0, t);

        _hit(alice, id);
        BOTBlitz.Round memory r = game.getRound(id);
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.OneActionPerBlock.selector);
        game.submitAction(id, r.step, r.currentTarget);
    }

    function test_ActionAfterExpiryRejected() public {
        uint256 id = _start(alice);
        vm.warp(block.timestamp + 61);
        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(id);
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.RoundExpired.selector);
        game.submitAction(id, r.step, r.currentTarget);
        assertFalse(game.isLive(id));
    }

    function test_ExpiryBoundary_LastSecondScores_ExactEndRejected() public {
        uint256 id = _start(alice);
        uint256 end = game.getRound(id).endTime;

        vm.warp(end - 1);
        _hit(alice, id);
        assertEq(game.getRound(id).score, 1);

        vm.warp(end);
        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(id);
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.RoundExpired.selector);
        game.submitAction(id, r.step, r.currentTarget);
    }

    function test_UnrelatedWalletCannotAct() public {
        uint256 id = _start(alice);
        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(id);
        vm.prank(mallory);
        vm.expectRevert(BOTBlitz.NotRoundOwner.selector);
        game.submitAction(id, r.step, r.currentTarget);
    }

    function test_SessionKeyCanActOnlyForItsRound() public {
        vm.prank(alice);
        uint256 id = game.startRound(aliceKey);
        _hit(aliceKey, id);
        assertEq(game.getRound(id).score, 1);

        uint256 bobId = _start(bob);
        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(bobId);
        vm.prank(aliceKey);
        vm.expectRevert(BOTBlitz.NotRoundOwner.selector);
        game.submitAction(bobId, r.step, r.currentTarget);
    }

    function test_UnknownRoundReverts() public {
        vm.expectRevert(BOTBlitz.UnknownRound.selector);
        game.submitAction(42, 0, 0);
        vm.expectRevert(BOTBlitz.UnknownRound.selector);
        game.finalizeRound(42);
    }

    // ------------------------------------------------------------------ finalize

    function test_FinalizeBeforeExpiryRejected() public {
        uint256 id = _start(alice);
        vm.warp(block.timestamp + 59);
        vm.expectRevert(BOTBlitz.RoundNotExpired.selector);
        game.finalizeRound(id);
    }

    function test_FinalizeIsDeterministicAndOnce() public {
        uint256 id = _start(alice);
        _hit(alice, id);
        _hit(alice, id);
        vm.warp(block.timestamp + 60);

        vm.prank(mallory); // anyone may settle
        game.finalizeRound(id);
        BOTBlitz.Round memory r = game.getRound(id);
        assertTrue(r.finalized);
        assertEq(r.score, 2, "finalization does not change score");

        vm.expectRevert(BOTBlitz.RoundAlreadyFinalized.selector);
        game.finalizeRound(id);

        _nextBlock();
        vm.prank(alice);
        vm.expectRevert(BOTBlitz.RoundAlreadyFinalized.selector);
        game.submitAction(id, r.step, r.currentTarget);
    }

    // ------------------------------------------------------------------ best score & stats

    function test_BestScoreUpdates() public {
        uint256 id = _play(alice, 3);
        BOTBlitz.PlayerStats memory p = game.getPlayer(alice);
        assertEq(p.bestScore, 3);
        assertEq(p.bestRoundId, id);
    }

    function test_LowerScoreDoesNotReplaceBest() public {
        uint256 bestId = _play(alice, 4);
        _play(alice, 2);
        BOTBlitz.PlayerStats memory p = game.getPlayer(alice);
        assertEq(p.bestScore, 4);
        assertEq(p.bestRoundId, bestId);
    }

    function test_EqualScoreDoesNotReplaceBest() public {
        uint256 bestId = _play(alice, 2);
        _play(alice, 2);
        assertEq(game.getPlayer(alice).bestRoundId, bestId);
    }

    function test_PlayerStatisticsAndHistory() public {
        uint256 a = _play(alice, 2);
        uint256 b = _play(alice, 5);
        uint256 c = _play(alice, 1);
        BOTBlitz.PlayerStats memory p = game.getPlayer(alice);
        assertEq(p.totalRounds, 3);
        assertEq(p.totalValidActions, 8);
        assertEq(p.roundsStarted, 3);
        assertEq(p.bestScore, 5);
        assertEq(p.bestRoundId, b);
        assertEq(p.activeRoundId, 0);

        uint256[] memory ids = game.getPlayerRounds(alice, 0, 10);
        assertEq(ids.length, 3);
        assertEq(ids[0], c);
        assertEq(ids[1], b);
        assertEq(ids[2], a);
        assertEq(game.getPlayerRounds(alice, 1, 1)[0], b);
        assertEq(game.getPlayerRounds(alice, 3, 10).length, 0);

        (uint256 started, uint256 completed, uint256 valid, uint256 actions, uint256 players) =
            game.globalStats();
        assertEq(started, 3);
        assertEq(completed, 3);
        assertEq(valid, 8);
        assertEq(actions, 8);
        assertEq(players, 1);
    }

    // ------------------------------------------------------------------ leaderboard

    function test_LeaderboardSortedAndTiesKeepEarlier() public {
        _play(alice, 3);
        _play(bob, 5);
        address carol = makeAddr("carol");
        _play(carol, 3);

        (address[] memory players, uint64[] memory scores,) = game.getLeaderboard();
        assertEq(players.length, 3);
        assertEq(players[0], bob);
        assertEq(players[1], alice, "earlier tie holder stays above");
        assertEq(players[2], carol);
        assertEq(scores[0], 5);

        _play(alice, 6); // moves up, no duplicate entry
        (players, scores,) = game.getLeaderboard();
        assertEq(players.length, 3);
        assertEq(players[0], alice);
        assertEq(scores[0], 6);
        assertEq(players[1], bob);
    }

    function test_LeaderboardBoundedAndEvictsLowest() public {
        for (uint256 i; i < 20; ++i) {
            _play(address(uint160(0x1000 + i)), i + 1); // scores 1..20
        }
        assertEq(game.boardSize(), 20);

        address low = address(uint160(0x5000));
        _play(low, 1); // not above the lowest (1): ignored
        (address[] memory players, uint64[] memory scores,) = game.getLeaderboard();
        assertEq(players.length, 20);
        assertEq(scores[19], 1);
        assertTrue(players[19] != low);

        address high = address(uint160(0x6000));
        _play(high, 10);
        (players, scores,) = game.getLeaderboard();
        assertEq(players.length, 20);
        assertEq(scores[0], 20);
        assertEq(scores[19], 2, "lowest entry evicted");
        for (uint256 i = 1; i < 20; ++i) {
            assertLe(scores[i], scores[i - 1]);
        }
    }

    function test_ZeroScoreRoundNotOnBoard() public {
        _play(alice, 0);
        assertEq(game.boardSize(), 0);
        assertEq(game.getPlayer(alice).totalRounds, 1);
    }

    // ------------------------------------------------------------------ events

    function test_EventsEmitted() public {
        vm.recordLogs();
        vm.prank(alice);
        uint256 id = game.startRound(aliceKey);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        assertEq(logs[0].topics[0], RoundStarted.selector);
        assertEq(logs[0].topics[1], bytes32(id));
        assertEq(logs[0].topics[2], bytes32(uint256(uint160(alice))));

        _nextBlock();
        BOTBlitz.Round memory r = game.getRound(id);
        vm.expectEmit(true, true, false, false);
        emit ActionSubmitted(id, alice, 0, r.currentTarget, true, 1, 0);
        vm.prank(aliceKey);
        game.submitAction(id, 0, r.currentTarget);

        _nextBlock();
        uint8 wrong = _wrong(id);
        uint8 still = game.getRound(id).currentTarget;
        vm.expectEmit(true, true, false, true);
        emit ActionSubmitted(id, alice, 1, wrong, false, 1, still);
        vm.prank(alice);
        game.submitAction(id, 1, wrong);

        vm.warp(block.timestamp + 60);
        vm.expectEmit(true, true, false, true);
        emit RoundFinalized(id, alice, 1, 1);
        vm.expectEmit(true, true, false, true);
        emit BestScoreUpdated(alice, id, 0, 1);
        game.finalizeRound(id);
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_ScoreEqualsCorrectChoices(uint8[16] memory picks) public {
        uint256 id = _start(alice);
        uint32 expected;
        for (uint256 i; i < picks.length; ++i) {
            _nextBlock();
            BOTBlitz.Round memory r = game.getRound(id);
            uint8 choice = picks[i] % 9;
            if (choice == r.currentTarget) expected++;
            vm.prank(alice);
            game.submitAction(id, r.step, choice);
        }
        assertEq(game.getRound(id).score, expected);
        assertEq(game.getRound(id).misses, uint32(picks.length) - expected);
    }
}
