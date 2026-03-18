require('dotenv').config();
const express = require('express');
const cors = require('cors');

const aiRoutes = require('./routes/ai');
const scannerRoutes = require('./routes/scanner');
const inheritanceRoutes = require('./routes/inheritance');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.use('/api/ai', aiRoutes);
app.use('/api/scan', scannerRoutes);
app.use('/api/inheritance', inheritanceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mantle Ark AI' });
});

app.listen(PORT, () => {
  console.log(`\n  Mantle Ark AI`);
  console.log(`  Bring Everything In. Protect It Forever.`);
  console.log(`  Running on http://localhost:${PORT}\n`);
});
