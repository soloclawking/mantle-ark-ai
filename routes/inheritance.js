const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Generate inheritance plan with AI
router.post('/configure', async (req, res) => {
  try {
    const { portfolio, beneficiaries, settings } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are Mantle Ark AI's Inheritance Planner. You help users set up dead man's switch and inheritance vaults on Mantle Network.

Given a user's portfolio, beneficiaries, and settings, generate a comprehensive inheritance plan.

Respond in this EXACT JSON format (no markdown, no code blocks, raw JSON only):
{
  "plan": {
    "name": "A name for this inheritance vault",
    "summary": "2-3 sentence summary of the plan",
    "totalValue": "estimated total value being protected"
  },
  "beneficiaries": [
    {
      "name": "beneficiary name",
      "address": "wallet address",
      "percentage": number,
      "estimatedValue": "estimated USD value they receive"
    }
  ],
  "triggerSettings": {
    "inactivityPeriod": "how long until trigger (e.g., 90 days)",
    "gracePeriod": "grace period after trigger (e.g., 30 days)",
    "verificationMethod": "how owner proves alive",
    "totalTimeBeforeExecution": "total time from last activity to distribution"
  },
  "executionSteps": [
    "Step 1: What happens when trigger activates",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "preExecutionActions": [
    "Action the vault takes before distributing (e.g., exit DeFi positions, revoke approvals)"
  ],
  "estimatedCosts": {
    "deploymentCost": "estimated gas to deploy vault on Mantle",
    "heartbeatCost": "estimated gas per heartbeat transaction",
    "executionCost": "estimated gas for inheritance execution"
  },
  "securityNotes": [
    "Important security consideration 1",
    "Important security consideration 2"
  ],
  "familyReport": "A human-readable message that can be shared with beneficiaries explaining what this vault does and how they can claim their inheritance"
}`
        },
        {
          role: 'user',
          content: `Generate an inheritance plan:\n\nPortfolio: ${JSON.stringify(portfolio)}\nBeneficiaries: ${JSON.stringify(beneficiaries)}\nSettings: ${JSON.stringify(settings)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw };
    }

    res.json({ success: true, result: parsed });
  } catch (error) {
    console.error('Inheritance config error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estimate costs for vault deployment
router.post('/estimate', async (req, res) => {
  try {
    const { beneficiaryCount, portfolioSize } = req.body;

    // Estimated costs on Mantle (very low gas)
    const deployGas = 2000000; // ~2M gas for vault deployment
    const heartbeatGas = 50000; // ~50K gas per heartbeat
    const executeGas = 500000 + (beneficiaryCount * 100000); // base + per beneficiary

    // Mantle gas price is typically very low
    const estimatedGasPrice = 0.02; // gwei
    const mntPrice = 0.75; // rough estimate

    const deployCost = (deployGas * estimatedGasPrice / 1e9) * mntPrice;
    const heartbeatCost = (heartbeatGas * estimatedGasPrice / 1e9) * mntPrice;
    const executeCost = (executeGas * estimatedGasPrice / 1e9) * mntPrice;

    res.json({
      success: true,
      estimate: {
        deployment: {
          gas: deployGas,
          costMNT: (deployGas * estimatedGasPrice / 1e9).toFixed(6),
          costUSD: deployCost.toFixed(4)
        },
        heartbeat: {
          gas: heartbeatGas,
          costMNT: (heartbeatGas * estimatedGasPrice / 1e9).toFixed(6),
          costUSD: heartbeatCost.toFixed(4),
          yearlyMNT: ((heartbeatGas * estimatedGasPrice / 1e9) * 12).toFixed(6),
          yearlyCostUSD: (heartbeatCost * 12).toFixed(4)
        },
        execution: {
          gas: executeGas,
          costMNT: (executeGas * estimatedGasPrice / 1e9).toFixed(6),
          costUSD: executeCost.toFixed(4)
        },
        totalFirstYear: (deployCost + heartbeatCost * 12).toFixed(4),
        note: 'Costs are estimates based on current Mantle gas prices. Actual costs may vary.'
      }
    });
  } catch (error) {
    console.error('Estimate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
