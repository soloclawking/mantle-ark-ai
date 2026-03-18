const express = require('express');
const router = express.Router();

// Universal chain scanner — detects chain type from RPC and fetches balances

// Try EVM RPC call
async function tryEVM(rpc, address) {
  const [chainIdRes, balanceRes] = await Promise.all([
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 })
    }),
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 2 })
    })
  ]);

  const chainIdData = await chainIdRes.json();
  const balanceData = await balanceRes.json();

  if (chainIdData.result && balanceData.result) {
    const chainId = parseInt(chainIdData.result, 16);
    const balanceWei = BigInt(balanceData.result);
    const balance = Number(balanceWei) / 1e18;

    // Try to get token balances via eth_call (ERC-20 balanceOf won't work without contract list)
    // We'll get transaction count as activity indicator
    const txCountRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [address, 'latest'], id: 3 })
    });
    const txCountData = await txCountRes.json();
    const txCount = txCountData.result ? parseInt(txCountData.result, 16) : 0;

    // Get current gas price
    const gasPriceRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 4 })
    });
    const gasPriceData = await gasPriceRes.json();
    const gasPrice = gasPriceData.result ? Number(BigInt(gasPriceData.result)) / 1e9 : 0;

    // Get latest block for network activity
    const blockRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 5 })
    });
    const blockData = await blockRes.json();
    const blockNumber = blockData.result ? parseInt(blockData.result, 16) : 0;

    return {
      type: 'evm',
      chainId,
      chainName: getEVMChainName(chainId),
      nativeToken: getEVMNativeToken(chainId),
      balance,
      balanceRaw: balanceData.result,
      txCount,
      gasPrice: gasPrice.toFixed(4),
      blockNumber,
      address
    };
  }

  throw new Error('Not EVM');
}

// Try Solana RPC
async function trySolana(rpc, address) {
  // getBalance
  const balRes = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] })
  });
  const balData = await balRes.json();

  if (balData.result && balData.result.value !== undefined) {
    const balanceLamports = balData.result.value;
    const balance = balanceLamports / 1e9;

    // Get token accounts
    let tokens = [];
    try {
      const tokenRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'getTokenAccountsByOwner',
          params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.result && tokenData.result.value) {
        tokens = tokenData.result.value.map(acc => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint,
            amount: Number(info.tokenAmount.uiAmount || 0),
            decimals: info.tokenAmount.decimals,
            symbol: info.mint.slice(0, 6) + '...'
          };
        }).filter(t => t.amount > 0);
      }
    } catch (e) { /* token fetch optional */ }

    // Get recent transactions count
    let txCount = 0;
    try {
      const sigRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'getSignaturesForAddress', params: [address, { limit: 100 }] })
      });
      const sigData = await sigRes.json();
      txCount = sigData.result ? sigData.result.length : 0;
    } catch (e) { /* optional */ }

    // Get slot for network info
    let slot = 0;
    try {
      const slotRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'getSlot', params: [] })
      });
      const slotData = await slotRes.json();
      slot = slotData.result || 0;
    } catch (e) { /* optional */ }

    return {
      type: 'solana',
      chainId: 'solana-mainnet',
      chainName: 'Solana',
      nativeToken: { symbol: 'SOL', decimals: 9 },
      balance,
      tokens,
      txCount,
      slot,
      address
    };
  }

  throw new Error('Not Solana');
}

// Try Sui RPC
async function trySui(rpc, address) {
  const balRes = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'suix_getBalance', params: [address] })
  });
  const balData = await balRes.json();

  if (balData.result && balData.result.totalBalance !== undefined) {
    const balance = Number(balData.result.totalBalance) / 1e9;

    // Get all coin balances
    let tokens = [];
    try {
      const allBalRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'suix_getAllBalances', params: [address] })
      });
      const allBalData = await allBalRes.json();
      if (allBalData.result) {
        tokens = allBalData.result
          .filter(b => b.coinType !== '0x2::sui::SUI')
          .map(b => ({
            type: b.coinType,
            amount: Number(b.totalBalance) / 1e9,
            symbol: b.coinType.split('::').pop()
          }))
          .filter(t => t.amount > 0);
      }
    } catch (e) { /* optional */ }

    // Get transaction count
    let txCount = 0;
    try {
      const txRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 3, method: 'suix_queryTransactionBlocks',
          params: [{ filter: { FromAddress: address } }, null, 100, true]
        })
      });
      const txData = await txRes.json();
      txCount = txData.result && txData.result.data ? txData.result.data.length : 0;
    } catch (e) { /* optional */ }

    return {
      type: 'sui',
      chainId: 'sui-mainnet',
      chainName: 'Sui',
      nativeToken: { symbol: 'SUI', decimals: 9 },
      balance,
      tokens,
      txCount,
      address
    };
  }

  throw new Error('Not Sui');
}

// Try Aptos RPC (REST-based, not JSON-RPC)
async function tryAptos(rpc, address) {
  // Aptos uses REST API, not JSON-RPC
  const baseUrl = rpc.replace(/\/$/, '');

  const accRes = await fetch(`${baseUrl}/v1/accounts/${address}/resources`);
  if (!accRes.ok) throw new Error('Not Aptos');

  const resources = await accRes.json();
  let balance = 0;
  let tokens = [];

  for (const r of resources) {
    if (r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>') {
      balance = Number(r.data.coin.value) / 1e8;
    } else if (r.type.startsWith('0x1::coin::CoinStore<') && r.data && r.data.coin) {
      const coinType = r.type.match(/<(.+)>/)?.[1] || r.type;
      tokens.push({
        type: coinType,
        amount: Number(r.data.coin.value) / 1e8,
        symbol: coinType.split('::').pop()
      });
    }
  }

  // Get transaction count
  let txCount = 0;
  try {
    const txRes = await fetch(`${baseUrl}/v1/accounts/${address}/transactions?limit=100`);
    if (txRes.ok) {
      const txData = await txRes.json();
      txCount = txData.length;
    }
  } catch (e) { /* optional */ }

  return {
    type: 'aptos',
    chainId: 'aptos-mainnet',
    chainName: 'Aptos',
    nativeToken: { symbol: 'APT', decimals: 8 },
    balance,
    tokens: tokens.filter(t => t.amount > 0),
    txCount,
    address
  };
}

// Known EVM chain names
function getEVMChainName(chainId) {
  const chains = {
    1: 'Ethereum', 5000: 'Mantle', 5003: 'Mantle Sepolia',
    137: 'Polygon', 80001: 'Polygon Mumbai',
    42161: 'Arbitrum One', 421613: 'Arbitrum Goerli',
    10: 'Optimism', 420: 'Optimism Goerli',
    8453: 'Base', 84531: 'Base Goerli',
    43114: 'Avalanche', 43113: 'Avalanche Fuji',
    56: 'BNB Chain', 97: 'BNB Testnet',
    250: 'Fantom', 25: 'Cronos',
    100: 'Gnosis', 324: 'zkSync Era',
    1101: 'Polygon zkEVM', 59144: 'Linea',
    534352: 'Scroll', 7777777: 'Zora',
    81457: 'Blast', 169: 'Manta Pacific',
  };
  return chains[chainId] || `EVM Chain #${chainId}`;
}

// Known EVM native tokens
function getEVMNativeToken(chainId) {
  const tokens = {
    1: { symbol: 'ETH', decimals: 18 },
    5000: { symbol: 'MNT', decimals: 18 },
    5003: { symbol: 'MNT', decimals: 18 },
    137: { symbol: 'MATIC', decimals: 18 },
    80001: { symbol: 'MATIC', decimals: 18 },
    42161: { symbol: 'ETH', decimals: 18 },
    10: { symbol: 'ETH', decimals: 18 },
    8453: { symbol: 'ETH', decimals: 18 },
    43114: { symbol: 'AVAX', decimals: 18 },
    56: { symbol: 'BNB', decimals: 18 },
    250: { symbol: 'FTM', decimals: 18 },
    25: { symbol: 'CRO', decimals: 18 },
    100: { symbol: 'xDAI', decimals: 18 },
    324: { symbol: 'ETH', decimals: 18 },
    59144: { symbol: 'ETH', decimals: 18 },
    534352: { symbol: 'ETH', decimals: 18 },
    81457: { symbol: 'ETH', decimals: 18 },
  };
  return tokens[chainId] || { symbol: 'ETH', decimals: 18 };
}

// Main scan endpoint — auto-detect chain type
router.post('/', async (req, res) => {
  try {
    const { rpc, address } = req.body;

    if (!rpc || !address) {
      return res.status(400).json({ success: false, error: 'RPC URL and wallet address are required' });
    }

    let result = null;
    let errors = [];

    // Try EVM first (most common)
    try {
      result = await tryEVM(rpc, address);
    } catch (e) {
      errors.push('EVM: ' + e.message);
    }

    // Try Solana
    if (!result) {
      try {
        result = await trySolana(rpc, address);
      } catch (e) {
        errors.push('Solana: ' + e.message);
      }
    }

    // Try Sui
    if (!result) {
      try {
        result = await trySui(rpc, address);
      } catch (e) {
        errors.push('Sui: ' + e.message);
      }
    }

    // Try Aptos
    if (!result) {
      try {
        result = await tryAptos(rpc, address);
      } catch (e) {
        errors.push('Aptos: ' + e.message);
      }
    }

    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Could not detect chain type. Supported: EVM, Solana, Sui, Aptos',
        details: errors
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Scan error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scan Mantle specifically (with explorer API for richer data)
router.post('/mantle', async (req, res) => {
  try {
    const { address, network = 'mainnet' } = req.body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, error: 'Invalid wallet address' });
    }

    const explorerApi = network === 'mainnet'
      ? 'https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan/api'
      : 'https://api.routescan.io/v2/network/testnet/evm/5003/etherscan/api';

    const [txRes, tokenRes, balRes] = await Promise.all([
      fetch(`${explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=100`).then(r => r.json()),
      fetch(`${explorerApi}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=100`).then(r => r.json()),
      fetch(`${explorerApi}?module=account&action=balance&address=${address}`).then(r => r.json())
    ]);

    const balance = balRes.status === '1' ? Number(BigInt(balRes.result)) / 1e18 : 0;
    const transactions = txRes.status === '1' ? txRes.result : [];
    const tokenTransfers = tokenRes.status === '1' ? tokenRes.result : [];

    // Unique tokens held
    const tokensHeld = {};
    tokenTransfers.forEach(tx => {
      const sym = tx.tokenSymbol || 'Unknown';
      if (!tokensHeld[sym]) {
        tokensHeld[sym] = { symbol: sym, name: tx.tokenName, contract: tx.contractAddress, transfers: 0 };
      }
      tokensHeld[sym].transfers++;
    });

    // Gas spent
    let totalGasWei = BigInt(0);
    const addr = address.toLowerCase();
    transactions.forEach(tx => {
      if (tx.from.toLowerCase() === addr) {
        totalGasWei += BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
      }
    });

    res.json({
      success: true,
      data: {
        type: 'evm',
        chainId: network === 'mainnet' ? 5000 : 5003,
        chainName: network === 'mainnet' ? 'Mantle' : 'Mantle Sepolia',
        nativeToken: { symbol: 'MNT', decimals: 18 },
        balance,
        txCount: transactions.length,
        tokenTransfers: tokenTransfers.length,
        tokensHeld: Object.values(tokensHeld),
        gasSpent: (Number(totalGasWei) / 1e18).toFixed(6),
        firstTx: transactions.length > 0 ? transactions[transactions.length - 1] : null,
        lastTx: transactions.length > 0 ? transactions[0] : null,
        address
      }
    });
  } catch (error) {
    console.error('Mantle scan error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
