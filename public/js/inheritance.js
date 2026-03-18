// ============================================
// Mantle Ark AI — Inheritance Vault
// ============================================

let currentVaultStep = 1;

function vaultNextStep(step) {
  // Validate current step before advancing
  if (step > currentVaultStep) {
    if (!validateVaultStep(currentVaultStep)) return;
  }

  // If going to step 4, generate the review
  if (step === 4) {
    generateVaultReview();
  }

  currentVaultStep = step;

  // Update panels
  document.querySelectorAll('.vault-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`vault-step-${step}`);
  if (panel) panel.classList.add('active');

  // Update progress
  document.querySelectorAll('.vault-step').forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.remove('active', 'completed');
    if (sNum === step) s.classList.add('active');
    if (sNum < step) s.classList.add('completed');
  });
}

function validateVaultStep(step) {
  if (step === 1) {
    const rows = document.querySelectorAll('.beneficiary-row');
    let total = 0;
    let valid = true;

    rows.forEach(row => {
      const name = row.querySelector('.ben-name').value.trim();
      const addr = row.querySelector('.ben-address').value.trim();
      const pct = parseInt(row.querySelector('.ben-percent').value) || 0;

      if (!name || !addr) {
        valid = false;
      }
      total += pct;
    });

    if (!valid) {
      showToast('Please fill in all beneficiary fields', 'error');
      return false;
    }
    if (total !== 100) {
      showToast('Percentages must add up to 100%', 'error');
      return false;
    }
    return true;
  }
  return true;
}

function addBeneficiary() {
  const list = document.getElementById('beneficiaryList');
  const index = list.children.length;

  const row = document.createElement('div');
  row.className = 'beneficiary-row';
  row.dataset.index = index;
  row.innerHTML = `
    <input type="text" class="input ben-name" placeholder="Name" />
    <input type="text" class="input ben-address" placeholder="0x... wallet address" />
    <input type="number" class="input ben-percent" placeholder="%" min="1" max="100" value="0" />
    <button class="btn-icon-sm remove-ben" onclick="removeBeneficiary(this)" title="Remove">&#10005;</button>
  `;
  list.appendChild(row);
  updatePercentTotal();
}

function removeBeneficiary(btn) {
  const list = document.getElementById('beneficiaryList');
  if (list.children.length <= 1) {
    showToast('You need at least one beneficiary', 'error');
    return;
  }
  btn.closest('.beneficiary-row').remove();
  updatePercentTotal();
}

function updatePercentTotal() {
  let total = 0;
  document.querySelectorAll('.ben-percent').forEach(input => {
    total += parseInt(input.value) || 0;
  });

  const totalEl = document.getElementById('totalPercent');
  const statusEl = document.getElementById('percentStatus');
  totalEl.textContent = total;

  if (total === 100) {
    statusEl.innerHTML = '&#10003;';
    statusEl.className = 'percent-ok';
  } else {
    statusEl.innerHTML = `(need ${total > 100 ? 'less' : 'more'})`;
    statusEl.className = 'percent-error';
  }
}

// Listen for percent changes
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('ben-percent')) {
    updatePercentTotal();
  }
});

function getVaultConfig() {
  const beneficiaries = [];
  document.querySelectorAll('.beneficiary-row').forEach(row => {
    beneficiaries.push({
      name: row.querySelector('.ben-name').value.trim(),
      address: row.querySelector('.ben-address').value.trim(),
      percentage: parseInt(row.querySelector('.ben-percent').value) || 0,
    });
  });

  return {
    beneficiaries,
    trigger: {
      inactivityPeriod: document.getElementById('inactivityPeriod').value,
      gracePeriod: document.getElementById('gracePeriod').value,
      heartbeatMethod: document.getElementById('heartbeatMethod').value,
    },
    preferences: {
      exitDefi: document.getElementById('exitDefi').checked,
      convertStable: document.getElementById('convertStable').checked,
      revokeApprovals: document.getElementById('revokeApprovals').checked,
      generateReport: document.getElementById('generateReport').checked,
    }
  };
}

async function generateVaultReview() {
  const config = getVaultConfig();
  const container = document.getElementById('vaultReview');

  showLoading('AI is generating your inheritance plan...');

  // Build portfolio summary
  const prices = getPriceEstimates();
  const portfolio = appState.scannedChains.map(c => ({
    chain: c.chainName,
    balance: c.balance,
    token: c.nativeToken?.symbol,
    estimatedUSD: c.balance * (prices[c.nativeToken?.symbol] || 0),
  }));
  const totalValue = portfolio.reduce((sum, p) => sum + p.estimatedUSD, 0);

  try {
    // Get AI plan
    const res = await fetch('/api/inheritance/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio,
        beneficiaries: config.beneficiaries,
        settings: { ...config.trigger, ...config.preferences, totalValue }
      })
    });
    const data = await res.json();

    // Also get cost estimate
    const estRes = await fetch('/api/inheritance/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beneficiaryCount: config.beneficiaries.length,
        portfolioSize: totalValue
      })
    });
    const estData = await estRes.json();

    hideLoading();

    // Render the review
    let html = '';

    // Summary section
    html += `
      <div class="vault-review-section">
        <h4>Vault Summary</h4>
        <div class="review-row"><span class="label">Vault Name</span><span class="value">${data.result?.plan?.name || 'Ark Vault'}</span></div>
        <div class="review-row"><span class="label">Protected Value</span><span class="value">$${totalValue.toFixed(2)}</span></div>
        <div class="review-row"><span class="label">Chains Covered</span><span class="value">${appState.scannedChains.length}</span></div>
      </div>
    `;

    // Beneficiaries
    html += `<div class="vault-review-section"><h4>Beneficiaries</h4>`;
    config.beneficiaries.forEach(b => {
      const share = (totalValue * b.percentage / 100).toFixed(2);
      html += `
        <div class="review-row">
          <span class="label">${b.name} (${b.percentage}%)</span>
          <span class="value">${b.address.slice(0, 8)}...${b.address.slice(-4)} — ~$${share}</span>
        </div>
      `;
    });
    html += `</div>`;

    // Trigger
    html += `
      <div class="vault-review-section">
        <h4>Dead Man's Switch</h4>
        <div class="review-row"><span class="label">Inactivity Trigger</span><span class="value">${config.trigger.inactivityPeriod} days</span></div>
        <div class="review-row"><span class="label">Grace Period</span><span class="value">${config.trigger.gracePeriod} days</span></div>
        <div class="review-row"><span class="label">Heartbeat Method</span><span class="value">${config.trigger.heartbeatMethod}</span></div>
        <div class="review-row"><span class="label">Total Time to Execute</span><span class="value">${parseInt(config.trigger.inactivityPeriod) + parseInt(config.trigger.gracePeriod)} days</span></div>
      </div>
    `;

    // Execution Preferences
    html += `<div class="vault-review-section"><h4>Before Distribution</h4>`;
    if (config.preferences.exitDefi) html += `<div class="review-row"><span class="label">&#10003; Exit DeFi Positions</span><span class="value">Enabled</span></div>`;
    if (config.preferences.convertStable) html += `<div class="review-row"><span class="label">&#10003; Convert to Stablecoins</span><span class="value">Enabled</span></div>`;
    if (config.preferences.revokeApprovals) html += `<div class="review-row"><span class="label">&#10003; Revoke Approvals</span><span class="value">Enabled</span></div>`;
    if (config.preferences.generateReport) html += `<div class="review-row"><span class="label">&#10003; Generate Family Report</span><span class="value">Enabled</span></div>`;
    html += `</div>`;

    // Costs
    if (estData.success) {
      const est = estData.estimate;
      html += `
        <div class="vault-review-section">
          <h4>Estimated Costs (Mantle)</h4>
          <div class="review-row"><span class="label">Vault Deployment</span><span class="value">${est.deployment.costMNT} MNT (~$${est.deployment.costUSD})</span></div>
          <div class="review-row"><span class="label">Monthly Heartbeat</span><span class="value">${est.heartbeat.costMNT} MNT (~$${est.heartbeat.costUSD})</span></div>
          <div class="review-row"><span class="label">Execution (one-time)</span><span class="value">${est.execution.costMNT} MNT (~$${est.execution.costUSD})</span></div>
          <div class="review-row"><span class="label">First Year Total</span><span class="value" style="color:var(--accent)">~$${est.totalFirstYear}</span></div>
          <div class="review-row"><span class="label">&nbsp;</span><span class="value" style="font-size:12px;color:var(--text-muted)">${est.note}</span></div>
        </div>
      `;
    }

    // Family Report
    if (data.result?.familyReport) {
      html += `
        <div class="vault-review-section">
          <h4>Family Report Preview</h4>
          <div class="vault-report">${data.result.familyReport}</div>
        </div>
      `;
    }

    // Security Notes
    if (data.result?.securityNotes && data.result.securityNotes.length > 0) {
      html += `<div class="vault-review-section"><h4>Security Notes</h4>`;
      data.result.securityNotes.forEach(note => {
        html += `<p style="font-size:13px;color:var(--text-secondary);margin:6px 0">&#9888; ${note}</p>`;
      });
      html += `</div>`;
    }

    // Deploy Button
    html += `
      <div style="margin-top:24px">
        <button class="btn-primary" onclick="deployVault()">
          <span>&#9878;</span> Deploy Ark Vault on Mantle
        </button>
        <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:8px">
          Requires MetaMask connected to Mantle Network
        </p>
      </div>
    `;

    container.innerHTML = html;
    appState.vaultConfig = config;
  } catch (err) {
    hideLoading();
    console.error('Vault review error:', err);

    // Render basic review without AI
    container.innerHTML = renderBasicReview(config, totalValue);
  }
}

function renderBasicReview(config, totalValue) {
  let html = `
    <div class="vault-review-section">
      <h4>Vault Summary</h4>
      <div class="review-row"><span class="label">Protected Value</span><span class="value">$${totalValue.toFixed(2)}</span></div>
    </div>
    <div class="vault-review-section"><h4>Beneficiaries</h4>
  `;
  config.beneficiaries.forEach(b => {
    html += `<div class="review-row"><span class="label">${b.name} (${b.percentage}%)</span><span class="value">${b.address.slice(0, 10)}...</span></div>`;
  });
  html += `</div>
    <div class="vault-review-section">
      <h4>Trigger</h4>
      <div class="review-row"><span class="label">Inactivity</span><span class="value">${config.trigger.inactivityPeriod} days</span></div>
      <div class="review-row"><span class="label">Grace</span><span class="value">${config.trigger.gracePeriod} days</span></div>
    </div>
    <button class="btn-primary" onclick="deployVault()">
      <span>&#9878;</span> Deploy Ark Vault on Mantle
    </button>
  `;
  return html;
}

async function deployVault() {
  if (!walletState.signer) {
    showToast('Please connect your wallet first', 'error');
    await connectWallet();
    return;
  }

  if (walletState.chainId !== 5000 && walletState.chainId !== 5003) {
    showToast('Please switch to Mantle network', 'error');
    await switchToMantle('mainnet');
    return;
  }

  showToast('Vault deployment is a concept demo. In production, this would deploy the ArkVault smart contract to Mantle.', 'success');

  // Update vault status on dashboard
  document.getElementById('vaultStatus').textContent = 'Configured';
  document.getElementById('vaultStatus').style.color = 'var(--accent)';
}
