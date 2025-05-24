interface ContractsConfig {
    [chainId: number]: {
        ramp: string
    }
}

export const chainsToRamp: ContractsConfig = {
    84532: {
        ramp: "0xF7A614Ed71C46A0b86d5B5819D075DB87D3D1798"
    }
}

export const erc20Abi = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "owner", type: "address" },
            { indexed: true, internalType: "address", name: "spender", type: "address" },
            { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "authorizer", type: "address" },
            { indexed: true, internalType: "bytes32", name: "nonce", type: "bytes32" },
        ],
        name: "AuthorizationCanceled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "authorizer", type: "address" },
            { indexed: true, internalType: "bytes32", name: "nonce", type: "bytes32" },
        ],
        name: "AuthorizationUsed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "address", name: "_account", type: "address" }],
        name: "Blacklisted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "newBlacklister", type: "address" },
        ],
        name: "BlacklisterChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "burner", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "Burn",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "newMasterMinter", type: "address" },
        ],
        name: "MasterMinterChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "minter", type: "address" },
            { indexed: true, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "Mint",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "minter", type: "address" },
            {
                indexed: false,
                internalType: "uint256",
                name: "minterAllowedAmount",
                type: "uint256",
            },
        ],
        name: "MinterConfigured",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "address", name: "oldMinter", type: "address" }],
        name: "MinterRemoved",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "address", name: "previousOwner", type: "address" },
            { indexed: false, internalType: "address", name: "newOwner", type: "address" },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    { anonymous: false, inputs: [], name: "Pause", type: "event" },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "address", name: "newAddress", type: "address" }],
        name: "PauserChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "address", name: "newRescuer", type: "address" }],
        name: "RescuerChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "from", type: "address" },
            { indexed: true, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "address", name: "_account", type: "address" }],
        name: "UnBlacklisted",
        type: "event",
    },
    { anonymous: false, inputs: [], name: "Unpause", type: "event" },
    {
        inputs: [],
        name: "CANCEL_AUTHORIZATION_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "PERMIT_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "RECEIVE_WITH_AUTHORIZATION_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "TRANSFER_WITH_AUTHORIZATION_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "authorizer", type: "address" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
        ],
        name: "authorizationState",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_account", type: "address" }],
        name: "blacklist",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "blacklister",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
        name: "burn",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "authorizer", type: "address" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "uint8", name: "v", type: "uint8" },
            { internalType: "bytes32", name: "r", type: "bytes32" },
            { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "cancelAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "authorizer", type: "address" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "cancelAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "minter", type: "address" },
            { internalType: "uint256", name: "minterAllowedAmount", type: "uint256" },
        ],
        name: "configureMinter",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "currency",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "decrement", type: "uint256" },
        ],
        name: "decreaseAllowance",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "increment", type: "uint256" },
        ],
        name: "increaseAllowance",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "string", name: "tokenName", type: "string" },
            { internalType: "string", name: "tokenSymbol", type: "string" },
            { internalType: "string", name: "tokenCurrency", type: "string" },
            { internalType: "uint8", name: "tokenDecimals", type: "uint8" },
            { internalType: "address", name: "newMasterMinter", type: "address" },
            { internalType: "address", name: "newPauser", type: "address" },
            { internalType: "address", name: "newBlacklister", type: "address" },
            { internalType: "address", name: "newOwner", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "string", name: "newName", type: "string" }],
        name: "initializeV2",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "lostAndFound", type: "address" }],
        name: "initializeV2_1",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address[]", name: "accountsToBlacklist", type: "address[]" },
            { internalType: "string", name: "newSymbol", type: "string" },
        ],
        name: "initializeV2_2",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_account", type: "address" }],
        name: "isBlacklisted",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "isMinter",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "masterMinter",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "_to", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
        ],
        name: "mint",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "minter", type: "address" }],
        name: "minterAllowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "owner", type: "address" }],
        name: "nonces",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
    {
        inputs: [],
        name: "paused",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "pauser",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
            { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
            { internalType: "uint8", name: "v", type: "uint8" },
            { internalType: "bytes32", name: "r", type: "bytes32" },
            { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "validAfter", type: "uint256" },
            { internalType: "uint256", name: "validBefore", type: "uint256" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "receiveWithAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "validAfter", type: "uint256" },
            { internalType: "uint256", name: "validBefore", type: "uint256" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "uint8", name: "v", type: "uint8" },
            { internalType: "bytes32", name: "r", type: "bytes32" },
            { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "receiveWithAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "minter", type: "address" }],
        name: "removeMinter",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "contract IERC20", name: "tokenContract", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "rescueERC20",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "rescuer",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "validAfter", type: "uint256" },
            { internalType: "uint256", name: "validBefore", type: "uint256" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "transferWithAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
            { internalType: "uint256", name: "validAfter", type: "uint256" },
            { internalType: "uint256", name: "validBefore", type: "uint256" },
            { internalType: "bytes32", name: "nonce", type: "bytes32" },
            { internalType: "uint8", name: "v", type: "uint8" },
            { internalType: "bytes32", name: "r", type: "bytes32" },
            { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "transferWithAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_account", type: "address" }],
        name: "unBlacklist",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
    {
        inputs: [{ internalType: "address", name: "_newBlacklister", type: "address" }],
        name: "updateBlacklister",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_newMasterMinter", type: "address" }],
        name: "updateMasterMinter",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_newPauser", type: "address" }],
        name: "updatePauser",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "newRescuer", type: "address" }],
        name: "updateRescuer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "version",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "pure",
        type: "function",
    },
]

export const rampAbi = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "addSupportedFiat",
            "inputs": [
                { "name": "fiat", "type": "string", "internalType": "string" }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "addSupportedToken",
            "inputs": [
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "priceFeedAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "approveUserRegistration",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "cancelOrder",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "createOrderCryptoToFiat",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountOfToken",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                { "name": "fiat", "type": "string", "internalType": "string" },
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "createOrderFiatToCrypto",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountOfFiatInUsd",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                { "name": "fiat", "type": "string", "internalType": "string" },
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "deleteUser",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "fullFillOrder",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "getAmountOfFiatInUsd",
            "inputs": [
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountOfToken",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "amountOfFiatInUsd",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getAmountOfToken",
            "inputs": [
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amountOfFiatInUsd",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "amountOfToken",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getApprovedUser",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct Ramp.User",
                    "components": [
                        {
                            "name": "userAddress",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "kycData",
                            "type": "bytes32",
                            "internalType": "euint256"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getLatestOrderId",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getListOfApprovedUsers",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address[]", "internalType": "address[]" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getListOfPendingRegistrations",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address[]", "internalType": "address[]" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getOrderById",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct Ramp.Order",
                    "components": [
                        {
                            "name": "id",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "user",
                            "type": "tuple",
                            "internalType": "struct Ramp.User",
                            "components": [
                                {
                                    "name": "userAddress",
                                    "type": "address",
                                    "internalType": "address"
                                },
                                {
                                    "name": "kycData",
                                    "type": "bytes32",
                                    "internalType": "euint256"
                                }
                            ]
                        },
                        {
                            "name": "amountOfFiatInUsd",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "amountOfToken",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "fiat",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "tokenAddress",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "isCryptoToFiat",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "fulfilled",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "timestamp",
                            "type": "uint256",
                            "internalType": "uint256"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getOrders",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple[]",
                    "internalType": "struct Ramp.Order[]",
                    "components": [
                        {
                            "name": "id",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "user",
                            "type": "tuple",
                            "internalType": "struct Ramp.User",
                            "components": [
                                {
                                    "name": "userAddress",
                                    "type": "address",
                                    "internalType": "address"
                                },
                                {
                                    "name": "kycData",
                                    "type": "bytes32",
                                    "internalType": "euint256"
                                }
                            ]
                        },
                        {
                            "name": "amountOfFiatInUsd",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "amountOfToken",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "fiat",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "tokenAddress",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "isCryptoToFiat",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "fulfilled",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "timestamp",
                            "type": "uint256",
                            "internalType": "uint256"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPendingUser",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct Ramp.User",
                    "components": [
                        {
                            "name": "userAddress",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "kycData",
                            "type": "bytes32",
                            "internalType": "euint256"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getSupportedFiatCurrencies",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "string[]", "internalType": "string[]" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getSupportedTokens",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address[]", "internalType": "address[]" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getTokenPriceFeed",
            "inputs": [
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "registerUser",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                },
                { "name": "kycData", "type": "bytes", "internalType": "bytes" }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "rejectUserRegistration",
            "inputs": [
                {
                    "name": "userAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "removeSupportedFiat",
            "inputs": [
                { "name": "fiat", "type": "string", "internalType": "string" }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "removeSupportedToken",
            "inputs": [
                {
                    "name": "tokenAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "Ramp__FailedToFetchAmountOfTokensToTransfer",
            "inputs": []
        },
        { "type": "error", "name": "Ramp__FiatAlreadyExists", "inputs": [] },
        { "type": "error", "name": "Ramp__FiatDoesNotExists", "inputs": [] },
        { "type": "error", "name": "Ramp__InvalidAddress", "inputs": [] },
        { "type": "error", "name": "Ramp__InvalidEnteredAmount", "inputs": [] },
        { "type": "error", "name": "Ramp__InvalidFiatString", "inputs": [] },
        { "type": "error", "name": "Ramp__InvalidKYCData", "inputs": [] },
        { "type": "error", "name": "Ramp__NoOrdersYet", "inputs": [] },
        { "type": "error", "name": "Ramp__NotAValidOrderId", "inputs": [] },
        { "type": "error", "name": "Ramp__NotAllowed", "inputs": [] },
        {
            "type": "error",
            "name": "Ramp__OrderAlreadyFullfilled",
            "inputs": []
        },
        { "type": "error", "name": "Ramp__TokenAlreadyExists", "inputs": [] },
        { "type": "error", "name": "Ramp__TokenDoesNotExists", "inputs": [] },
        {
            "type": "error",
            "name": "Ramp__UserAlreadyRegistered",
            "inputs": []
        },
        { "type": "error", "name": "Ramp__UserNotRegistered", "inputs": [] },
        {
            "type": "error",
            "name": "Ramp__UserRegistrationRequestNotFound",
            "inputs": []
        },
        {
            "type": "error",
            "name": "Ramp__UserRegistrationRequestesStillPending",
            "inputs": []
        }
    ]