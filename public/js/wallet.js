// ============================================
// Mantle Ark AI — Wallet Connection
// ============================================

const MANTLE_NETWORKS = {
  mainnet: {
    chainId: '0x1388',
    chainIdDec: 5000,
    chainName: 'Mantle',
    rpcUrls: ['https://rpc.mantle.xyz'],
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    blockExplorerUrls: ['https://mantlescan.xyz'],
  },
  sepolia: {
    chainId: '0x138B',
    chainIdDec: 5003,
    chainName: 'Mantle Sepolia',
    rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.mantlescan.xyz'],
  },
};

let walletState = {
  provider: null,
  signer: null,
  address: null,
  chainId: null,
};

async function connectWallet() {
  if (!window.ethereum) {
    showToast('Please install MetaMask to connect', 'error');
    return;
  }

  try {
    showLoading('Connecting wallet...');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    walletState.provider = provider;
    walletState.signer = signer;
    walletState.address = accounts[0];
    walletState.chainId = Number(network.chainId);

    updateWalletUI();
    hideLoading();
    showToast('Wallet connected!', 'success');

    // Auto-fill scanner address
    const scanAddr = document.getElementById('scanAddress');
    if (scanAddr && !scanAddr.value) {
      scanAddr.value = walletState.address;
    }

    // Auto-scan all popular chains
    autoScanAllChains(walletState.address);
  } catch (err) {
    hideLoading();
    console.error('Wallet connect error:', err);
    showToast('Failed to connect wallet: ' + err.message, 'error');
  }
}

async function switchToMantle(network = 'mainnet') {
  const net = MANTLE_NETWORKS[network];
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: net.chainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: net.chainId,
            chainName: net.chainName,
            rpcUrls: net.rpcUrls,
            nativeCurrency: net.nativeCurrency,
            blockExplorerUrls: net.blockExplorerUrls,
          }],
        });
      } catch (addError) {
        showToast('Failed to add Mantle network', 'error');
        return;
      }
    } else {
      return;
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network2 = await provider.getNetwork();
  walletState.provider = provider;
  walletState.signer = await provider.getSigner();
  walletState.chainId = Number(network2.chainId);
  updateWalletUI();
}

function updateWalletUI() {
  const btn = document.getElementById('walletBtn');
  const info = document.getElementById('walletInfo');
  const addr = document.getElementById('walletAddr');
  const netDot = document.querySelector('.footer .network-dot');
  const netName = document.getElementById('networkName');

  if (walletState.address) {
    btn.style.display = 'none';
    info.style.display = 'flex';
    addr.textContent = walletState.address.slice(0, 6) + '...' + walletState.address.slice(-4);

    if (netDot) netDot.classList.add('active');

    if (walletState.chainId === 5000) {
      netName.textContent = 'Mantle Mainnet';
    } else if (walletState.chainId === 5003) {
      netName.textContent = 'Mantle Sepolia';
    } else {
      netName.textContent = `Chain #${walletState.chainId}`;
    }
  }
}

// Listen for account/chain changes
if (typeof window !== 'undefined' && window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      walletState.address = null;
      document.getElementById('walletBtn').style.display = 'flex';
      document.getElementById('walletInfo').style.display = 'none';
    } else {
      walletState.address = accounts[0];
      updateWalletUI();
    }
  });

  window.ethereum.on('chainChanged', async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    walletState.provider = provider;
    walletState.signer = await provider.getSigner();
    walletState.chainId = Number(network.chainId);
    updateWalletUI();
  });
}
