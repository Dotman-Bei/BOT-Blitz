// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BOTBlitz} from "../src/BOTBlitz.sol";

/// forge script script/Deploy.s.sol --rpc-url bot_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (BOTBlitz game) {
        vm.startBroadcast();
        game = new BOTBlitz();
        vm.stopBroadcast();
        console2.log("BOTBlitz deployed at", address(game));
        console2.log("chain id", block.chainid);
        console2.log("deploy block", block.number);
    }
}
