// ============================================
// Mantle Ark AI — Main App Controller
// ============================================

// Global state
const appState = {
  currentSection: 'hero',
  scannedChains: [],
  portfolio: [],
  vaultConfig: null,
  chatHistory: [],
};

// ===== NAVIGATION =====
function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show target
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.add('active');
    appState.currentSection = name;
  }

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
}

// ===== LOADING =====
function showLoading(text = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const loadText = document.getElementById('loadingText');
  overlay.classList.remove('hidden');
  loadText.textContent = text;
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '&#10003;' : '&#10007;'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(32px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== MARKDOWN RENDERER =====
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// ===== PORTFOLIO HELPERS =====
function updatePortfolioStats() {
  const chains = appState.scannedChains;

  // Get mock USD prices for native tokens
  const prices = getPriceEstimates();

  let totalValue = 0;
  let totalTx = 0;

  chains.forEach(chain => {
    const price = prices[chain.nativeToken?.symbol] || 0;
    chain.estimatedUSD = chain.balance * price;
    totalValue += chain.estimatedUSD;
    totalTx += chain.txCount || 0;
  });

  // Update dashboard stats
  document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('totalChains').textContent = `Across ${chains.length} chain${chains.length !== 1 ? 's' : ''}`;
  document.getElementById('totalTxCount').textContent = totalTx.toLocaleString();

  // Estimated savings (rough calculation)
  const nonMantleValue = chains.filter(c => c.chainId !== 5000 && c.chainId !== 5003).reduce((sum, c) => sum + c.estimatedUSD, 0);
  const estSavings = Math.floor(nonMantleValue * 0.03); // ~3% savings estimate
  document.getElementById('estSavings').textContent = `$${estSavings}/yr`;

  // Show migration CTA if there are non-Mantle chains
  const cta = document.getElementById('migrationCta');
  if (nonMantleValue > 0) {
    cta.style.display = 'flex';
    document.getElementById('ctaText').textContent =
      `AI has analyzed your portfolio. You could save an estimated $${estSavings}/year by consolidating on Mantle.`;
  }

  // Update chart
  updatePortfolioChart();

  // Update chain list
  updateChainList();
}

function getPriceEstimates() {
  return {
    'MNT': 0.75,
    'ETH': 3200,
    'BNB': 580,
    'MATIC': 0.55,
    'AVAX': 35,
    'FTM': 0.4,
    'SOL': 150,
    'SUI': 1.2,
    'APT': 8.5,
    'CRO': 0.09,
    'xDAI': 1,
  };
}

function getChainColor(chain) {
  const colors = {
    'Mantle': '#00d4aa',
    'Ethereum': '#627EEA',
    'Arbitrum': '#28A0F0',
    'Optimism': '#FF0420',
    'Base': '#0052FF',
    'Polygon': '#8247E5',
    'BNB Chain': '#F3BA2F',
    'Avalanche': '#E84142',
    'Solana': '#9945FF',
    'Sui': '#4DA2FF',
    'Aptos': '#FFA500',
  };
  return colors[chain.chainName] || '#64748b';
}

let portfolioChart = null;

function updatePortfolioChart() {
  const chains = appState.scannedChains;
  if (chains.length === 0) return;

  document.getElementById('chartEmpty').style.display = 'none';
  const canvas = document.getElementById('portfolioChart');

  const labels = chains.map(c => c.chainName);
  const data = chains.map(c => c.estimatedUSD || 0);
  const colors = chains.map(c => getChainColor(c));

  if (portfolioChart) {
    portfolioChart.destroy();
  }

  portfolioChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#111827',
        borderWidth: 3,
        hoverBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#1a2640',
          titleColor: '#f1f5f9',
          bodyColor: '#8b9dc3',
          borderColor: '#2a3a5c',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function (ctx) {
              const val = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` $${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function updateChainList() {
  const container = document.getElementById('chainList');
  const chains = appState.scannedChains;

  if (chains.length === 0) {
    container.innerHTML = '<div class="empty-state small"><p>No data yet</p></div>';
    return;
  }

  const total = chains.reduce((sum, c) => sum + (c.estimatedUSD || 0), 0);

  container.innerHTML = chains
    .sort((a, b) => (b.estimatedUSD || 0) - (a.estimatedUSD || 0))
    .map(c => {
      const pct = total > 0 ? ((c.estimatedUSD / total) * 100).toFixed(1) : 0;
      return `
        <div class="chain-list-item">
          <div class="cli-color" style="background:${getChainColor(c)}"></div>
          <div class="cli-info">
            <div class="cli-name">${c.chainName}</div>
            <div class="cli-sub">${c.balance.toFixed(4)} ${c.nativeToken?.symbol || ''} &middot; ${pct}%</div>
          </div>
          <div class="cli-value">$${(c.estimatedUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      `;
    }).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showSection('hero');
});
