'use strict';

const { z } = require('zod');

const LIMITS = Object.freeze({ timeoutMs: 20000, modelCalls: 3, toolCalls: 6, outputTokens: 1000 });
const MAX_RESPONSE_BYTES = 262144;
const usageSchema = z.object({
  promptTokenCount: z.number().int().nonnegative().safe().optional(),
  candidatesTokenCount: z.number().int().nonnegative().safe().optional(),
  totalTokenCount: z.number().int().nonnegative().safe().optional(),
  cachedContentTokenCount: z.number().int().nonnegative().safe().optional(),
  thoughtsTokenCount: z.number().int().nonnegative().safe().optional(),
  toolUsePromptTokenCount: z.number().int().nonnegative().safe().optional()
});
const partSchema = z.object({
  text: z.string().max(MAX_RESPONSE_BYTES).optional(),
  thought: z.boolean().optional(),
  thoughtSignature: z.string().max(MAX_RESPONSE_BYTES).optional(),
  functionCall: z.object({
    id: z.string().min(1).max(256).optional(),
    name: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    args: z.record(z.string(), z.unknown()).optional()
  }).passthrough().optional()
}).passthrough();
const responseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({ role: z.literal('model'), parts: z.array(partSchema).min(1).max(32) }),
    finishReason: z.string().optional()
  })).length(1),
  modelVersion: z.string().max(200).optional(),
  responseId: z.string().max(256).optional(),
  usageMetadata: z.unknown().optional()
});

function aiError(code, status = 502, retryable = false) {
  return Object.assign(new Error(code), { code, status, retryable });
}

function checkSignal(signal) {
  if (signal?.aborted) throw aiError(signal.reason?.code === 'AI_TIMEOUT' ? 'AI_TIMEOUT' : 'AI_CANCELLED', 408);
}

// Races even an injected transport/tool that ignores AbortSignal; cleans listeners.
async function abortable(work, signal) {
  checkSignal(signal);
  let onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => {
      try { checkSignal(signal); } catch (error) { reject(error); }
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  try { return await Promise.race([Promise.resolve().then(() => { checkSignal(signal); return work(); }), cancelled]); }
  finally { signal?.removeEventListener('abort', onAbort); }
}

async function withDeadline(work, { signal, timeoutMs = LIMITS.timeoutMs } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > LIMITS.timeoutMs) {
    throw aiError('AI_INVALID_TIMEOUT', 422);
  }
  checkSignal(signal);
  const controller = new AbortController();
  const forward = () => controller.abort(aiError('AI_CANCELLED', 408));
  signal?.addEventListener('abort', forward, { once: true });
  const timer = setTimeout(() => controller.abort(aiError('AI_TIMEOUT', 408)), timeoutMs);
  try { return await abortable(() => work(controller.signal), controller.signal); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', forward); }
}

async function readJson(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw aiError('AI_MALFORMED_RESPONSE');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await abortable(() => reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw aiError('AI_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw aiError('AI_MALFORMED_RESPONSE'); }
  } finally {
    // Cancellation must not extend the deadline if a transport ignores it.
    Promise.resolve(reader.cancel()).catch(() => {});
  }
}

/**
 * createGeminiProvider({env=process.env, fetchImpl=globalThis.fetch, timeoutMs=20000})
 * -> {configured, mode:'live', generate({system,contents,declarations,signal})}.
 * generate returns {content,toolCalls:[{id?,name,args}],text,modelUsed,usage,requestId}.
 * content is the original model turn (including thought signatures), to be echoed
 * unchanged before matching functionResponse parts. Missing usage is null.
 * Server configuration ONLY: GEMINI_API_KEY + AI_MODEL; no fallback model or URL.
 * One REST request per generate, no hidden retries. The orchestrator owns the
 * per-run 3-request/6-tool budget, including retries, and the total 20s deadline.
 * API reference: https://ai.google.dev/api/generate-content
 */
function createGeminiProvider({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = LIMITS.timeoutMs } = {}) {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.AI_MODEL;
  const configured = typeof apiKey === 'string' && apiKey.trim().length > 0 &&
    typeof model === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(model);
  return Object.freeze({
    configured,
    mode: 'live',
    async generate({ system, contents, declarations, signal }) {
      if (!configured) throw aiError('AI_NOT_CONFIGURED', 503);
      if (typeof system !== 'string' || !Array.isArray(contents) || !Array.isArray(declarations)) {
        throw aiError('AI_INVALID_REQUEST', 422);
      }
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] }, contents,
        tools: [{ functionDeclarations: declarations }],
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: declarations.map(tool => tool.name) } },
        generationConfig: { candidateCount: 1, maxOutputTokens: LIMITS.outputTokens }
      });
      if (Buffer.byteLength(body) > 100000) throw aiError('AI_CONTEXT_TOO_LARGE', 422);
      try {
        return await withDeadline(async boundedSignal => {
          const response = await abortable(() => fetchImpl(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              redirect: 'error', body, signal: boundedSignal }
          ), boundedSignal);
          if (!response.ok) {
            Promise.resolve(response.body?.cancel()).catch(() => {});
            throw aiError('AI_PROVIDER_HTTP', response.status === 429 ? 429 : 502,
              response.status === 429 || response.status >= 500);
          }
          const raw = await readJson(response, boundedSignal);
          const parsed = responseSchema.safeParse(raw);
          if (!parsed.success) throw aiError('AI_MALFORMED_RESPONSE');
          const candidate = parsed.data.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP') throw aiError('AI_INCOMPLETE_RESPONSE');
          // Preserve the exact provider turn, including opaque signed parts.
          const content = raw.candidates[0].content;
          const calls = content.parts.filter(part => part.functionCall).map(part => part.functionCall);
          if (calls.length > LIMITS.toolCalls) throw aiError('AI_TOOL_BUDGET');
          const ids = calls.filter(call => call.id !== undefined).map(call => call.id);
          if (new Set(ids).size !== ids.length) throw aiError('AI_DUPLICATE_CALL');
          const usage = usageSchema.safeParse(parsed.data.usageMetadata);
          return {
            content, toolCalls: calls,
            text: content.parts.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('\n'),
            modelUsed: parsed.data.modelVersion || model,
            requestId: parsed.data.responseId || null,
            usage: usage.success && Object.keys(usage.data).length ? usage.data : null
          };
        }, { signal, timeoutMs });
      } catch (error) {
        if (error.code?.startsWith('AI_')) throw error;
        throw aiError('AI_PROVIDER_NETWORK', 502, true);
      }
    }
  });
}

module.exports = { createGeminiProvider, LIMITS, aiError, abortable, withDeadline, checkSignal };
