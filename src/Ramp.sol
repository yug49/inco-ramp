// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "./interfaces/IERC20.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title On Ramp and Off Ramp Contract
 * @author Kaushtubh Agarwal
 * @notice This contract allows users to convert between crypto and fiat currency pairs (e.g., USD <-> USDC , EUR <-> EURC , INR <-> INR-Token etc.) which can be defined by the owner of the contract.
 * @dev This contract saves the KYC data of users on-chain in an encrypted format. This helps in maintaining -
 * 1. User Privacy
 * 2. Transparancy - since the data is on-chain, it can be audited by anyone.
 * 3. Legality - since only verified users can leverage the services of this contract, each transaction can be traced back to the user in case of any illegal activity.
 */
contract Ramp is Ownable{
    error Ramp__InvalidAddress();
    error Ramp__InvalidKYCData();
    error Ramp__UserAlreadyRegistered();
    error Ramp__UserNotRegistered();

    struct User {
        address userAddress;
        bytes kycData; //encrypted KYC data
        bool isVerified;
    }

    /// @note decimals used for fiat currency in the project is 18
    struct Fiat{
        string symbol;
        address tokenAddress;
    }

    struct Order {
        uint256 id;
        User user;
        uint256 amount; // Amount of crypto/fiat to sell
        Fiat fiat;
        bool isCryptoToFiat; // true if selling crypto, false if buying
        bool fulfilled;
        uint256 timestamp;
    }

    mapping(address => User) private users;
    address[] private requestsForRegistrations;
    uint256 private orderIdCounter;
    Order[] private orders; // Array of all orders indexed by orderId
    mapping(address => Fiat) private tokenToFiat; // Mapping of token address to Fiat struct

    constructor() Ownable(msg.sender) {
        orderIdCounter = 0;
    }

    /* User Registration Functions (Can only be approved/rejected/deleted by the owner) */

    function registerUser(address userAddress, bytes memory kycData) public {
        users[userAddress] = User(userAddress, kycData, false);
        requestsForRegistrations.push(userAddress);
    }

    function approveUserRegistration(address userAddress) public onlyOwner {
        if(userAddress == address(0)) revert Ramp__InvalidAddress();
        if(users[userAddress].userAddress == address(0)) revert Ramp__InvalidAddress(); 
        if(users[userAddress].isVerified) revert Ramp__UserAlreadyRegistered();
        if(users[userAddress].kycData.length == 0) revert Ramp__InvalidKYCData();

        users[userAddress].isVerified = true;

        for (uint256 i = 0; i < requestsForRegistrations.length; i++) {
            if (requestsForRegistrations[i] == userAddress) {
                requestsForRegistrations[i] = requestsForRegistrations[requestsForRegistrations.length - 1];
                requestsForRegistrations.pop();
                break;
            }
        }
    }

    function rejectUserRegistration(address userAddress) public onlyOwner {
        if(userAddress == address(0)) revert Ramp__InvalidAddress();
        if(users[userAddress].isVerified) revert Ramp__UserAlreadyRegistered(); // if user is already verified, we can't reject, try removing instead

        delete users[userAddress];

        for (uint256 i = 0; i < requestsForRegistrations.length; i++) {
            if (requestsForRegistrations[i] == userAddress) {
                requestsForRegistrations[i] = requestsForRegistrations[requestsForRegistrations.length - 1];
                requestsForRegistrations.pop();
                break;
            }
        }
    }

    function deleteUser(address userAddress) public onlyOwner {
        if(userAddress == address(0)) revert Ramp__InvalidAddress();
        if(!users[userAddress].isVerified) revert Ramp__UserNotRegistered();
        delete users[userAddress];
    }


    /* Getter Functions */

    function getUser(address userAddress) public view returns (User memory) {
        return users[userAddress];
    }

    function getPendingRegistrations() public view returns (address[] memory) {
        return requestsForRegistrations;
    }



}