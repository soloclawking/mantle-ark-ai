const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ARK_CONTEXT = `You are Mantle Ark AI, an expert AI assistant that helps users migrate crypto assets to Mantle Network and set up inheritance protection.

Key Mantle Facts:
- Mantle Network is an Ethereum Layer 2 using Optimistic Rollup technology with EigenDA
- Chain ID: 5000 (mainnet), 5003 (testnet/Sepolia)
- Native token: MNT (used for gas fees)
- RPC Mainnet: https://rpc.mantle.xyz
- Gas fees are significantly lower than Ethereum (often <$0.01 per transaction)
- Key DeFi protocols: Agni Finance (DEX), FusionX (DEX), Lendle (Lending), Merchant Moe (DEX), mETH (Liquid Staking)
- mETH Protocol: Mantle's liquid staking, currently offering ~8% APY on ETH staking
- Mantle Treasury is one of the largest DAO treasuries
- Bridge: bridge.mantle.xyz (official), also supported by Wormhole, LayerZero, Stargate

Migration benefits of Mantle:
- Ultra-low gas fees (MNT as gas token)
- Fast transaction finality (~2 seconds)
- EVM-compatible (easy migration from other EVM chains)
- Growing DeFi ecosystem with competitive yields
- Strong treasury backing and ecosystem incentives
- mETH liquid staking for ETH holders`;

// Analyze portfolio and generate migration recommendation
router.post('/analyze', async (req, res) => {
  try {
    const { portfolio } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${ARK_CONTEXT}

You are analyzing a user's cross-chain portfolio. Generate a comprehensive migration analysis.

Respond in this EXACT JSON format (no markdown, no code blocks, raw JSON only):
{
  "summary": {
    "totalEstimatedValue": "estimated total USD value",
    "chainCount": number,
    "riskLevel": "Low/Medium/High",
    "migrationUrgency": "Low/Medium/High"
  },
  "perChain": [
    {
      "chain": "chain name",
      "currentValue": "estimated value",
      "gasCostComparison": "how much more expensive gas is vs Mantle",
      "yieldComparison": "yield difference vs Mantle DeFi",
      "migrationBenefit": "one-line benefit of migrating to Mantle",
      "bridgeRoute": "recommended bridge (e.g., Wormhole, LayerZero, Official Bridge)",
      "estimatedMigrationCost": "estimated cost to bridge",
      "priority": "High/Medium/Low"
    }
  ],
  "mantleOpportunities": [
    {
      "protocol": "protocol name on Mantle",
      "type": "Lending/DEX/Staking/Yield",
      "estimatedAPY": "estimated APY range",
      "description": "what user can do here"
    }
  ],
  "estimatedSavings": {
    "gasPerYear": "estimated gas savings per year on Mantle",
    "yieldGain": "estimated additional yield per year on Mantle",
    "totalBenefit": "total estimated benefit per year"
  },
  "migrationPlan": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "risks": ["risk 1", "risk 2"]
}`
        },
        {
          role: 'user',
          content: `Analyze this cross-chain portfolio and recommend migration to Mantle:\n\n${JSON.stringify(portfolio, null, 2)}`
        }
      ],
      temperature: 0.4,
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
    console.error('Analyze error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate detailed migration plan
router.post('/migration-plan', async (req, res) => {
  try {
    const { fromChain, assets, preferences } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${ARK_CONTEXT}

Generate a detailed, step-by-step migration plan for moving assets to Mantle.
Be specific about which bridges to use, estimated costs, and what to do after arriving on Mantle.
Format as clear markdown with sections and steps. Be practical and actionable.`
        },
        {
          role: 'user',
          content: `Create a migration plan:\n\nFrom: ${fromChain}\nAssets: ${JSON.stringify(assets)}\nPreferences: ${JSON.stringify(preferences || {})}`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    res.json({
      success: true,
      result: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Migration plan error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// General AI chat
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${ARK_CONTEXT}

You are a helpful AI assistant for Mantle Ark AI. Help users with:
1. Understanding their cross-chain portfolio
2. Migration strategies to Mantle
3. Setting up inheritance/dead man's switch vaults
4. DeFi opportunities on Mantle
5. General Mantle and crypto questions

Be concise, accurate, and helpful. Use markdown formatting. Always emphasize Mantle's benefits where relevant.`
        },
        ...messages
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    res.json({
      success: true,
      result: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
