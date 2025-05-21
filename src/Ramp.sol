// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from
    "../lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title On Ramp and Off Ramp Contract
 * @author Kaushtubh Agarwal
 * @notice This contract allows users to convert between crypto and fiat currency pairs (e.g., USD <-> USDC , EUR <-> EURC , INR <-> INR-Token etc.) which can be defined by the owner of the contract.
 * @dev This contract saves the KYC data of users on-chain in an encrypted format. This helps in maintaining -
 * 1. User Privacy
 * 2. Transparancy - since the data is on-chain, it can be audited by anyone.
 * 3. Legality - since only verified users can leverage the services of this contract, each transaction can be traced back to the user in case of any illegal activity.
 */
contract Ramp is Ownable {
    error Ramp__InvalidAddress();
    error Ramp__InvalidKYCData();
    error Ramp__UserAlreadyRegistered();
    error Ramp__UserNotRegistered();
    error Ramp__InvalidEnteredAmount();
    error Ramp__InvalidFiatString();
    error Ramp__FiatAlreadyExists();
    error Ramp__TokenAlreadyExists();
    error Ramp__FiatDoesNotExists();
    error Ramp__TokenDoesNotExists();
    error Ramp__FailedToFetchAmountOfTokensToTransfer();
    error Ramp__OrderAlreadyFullfilled();
    error Ramp__NotAValidOrderId();
    error Ramp__NotAllowed();
    error Ramp__NoOrdersYet();

    /**
     * @dev Struct to represent a user.
     * @param userAddress The address of the user.
     * @param kycData The KYC data of the user in encrypted format leveraging inco confidentiality layer
     * @param isVerified A boolean indicating whether the user is verified or not.
     */
    struct User {
        address userAddress;
        bytes kycData; //encrypted KYC data
        bool isVerified;
    }

    /**
     * @dev Struct to represent an order.
     * @param id The ID of the order.
     * @param user The user who owns the order.
     * @param amountOfFiatInUsd The amount of fiat in USD. (w/ 18 decimals)
     * @param amountOfToken The amount of token to buy/sell. (w/ decimals of the respective token)
     * @param fiat The fiat currency.
     * @param tokenAddress The address of the token.
     * @param isCryptoToFiat A boolean indicating whether the order is for crypto to fiat or not.
     * @param fulfilled A boolean indicating whether the order is fulfilled or not.
     * @param timestamp The timestamp when the order was created.
     */
    struct Order {
        uint256 id;
        User user;
        uint256 amountOfFiatInUsd; // Amount of fiat in usd
        uint256 amountOfToken; // Amount of token to buy/sell
        string fiat;
        address tokenAddress;
        bool isCryptoToFiat; // true if selling crypto, false if buying
        bool fulfilled;
        uint256 timestamp;
    }

    mapping(address => User) private users; // Mapping of user address to User struct
    address[] private requestsForRegistrations; // Array of user addresses that are pending for registration approval
    uint256 private orderIdCounter; // Counter for order IDs
    Order[] private orders; // Array of all orders indexed by orderId

    string[] private supportedFiatCurrencies; // Array of supported fiat currencies
    address[] private supportedTokens; // Array of supported tokens
    mapping(string => bool) private isSupportedFiat; // Mapping of fiat currency to boolean indicating if it is supported
    mapping(address => bool) private isSupportedToken; // Mapping of token address to boolean indicating if it is supported

    mapping(address => address) private tokenToPriceFeed; // Mapping of token address to price feed address

    /**
     * modifier to check if the fiat currency is supported.
     * @param fiat The fiat currency to check.
     */
    modifier isValidFiat(string memory fiat) {
        if (!isSupportedFiat[fiat]) revert Ramp__FiatDoesNotExists();
        _;
    }

    /**
     * modifier to check if the token is supported.
     * @param tokenAddress The token address to check.
     */
    modifier isValidToken(address tokenAddress) {
        if (!isSupportedToken[tokenAddress]) revert Ramp__TokenDoesNotExists();
        _;
    }

    /**
     * modifier to check if the user is verified.
     * @param userAddress The user address to check.
     * @dev This is to ensure that only verified users can create orders.
     */
    modifier onlyVerifiedUser(address userAddress) {
        if (!users[userAddress].isVerified) revert Ramp__UserNotRegistered();
        _;
    }

    /**
     * @dev Constructor to initialize the contract.
     * @param owner The address of the owner of the contract.
     */
    constructor(address owner) Ownable(owner) {
        orderIdCounter = 0;
    }

    /// @note Adding/removing supported fiat currencies and tokens

    /**
     * @dev Add a supported fiat currency.
     * @param fiat The fiat currency to add.
     */
    function addSupportedFiat(string memory fiat) public onlyOwner {
        if (bytes(fiat).length == 0) revert Ramp__InvalidFiatString();
        if (isSupportedFiat[fiat]) revert Ramp__FiatAlreadyExists();
        supportedFiatCurrencies.push(fiat);
        isSupportedFiat[fiat] = true;
    }

    /**
     * @dev Remove a supported fiat currency.
     * @param fiat The fiat currency to remove.
     */
    function removeSupportedFiat(string memory fiat) public onlyOwner {
        if (bytes(fiat).length == 0) revert Ramp__InvalidFiatString();
        if (!isSupportedFiat[fiat]) revert Ramp__FiatDoesNotExists();
        for (uint256 i = 0; i < supportedFiatCurrencies.length; i++) {
            if (keccak256(abi.encodePacked(supportedFiatCurrencies[i])) == keccak256(abi.encodePacked(fiat))) {
                supportedFiatCurrencies[i] = supportedFiatCurrencies[supportedFiatCurrencies.length - 1];
                supportedFiatCurrencies.pop();
                break;
            }
        }
        isSupportedFiat[fiat] = false;
    }

    /**
     * @dev Add a supported token.
     * @param tokenAddress The address of the token to add.
     * @param priceFeedAddress The address of the price feed for the token.
     */
    function addSupportedToken(address tokenAddress, address priceFeedAddress) public onlyOwner {
        if (tokenAddress == address(0)) revert Ramp__InvalidAddress();
        if (isSupportedToken[tokenAddress]) revert Ramp__TokenAlreadyExists();
        if (priceFeedAddress == address(0)) revert Ramp__InvalidAddress();
        supportedTokens.push(tokenAddress);
        isSupportedToken[tokenAddress] = true;
        tokenToPriceFeed[tokenAddress] = priceFeedAddress;
    }

    /**
     * @dev Remove a supported token.
     * @param tokenAddress The address of the token to remove.
     */
    function removeSupportedToken(address tokenAddress) public onlyOwner {
        if (tokenAddress == address(0)) revert Ramp__InvalidAddress();
        if (!isSupportedToken[tokenAddress]) revert Ramp__TokenDoesNotExists();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == tokenAddress) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        isSupportedToken[tokenAddress] = false;
        delete tokenToPriceFeed[tokenAddress];
    }

    /// @note User Registration Functions (Can only be approved/rejected/deleted by the owner)

    /**
     * @dev Register a new user.
     * @param userAddress The address of the user to register.
     * @param kycData The encrypted KYC data of the user, encrypted using the inco.js sdk.
     */
    function registerUser(address userAddress, bytes memory kycData) public {
        users[userAddress] = User(userAddress, kycData, false);
        requestsForRegistrations.push(userAddress);
    }

    /**
     * @dev Approve a user registration.
     * @param userAddress The address of the user to approve.
     */
    function approveUserRegistration(address userAddress) public onlyOwner {
        if (userAddress == address(0)) revert Ramp__InvalidAddress();
        if (users[userAddress].userAddress == address(0)) revert Ramp__InvalidAddress();
        if (users[userAddress].isVerified) revert Ramp__UserAlreadyRegistered();
        if (users[userAddress].kycData.length == 0) revert Ramp__InvalidKYCData();

        users[userAddress].isVerified = true;

        for (uint256 i = 0; i < requestsForRegistrations.length; i++) {
            if (requestsForRegistrations[i] == userAddress) {
                requestsForRegistrations[i] = requestsForRegistrations[requestsForRegistrations.length - 1];
                requestsForRegistrations.pop();
                break;
            }
        }
    }

    /**
     * @dev Reject a user registration.
     * @param userAddress The address of the user to reject.
     */
    function rejectUserRegistration(address userAddress) public onlyOwner {
        if (userAddress == address(0)) revert Ramp__InvalidAddress();
        if (users[userAddress].isVerified) revert Ramp__UserAlreadyRegistered(); // if user is already verified, we can't reject, try removing instead

        delete users[userAddress];

        for (uint256 i = 0; i < requestsForRegistrations.length; i++) {
            if (requestsForRegistrations[i] == userAddress) {
                requestsForRegistrations[i] = requestsForRegistrations[requestsForRegistrations.length - 1];
                requestsForRegistrations.pop();
                break;
            }
        }
    }

    /**
     * @dev deletes a already registered and verified user.
     * @param userAddress The address of the user to delete.
     */
    function deleteUser(address userAddress) public onlyOwner onlyVerifiedUser(userAddress) {
        delete users[userAddress];
    }

    /// @note Order Functions

    /**
     * @dev Create an order for fiat to crypto conversion.
     * @param userAddress The address of the user creating the order.
     * @param amountOfFiatInUsd The amount of fiat in USD. (w/ 18 decimals)
     * @param fiat The fiat currency.
     * @param tokenAddress The address of the token.
     */
    function createOrderFiatToCrypto(
        address userAddress,
        uint256 amountOfFiatInUsd,
        string memory fiat,
        address tokenAddress
    ) public onlyVerifiedUser(userAddress) isValidFiat(fiat) isValidToken(tokenAddress) {
        if (amountOfFiatInUsd == 0) revert Ramp__InvalidEnteredAmount();

        uint256 amountOfToken =
            getAmountOfToken(tokenAddress, amountOfFiatInUsd) / (10 ** (18 - IERC20(tokenAddress).decimals()));
        if (amountOfToken == 0) revert Ramp__FailedToFetchAmountOfTokensToTransfer();

        orders.push(
            Order(
                orderIdCounter,
                users[userAddress],
                amountOfFiatInUsd,
                amountOfToken,
                fiat,
                tokenAddress,
                false,
                false,
                block.timestamp
            )
        );

        unchecked {
            orderIdCounter++;
        }
    }

    /**
     * @dev Create an order for crypto to fiat conversion.
     * @param userAddress The address of the user creating the order.
     * @param amountOfToken The amount of tokens to sell. (w/ decimals of the respective token)
     * @param fiat The fiat currency.
     * @param tokenAddress The address of the token.
     */
    function createOrderCryptoToFiat(
        address userAddress,
        uint256 amountOfToken,
        string memory fiat,
        address tokenAddress
    ) public onlyVerifiedUser(userAddress) isValidToken(tokenAddress) {
        if (amountOfToken == 0) revert Ramp__InvalidEnteredAmount();

        uint256 amountOfFiatInUsd = getAmountOfFiatInUsd(tokenAddress, amountOfToken);
        if (amountOfFiatInUsd == 0) revert Ramp__FailedToFetchAmountOfTokensToTransfer();

        IERC20(tokenAddress).transferFrom(userAddress, address(this), amountOfToken);

        orders.push(
            Order(
                orderIdCounter,
                users[userAddress],
                amountOfFiatInUsd,
                amountOfToken,
                fiat,
                tokenAddress,
                true,
                false,
                block.timestamp
            )
        );

        unchecked {
            orderIdCounter++;
        }
    }

    /**
     * @dev Get the amount of fiat in USD for a given amount of tokens.
     * @param tokenAddress The address of the token.
     * @param amountOfToken The amount of tokens to convert.
     * @return amountOfFiatInUsd The amount of fiat in USD. (w/ 18 decimals)
     */
    function getAmountOfFiatInUsd(address tokenAddress, uint256 amountOfToken)
        public
        view
        isValidToken(tokenAddress)
        returns (uint256 amountOfFiatInUsd)
    {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(tokenToPriceFeed[tokenAddress]);
        (, int256 price,,,) = priceFeed.latestRoundData();
        uint256 tokenPrice = uint256(price);
        uint8 priceFeedDecimals = priceFeed.decimals();
        uint8 tokenDecimals = IERC20(tokenAddress).decimals();
        amountOfFiatInUsd =
            (amountOfToken * 10 ** (18 - tokenDecimals) * tokenPrice * 10 ** (18 - priceFeedDecimals)) / 1e18;
    }

    /**
     * @dev Get the amount of tokens for a given amount of fiat in USD.
     * @param tokenAddress The address of the token.
     * @param amountOfFiatInUsd The amount of fiat in USD. (w/ 18 decimals)
     */
    function getAmountOfToken(address tokenAddress, uint256 amountOfFiatInUsd)
        public
        view
        isValidToken(tokenAddress)
        returns (uint256 amountOfToken)
    {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(tokenToPriceFeed[tokenAddress]);
        (, int256 price,,,) = priceFeed.latestRoundData();
        uint256 tokenPrice = uint256(price);
        uint8 priceFeedDecimals = priceFeed.decimals();
        amountOfToken = (amountOfFiatInUsd * 1e18) / (tokenPrice * 10 ** (18 - priceFeedDecimals));
    }

    /**
     * @dev Owner fullfill an order
     * @dev if fiat to crypto order, then this function is called after the user has sent the fiat to the respective bank account and interfaces gives the confirmation and crypto is transferred to the user.
     * @dev if crypto to fiat order, then the user has already sent the crypto to the contract and this function is called after the fiat is transferred to the user's bank account.
     * @param orderId The ID of the order to fulfill.
     */
    function fullFillOrder(uint256 orderId) public onlyOwner {
        if (orderId >= orderIdCounter) revert Ramp__NotAValidOrderId();
        if (orders[orderId].fulfilled) revert Ramp__OrderAlreadyFullfilled();

        orders[orderId].fulfilled = true;

        if (!orders[orderId].isCryptoToFiat) {
            IERC20(orders[orderId].tokenAddress).transfer(
                orders[orderId].user.userAddress, orders[orderId].amountOfToken
            );
        }
    }

    /**
     * @dev Cancel an order.
     * @dev can only be called by the user who owns the order or the owner of the contract.
     * @param orderId The ID of the order to cancel.
     */
    function cancelOrder(uint256 orderId) public {
        if (msg.sender != orders[orderId].user.userAddress && msg.sender != owner()) revert Ramp__NotAllowed();
        if (orderId >= orderIdCounter) revert Ramp__NotAValidOrderId();
        if (orders[orderId].fulfilled) revert Ramp__OrderAlreadyFullfilled();

        if (orders[orderId].isCryptoToFiat) {
            IERC20(orders[orderId].tokenAddress).transfer(
                orders[orderId].user.userAddress, orders[orderId].amountOfToken
            );
        }

        for (uint256 i = orderId; i < orders.length - 1; i++) {
            orders[i] = orders[i + 1];
        }
        orders.pop();

        orderIdCounter--;
    }

    /* Getter Functions */

    function getUser(address userAddress) public view returns (User memory) {
        return users[userAddress];
    }

    function getPendingRegistrations() public view returns (address[] memory) {
        return requestsForRegistrations;
    }

    function getOrders() public view returns (Order[] memory) {
        return orders;
    }

    function getOrderById(uint256 orderId) public view returns (Order memory) {
        if (orderId >= orderIdCounter) revert Ramp__NotAValidOrderId();
        return orders[orderId];
    }

    function getSupportedFiatCurrencies() public view returns (string[] memory) {
        return supportedFiatCurrencies;
    }

    function getSupportedTokens() public view returns (address[] memory) {
        return supportedTokens;
    }

    function getTokenPriceFeed(address tokenAddress) public view isValidToken(tokenAddress) returns (address) {
        return tokenToPriceFeed[tokenAddress];
    }

    function getLatestOrderId() public view returns (uint256) {
        if (orderIdCounter == 0) revert Ramp__NoOrdersYet();
        return orderIdCounter - 1;
    }
}
