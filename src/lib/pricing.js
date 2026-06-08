// API pricing in USD per 1,000,000 tokens (standard tier, short-context).
// Verified June 2026 against each provider's published pricing page.
// cacheWrite only applies to Anthropic (1.25x input); for OpenAI/Gemini it is
// unused because their prompt_tokens already include cached tokens.
export const PRICING = {
  // Anthropic
  'claude-opus-4-8':            { input: 5.00, output: 25.00, cachedInput: 0.50,  cacheWrite: 6.25 },
  'claude-opus-4-7':            { input: 5.00, output: 25.00, cachedInput: 0.50,  cacheWrite: 6.25 },
  'claude-sonnet-4-6':          { input: 3.00, output: 15.00, cachedInput: 0.30,  cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001':  { input: 1.00, output: 5.00,  cachedInput: 0.10,  cacheWrite: 1.25 },
  // OpenAI
  'gpt-5.5':                    { input: 5.00, output: 30.00, cachedInput: 0.50,  cacheWrite: 5.00 },
  'gpt-5.4':                    { input: 2.50, output: 15.00, cachedInput: 0.25,  cacheWrite: 2.50 },
  'gpt-5.4-mini':               { input: 0.75, output: 4.50,  cachedInput: 0.075, cacheWrite: 0.75 },
  'gpt-5.4-nano':               { input: 0.20, output: 1.25,  cachedInput: 0.02,  cacheWrite: 0.20 },
  // Google Gemini
  'gemini-2.5-flash':           { input: 0.30, output: 2.50,  cachedInput: 0.075, cacheWrite: 0.30 },
  'gemini-3.5-flash':           { input: 1.50, output: 9.00,  cachedInput: 0.15,  cacheWrite: 1.50 },
  'gemini-3.1-pro':             { input: 2.00, output: 12.00, cachedInput: 0.20,  cacheWrite: 2.00 },
  'gemini-3.1-flash-lite':      { input: 0.25, output: 1.50,  cachedInput: 0.025, cacheWrite: 0.25 },
};

// Resolve a rate card for a model id, falling back by provider prefix so custom
// model strings entered in Settings still get a reasonable estimate.
export function priceForModel(model) {
  if (PRICING[model]) return PRICING[model];
  const m = (model || '').toLowerCase();
  if (m.startsWith('claude')) return PRICING['claude-sonnet-4-6'];
  if (m.startsWith('gpt'))    return PRICING['gpt-5.4-mini'];
  if (m.startsWith('gemini')) return PRICING['gemini-2.5-flash'];
  return null;
}

// usage shape (normalized in api.js): { fullInputTokens, cachedReadTokens, cacheWriteTokens, outputTokens }
export function costFromUsage(model, usage) {
  const p = priceForModel(model);
  if (!p || !usage) return null;
  const cost =
    ((usage.fullInputTokens  || 0) * p.input +
     (usage.cachedReadTokens || 0) * (p.cachedInput ?? p.input) +
     (usage.cacheWriteTokens || 0) * (p.cacheWrite ?? p.input) +
     (usage.outputTokens     || 0) * p.output) / 1e6;
  return cost;
}

export function formatCost(usd) {
  if (usd == null) return null;
  return '$' + usd.toFixed(usd < 0.1 ? 4 : 2);
}

// Representative token counts for one full packet (tailored resume + cover letter).
// Used only for the at-a-glance estimate shown when choosing a model in Settings.
export const TYPICAL_PACKET = { input: 6900, output: 2000 };

export function estimatePacketCost(model) {
  const p = priceForModel(model);
  if (!p) return null;
  return (TYPICAL_PACKET.input * p.input + TYPICAL_PACKET.output * p.output) / 1e6;
}
