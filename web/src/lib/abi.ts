// Generated from contracts/out/BOTBlitz.sol/BOTBlitz.json - regenerate after contract changes.
export const blitzAbi = [
  {
    "type": "function",
    "name": "GRID_CELLS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LEADERBOARD_SIZE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_HISTORY_PAGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ROUND_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "boardSize",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "finalizeRound",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getLeaderboard",
    "inputs": [],
    "outputs": [
      {
        "name": "players",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "scores",
        "type": "uint64[]",
        "internalType": "uint64[]"
      },
      {
        "name": "roundIds",
        "type": "uint64[]",
        "internalType": "uint64[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPlayer",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct BOTBlitz.PlayerStats",
        "components": [
          {
            "name": "bestScore",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "bestRoundId",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalRounds",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalValidActions",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "activeRoundId",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "roundsStarted",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPlayerRounds",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRound",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct BOTBlitz.Round",
        "components": [
          {
            "name": "player",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTime",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTime",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "currentTarget",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "finalized",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "sessionKey",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "score",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "step",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "misses",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "lastActionBlock",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "seed",
            "type": "uint192",
            "internalType": "uint192"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "globalStats",
    "inputs": [],
    "outputs": [
      {
        "name": "roundsStarted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "roundsCompleted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "validActions",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "actions",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "players",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isLive",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextRoundId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "startRound",
    "inputs": [
      {
        "name": "sessionKey",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "submitAction",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "step",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "choice",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalActions",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalRoundsCompleted",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalValidActions",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "uniquePlayers",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ActionSubmitted",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "step",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "choice",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "correct",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "score",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "nextTarget",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BestScoreUpdated",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "previousBest",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "newBest",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundFinalized",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "score",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "misses",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundStarted",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sessionKey",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "endTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "firstTarget",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "FloatTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidChoice",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRoundOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OneActionPerBlock",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoundAlreadyFinalized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoundExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoundNotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RoundStillActive",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SessionKeyRequired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StaleStep",
    "inputs": [
      {
        "name": "expected",
        "type": "uint32",
        "internalType": "uint32"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownRound",
    "inputs": []
  }
] as const
