// ============================================
// Mantle Ark AI — Universal Chain Scanner
// ============================================

// EVM chains to auto-scan on wallet connect
const AUTO_SCAN_CHAINS = [
  { rpc: 'https://rpc.mantle.xyz', name: 'Mantle' },
  { rpc: 'https://eth.llamarpc.com', name: 'Ethereum' },
  { rpc: 'https://arb1.arbitrum.io/rpc', name: 'Arbitrum' },
  { rpc: 'https://mainnet.optimism.io', name: 'Optimism' },
  { rpc: 'https://mainnet.base.org', name: 'Base' },
  { rpc: 'https://bsc-dataseed.binance.org', name: 'BNB Chain' },
  { rpc: 'https://polygon-rpc.com', name: 'Polygon' },
  { rpc: 'https://api.avax.network/ext/bc/C/rpc', name: 'Avalanche' },
];

let isAutoScanning = false;

// Auto-scan all EVM chains — results appear live in dashboard
async function autoScanAllChains(address) {
  if (isAutoScanning || !address) return;
  isAutoScanning = true;

  // Clear previous data
  appState.scannedChains = [];

  // Navigate to dashboard immediately
  showSection('dashboard');

  // Show scanning progress bar in dashboard
  showScanProgress(0, AUTO_SCAN_CHAINS.length);

  let completed = 0;

  // Scan chains in parallel batches of 4
  const batchSize = 4;
  for (let i = 0; i < AUTO_SCAN_CHAINS.length; i += batchSize) {
    const batch = AUTO_SCAN_CHAINS.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (chain) => {
        try {
          const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rpc: chain.rpc, address })
          });
          const data = await res.json();
          if (data.success && data.data) {
            data.data._rpc = chain.rpc;
            return data.data;
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    // Process each result — add to dashboard live
    results.forEach(r => {
      completed++;
      if (r.status === 'fulfilled' && r.value) {
        const chain = r.value;
        if (chain.balance > 0 || chain.txCount > 0) {
          appState.scannedChains.push(chain);
        }
      }
    });

    // Update UI after each batch (live update)
    updatePortfolioStats();
    renderScannedChains();
    showScanProgress(completed, AUTO_SCAN_CHAINS.length);
  }

  // Done scanning
  hideScanProgress();
  updatePortfolioStats();
  renderScannedChains();
  isAutoScanning = false;

  const found = appState.scannedChains.length;
  if (found > 0) {
    showToast(`Scan complete! Found assets on ${found} chain${found !== 1 ? 's' : ''}.`, 'success');
  } else {
    showToast('No assets found on popular EVM chains. Add custom chains in Scanner tab.', 'success');
  }
}

// Show / update scan progress in dashboard
function showScanProgress(done, total) {
  let bar = document.getElementById('scanProgressBar');
  if (!bar) {
    // Create progress bar at top of dashboard
    bar = document.createElement('div');
    bar.id = 'scanProgressBar';
    bar.className = 'scan-progress';
    const dashGrid = document.querySelector('.dashboard-grid');
    if (dashGrid) dashGrid.prepend(bar);
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const chainsFound = appState.scannedChains.length;

  bar.innerHTML = `
    <div class="scan-progress-header">
      <div class="scan-progress-info">
        <span class="scan-pulse"></span>
        <span class="scan-label">Scanning EVM chains...</span>
        <span class="scan-detail">${done}/${total} chains checked &middot; ${chainsFound} with assets</span>
      </div>
      <span class="scan-pct">${pct}%</span>
    </div>
    <div class="scan-bar-track">
      <div class="scan-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="scan-chain-tags">
      ${AUTO_SCAN_CHAINS.map((c, i) => {
        const isScanned = i < done;
        const hasAsset = appState.scannedChains.some(sc => sc._rpc === c.rpc);
        let cls = 'scan-tag';
        if (isScanned && hasAsset) cls += ' found';
        else if (isScanned) cls += ' empty';
        else cls += ' pending';
        return `<span class="${cls}">${c.name}</span>`;
      }).join('')}
    </div>
  `;
}

function hideScanProgress() {
  const bar = document.getElementById('scanProgressBar');
  if (bar) {
    // Show completed state briefly then fade out
    bar.innerHTML = `
      <div class="scan-progress-header">
        <div class="scan-progress-info">
          <span class="scan-done-icon">&#10003;</span>
          <span class="scan-label">Scan complete!</span>
          <span class="scan-detail">Found assets on ${appState.scannedChains.length} chain${appState.scannedChains.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
    bar.classList.add('scan-complete');
    setTimeout(() => {
      bar.style.opacity = '0';
      bar.style.transform = 'translateY(-10px)';
      bar.style.transition = 'all 0.5s ease';
      setTimeout(() => bar.remove(), 500);
    }, 3000);
  }
}

// ===== MANUAL SCANNER =====

function setQuickRpc(rpc, name) {
  document.getElementById('scanRpc').value = rpc;
  showToast(`${name} RPC selected`, 'success');

  // Auto-fill wallet address for EVM if connected
  if (walletState.address && name !== 'Solana' && name !== 'Sui' && name !== 'Aptos') {
    document.getElementById('scanAddress').value = walletState.address;
  } else {
    document.getElementById('scanAddress').value = '';
    document.getElementById('scanAddress').placeholder = getPlaceholder(name);
  }
}

function getPlaceholder(chain) {
  switch (chain) {
    case 'Solana': return 'Base58 address (e.g., 7xKXtg2Cw...)';
    case 'Sui': return '0x address (e.g., 0x8af5b...)';
    case 'Aptos': return '0x address (e.g., 0x1a2b3c...)';
    default: return '0x... EVM wallet address';
  }
}

async function scanChain() {
  const rpc = document.getElementById('scanRpc').value.trim();
  const address = document.getElementById('scanAddress').value.trim();

  if (!rpc) {
    showToast('Please enter an RPC URL', 'error');
    return;
  }
  if (!address) {
    showToast('Please enter a wallet address', 'error');
    return;
  }

  // Check if already scanned same rpc+address
  const existing = appState.scannedChains.find(c =>
    c.address === address && c._rpc === rpc
  );
  if (existing) {
    showToast('This chain+address is already scanned', 'error');
    return;
  }

  const btn = document.getElementById('scanBtn');
  btn.disabled = true;
  showLoading('Scanning chain... AI is detecting the chain type');

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rpc, address })
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Scan failed');
    }

    const chain = data.data;
    chain._rpc = rpc;

    // Add to state
    appState.scannedChains.push(chain);

    // Update UI
    renderScannedChains();
    updatePortfolioStats();

    hideLoading();
    showToast(`${chain.chainName} scanned successfully! Balance: ${chain.balance.toFixed(4)} ${chain.nativeToken?.symbol || ''}`, 'success');

    // Clear form
    document.getElementById('scanRpc').value = '';
    document.getElementById('scanAddress').value = '';
  } catch (err) {
    hideLoading();
    console.error('Scan error:', err);
    showToast('Scan failed: ' + err.message, 'error');
  }

  btn.disabled = false;
}

function renderScannedChains() {
  const container = document.getElementById('scannedChains');
  const chains = appState.scannedChains;
  const countEl = document.getElementById('chainCount');

  countEl.textContent = `${chains.length} chain${chains.length !== 1 ? 's' : ''}`;

  if (chains.length === 0 && !isAutoScanning) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#127758;</div>
        <p>No chains scanned yet</p>
        <span>Connect your wallet to auto-scan, or add a chain manually</span>
      </div>
    `;
    return;
  }

  if (chains.length === 0 && isAutoScanning) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="animation:spin 1s linear infinite">&#9881;</div>
        <p>Scanning chains...</p>
        <span>Results will appear here automatically</span>
      </div>
    `;
    return;
  }

  const prices = getPriceEstimates();

  container.innerHTML = chains.map((chain, idx) => {
    const symbol = chain.nativeToken?.symbol || '???';
    const price = prices[symbol] || 0;
    const usdValue = chain.balance * price;
    const isMantle = chain.chainId === 5000 || chain.chainId === 5003;

    let iconClass = 'evm';
    if (chain.type === 'solana') iconClass = 'solana';
    if (chain.type === 'sui') iconClass = 'sui';
    if (chain.type === 'aptos') iconClass = 'aptos';
    if (isMantle) iconClass = 'mantle-icon';

    const iconLetter = chain.chainName ? chain.chainName[0].toUpperCase() : '?';

    let tokenInfo = '';
    if (chain.tokens && chain.tokens.length > 0) {
      tokenInfo = `<span class="chain-stat"><strong>${chain.tokens.length}</strong> tokens</span>`;
    }
    if (chain.tokensHeld && chain.tokensHeld.length > 0) {
      tokenInfo = `<span class="chain-stat"><strong>${chain.tokensHeld.length}</strong> tokens</span>`;
    }

    return `
      <div class="chain-card ${isMantle ? 'mantle' : ''}">
        <div class="chain-icon ${iconClass}">${iconLetter}</div>
        <div class="chain-info">
          <div class="chain-name">${chain.chainName}</div>
          <div class="chain-type">${chain.type.toUpperCase()} ${chain.chainId && typeof chain.chainId === 'number' ? `· Chain ID: ${chain.chainId}` : ''}</div>
          <div class="chain-stats">
            <span class="chain-stat"><strong>${chain.txCount || 0}</strong> txns</span>
            ${tokenInfo}
            ${chain.gasPrice ? `<span class="chain-stat">Gas: <strong>${chain.gasPrice}</strong> gwei</span>` : ''}
          </div>
        </div>
        <div class="chain-balance">
          <div class="chain-balance-value">${chain.balance.toFixed(4)}</div>
          <div class="chain-balance-label">${symbol} ≈ $${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    `;
  }).join('');
}
