// ============================================
// Mantle Ark AI — Migration Advisor
// ============================================

async function generateMigrationPlan() {
  const chains = appState.scannedChains;

  if (chains.length === 0) {
    showToast('Please scan at least one chain first', 'error');
    showSection('scanner');
    return;
  }

  const btn = document.getElementById('migBtn');
  btn.disabled = true;
  showLoading('AI is analyzing your portfolio and generating migration plan...');

  const priority = document.getElementById('migPriority').value;
  const risk = document.getElementById('migRisk').value;
  const strategy = document.getElementById('migStrategy').value;
  const prices = getPriceEstimates();

  // Build portfolio data for AI
  const portfolio = chains.map(c => ({
    chain: c.chainName,
    type: c.type,
    chainId: c.chainId,
    nativeToken: c.nativeToken?.symbol,
    balance: c.balance,
    estimatedUSD: c.balance * (prices[c.nativeToken?.symbol] || 0),
    txCount: c.txCount || 0,
    gasPrice: c.gasPrice || 'N/A',
    tokens: c.tokens || c.tokensHeld || [],
  }));

  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio,
        preferences: { priority, risk, strategy }
      })
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Analysis failed');

    const result = data.result;

    // Render comparison table
    renderComparison(portfolio, result);

    // Render migration report
    renderMigrationReport(result, portfolio);

    hideLoading();
    showToast('Migration plan generated!', 'success');
  } catch (err) {
    hideLoading();
    console.error('Migration error:', err);
    showToast('Failed to generate plan: ' + err.message, 'error');
  }

  btn.disabled = false;
}

function renderComparison(portfolio, result) {
  const section = document.getElementById('comparisonSection');
  const table = document.getElementById('comparisonTable');
  section.style.display = 'block';

  const totalValue = portfolio.reduce((sum, p) => sum + p.estimatedUSD, 0);

  let html = `
    <div class="comp-row header">
      <span>Metric</span>
      <span>Current</span>
      <span>On Mantle</span>
    </div>
    <div class="comp-row">
      <span class="label">Total Value</span>
      <span class="current">$${totalValue.toFixed(2)}</span>
      <span class="mantle">$${totalValue.toFixed(2)}</span>
    </div>
    <div class="comp-row">
      <span class="label">Chains Used</span>
      <span class="current">${portfolio.length} chains</span>
      <span class="mantle">1 chain (Mantle)</span>
    </div>
    <div class="comp-row">
      <span class="label">Avg Gas Cost</span>
      <span class="current">Varies ($0.01-$15)</span>
      <span class="mantle">&lt;$0.01</span>
    </div>
  `;

  if (result.estimatedSavings) {
    html += `
      <div class="comp-row">
        <span class="label">Gas Savings/Year</span>
        <span class="current">—</span>
        <span class="mantle">${result.estimatedSavings.gasPerYear || 'Significant'}</span>
      </div>
      <div class="comp-row">
        <span class="label">Yield Gain</span>
        <span class="current">—</span>
        <span class="mantle">${result.estimatedSavings.yieldGain || 'Higher'}</span>
      </div>
      <div class="comp-row">
        <span class="label">Total Benefit/Year</span>
        <span class="current">—</span>
        <span class="mantle">${result.estimatedSavings.totalBenefit || 'Positive'}</span>
      </div>
    `;
  }

  html += `
    <div class="comp-row">
      <span class="label">Inheritance Protection</span>
      <span class="current">None</span>
      <span class="mantle">Ark Vault Available</span>
    </div>
  `;

  table.innerHTML = html;
}

function renderMigrationReport(result, portfolio) {
  const container = document.getElementById('migrationReport');

  let html = '<div class="rendered-md">';

  // Summary
  if (result.summary) {
    html += `<h2>Portfolio Summary</h2>`;
    html += `<p><strong>Estimated Value:</strong> ${result.summary.totalEstimatedValue || 'N/A'}</p>`;
    html += `<p><strong>Chains:</strong> ${result.summary.chainCount || portfolio.length}</p>`;
    html += `<p><strong>Risk Level:</strong> ${result.summary.riskLevel || 'N/A'}</p>`;
    html += `<p><strong>Migration Urgency:</strong> ${result.summary.migrationUrgency || 'N/A'}</p>`;
  }

  // Per Chain Analysis
  if (result.perChain && result.perChain.length > 0) {
    html += `<h2>Per-Chain Analysis</h2>`;
    result.perChain.forEach(c => {
      html += `
        <div class="vault-review-section" style="margin-bottom:12px">
          <h4>${c.chain} ${c.priority === 'High' ? '&#128308;' : c.priority === 'Medium' ? '&#128992;' : '&#128994;'} ${c.priority} Priority</h4>
          <div class="review-row"><span class="label">Value</span><span class="value">${c.currentValue || 'N/A'}</span></div>
          <div class="review-row"><span class="label">Gas vs Mantle</span><span class="value">${c.gasCostComparison || 'N/A'}</span></div>
          <div class="review-row"><span class="label">Yield Comparison</span><span class="value">${c.yieldComparison || 'N/A'}</span></div>
          <div class="review-row"><span class="label">Bridge Route</span><span class="value">${c.bridgeRoute || 'N/A'}</span></div>
          <div class="review-row"><span class="label">Migration Cost</span><span class="value">${c.estimatedMigrationCost || 'N/A'}</span></div>
          <div class="review-row"><span class="label">Benefit</span><span class="value" style="color:var(--accent)">${c.migrationBenefit || 'N/A'}</span></div>
        </div>
      `;
    });
  }

  // Mantle Opportunities
  if (result.mantleOpportunities && result.mantleOpportunities.length > 0) {
    html += `<h2>Mantle DeFi Opportunities</h2>`;
    result.mantleOpportunities.forEach(opp => {
      html += `<p><strong>${opp.protocol}</strong> (${opp.type}) — APY: ${opp.estimatedAPY || 'Variable'}<br><span style="color:var(--text-muted)">${opp.description}</span></p>`;
    });
  }

  // Migration Plan Steps
  if (result.migrationPlan && result.migrationPlan.length > 0) {
    html += `<h2>Step-by-Step Migration Plan</h2><ol>`;
    result.migrationPlan.forEach(step => {
      html += `<li>${step}</li>`;
    });
    html += `</ol>`;
  }

  // Risks
  if (result.risks && result.risks.length > 0) {
    html += `<h2>Risks to Consider</h2><ul>`;
    result.risks.forEach(r => {
      html += `<li>${r}</li>`;
    });
    html += `</ul>`;
  }

  // If raw text (fallback)
  if (result.raw) {
    html += renderMarkdown(result.raw);
  }

  html += '</div>';

  // Add Ark Vault CTA
  html += `
    <div class="migration-cta card" style="margin-top:24px;display:flex">
      <div class="cta-content">
        <div class="cta-icon">&#9878;</div>
        <div>
          <h3>Protect Your Migrated Assets</h3>
          <p>Set up an Ark Vault to protect your portfolio with an on-chain inheritance protocol.</p>
        </div>
      </div>
      <button class="btn-primary" onclick="showSection('vault')" style="width:auto;margin:0;white-space:nowrap">
        Setup Ark Vault <span>&#10132;</span>
      </button>
    </div>
  `;

  container.innerHTML = html;
}
