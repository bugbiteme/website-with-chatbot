const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const config = {
  apiUrl: process.env.LLM_API_URL || '',
  authToken: process.env.LLM_AUTH_TOKEN || '',
  contentType: process.env.LLM_CONTENT_TYPE || 'application/json',
  model: process.env.LLM_MODEL || '',
};

const STORE_CONTEXT = `You are a friendly and knowledgeable customer service assistant for Luxe & Living, an upscale home goods and lifestyle e-commerce store.

Store details:
- Free shipping on orders over $75
- 30-day hassle-free returns on all items
- Standard delivery: 3–5 business days; express delivery: 1–2 business days ($12.99)
- Payment: Visa, Mastercard, Amex, PayPal, Apple Pay
- Loyalty program: Luxe Rewards — earn 1 point per $1 spent

Current promotions:
- Spring Refresh Sale: 20% off bedding and throws (code SPRING20)
- New arrivals: Scandinavian ceramic collection

Product categories: Furniture, Bedding, Lighting, Kitchen & Dining, Decor, Outdoor

Help customers with product recommendations, order status questions, shipping, returns, sizing, and general inquiries. Be concise, warm, and professional. If you don't know something specific about an order, ask for their order number or email and explain that you can look it up with that information.`;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    chatConfigured: Boolean(config.apiUrl && config.model),
  });
});

app.get('/api/chat/status', (_req, res) => {
  res.json({
    configured: Boolean(config.apiUrl && config.model),
    model: config.model || null,
  });
});

app.post('/api/chat', async (req, res) => {
  if (!config.apiUrl || !config.model) {
    return res.status(503).json({
      error: 'Chat service is not configured. Set LLM_API_URL and LLM_MODEL in the ConfigMap.',
    });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const llmMessages = [
    { role: 'system', content: STORE_CONTEXT },
    ...messages.filter((m) => m.role && m.content),
  ];

  const headers = {
    'Content-Type': config.contentType,
    Accept: 'text/event-stream',
  };

  if (config.authToken) {
    headers.Authorization = config.authToken.startsWith('Bearer ')
      ? config.authToken
      : `Bearer ${config.authToken}`;
  }

  try {
    const upstream = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: llmMessages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return res.status(upstream.status).json({
        error: `LLM API error (${upstream.status})`,
        detail: body.slice(0, 500),
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        res.end();
      } catch (err) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        }
      }
    };

    req.on('close', () => reader.cancel());
    pump();
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to reach LLM API', detail: err.message });
    }
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Luxe & Living store listening on port ${PORT}`);
  console.log(`Chat configured: ${Boolean(config.apiUrl && config.model)}`);
  if (config.model) console.log(`LLM model: ${config.model}`);
});
