// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {Ramp} from "../src/Ramp.sol";

contract DeployRamp is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        // Deploy Ramp contract
        Ramp ramp = new Ramp(vm.addr(deployerKey));
        console.log("Ramp contract deployed at:", address(ramp));
        vm.stopBroadcast();
    }
}