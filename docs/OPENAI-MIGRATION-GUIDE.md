# OpenAI Migration Guide

## Overview

The system has been migrated from Google Gemini API to OpenAI API for all AI generation tasks (bio, project summaries, value proposition).

---

## Changes Made

### 1. New OpenAIAPIClient Created
- **File**: `backend/src/infrastructure/OpenAIAPIClient.js`
- **Replaces**: `GeminiAPIClient.js` (kept for reference, but no longer used)
- **Models Used**:
  - `gpt-4-turbo-preview` for bio generation
  - `gpt-4-turbo-preview` for value proposition generation
  - `gpt-3.5-turbo` for project summaries (cheaper/faster for multiple repos)

### 2. Updated EnrichProfileUseCase
- **File**: `backend/src/application/EnrichProfileUseCase.js`
- **Changes**:
  - Replaced `GeminiAPIClient` with `OpenAIAPIClient`
  - Updated all log messages from "Gemini" to "OpenAI"
  - All error messages now reference "OpenAI enrichment failed"

### 3. Updated Configuration
- **File**: `backend/src/config.js`
- **Added**: `openai.apiKey` configuration
- **Kept**: `gemini.apiKey` for backward compatibility (not used)

---

## Manual Steps Required

### 1. Set OpenAI API Key in Railway

**Action Required:**
1. Go to Railway dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Add new environment variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-...`)
5. Save and redeploy

**Important**: The API key must have access to:
- `gpt-4-turbo` model (or `gpt-4-turbo-preview` if `gpt-4-turbo` is not available)
- `gpt-3.5-turbo` model

### 2. Verify API Key Access

**Check in OpenAI Dashboard:**
1. Go to https://platform.openai.com/api-keys
2. Verify your API key is active
3. Check billing/quota limits:
   - Ensure you have sufficient credits
   - Check rate limits (requests per minute)
   - Verify model access (gpt-4-turbo and gpt-3.5-turbo)

### 3. Test Enrichment Flow

**After deployment:**
1. Test with a real employee who has LinkedIn + GitHub connected
2. Check Railway logs for:
   - `[OpenAIAPIClient] ✅ OpenAI API key configured`
   - `[OpenAIAPIClient] ========== GENERATING BIO ==========`
   - `[OpenAIAPIClient] ========== API REQUEST ==========`
   - `[OpenAIAPIClient] ========== API RESPONSE ==========`
   - `[EnrichProfileUseCase] ✅✅✅ ALL OPENAI ENRICHMENT SUCCEEDED ✅✅✅`

### 4. Verify No Errors

**Check logs for:**
- ❌ NO "OpenAI API key not configured" errors
- ❌ NO "OpenAI enrichment failed" errors
- ✅ "OpenAI API key configured" message on startup
- ✅ Successful API responses with status 200

---

## API Differences

### Request Format

**Gemini (Old):**
```json
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}
{
  "contents": [{
    "parts": [{
      "text": "prompt"
    }]
  }]
}
```

**OpenAI (New):**
```json
POST https://api.openai.com/v1/chat/completions
Headers: {
  "Authorization": "Bearer {API_KEY}",
  "Content-Type": "application/json"
}
{
  "model": "gpt-4-turbo-preview",
  "messages": [{
    "role": "user",
    "content": "prompt"
  }],
  "temperature": 0.7,
  "max_tokens": 500
}
```

### Response Format

**Gemini (Old):**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "generated text"
      }]
    }
  }]
}
```

**OpenAI (New):**
```json
{
  "choices": [{
    "message": {
      "content": "generated text"
    }
  }]
}
```

---

## Model Selection

### Bio Generation
- **Model**: `gpt-4-turbo`
- **Reason**: Higher quality output for professional bios
- **Max Tokens**: 500
- **Temperature**: 0.7

### Project Summaries
- **Model**: `gpt-3.5-turbo`
- **Reason**: Cheaper and faster for multiple repositories
- **Max Tokens**: 4000
- **Temperature**: 0.7

### Value Proposition
- **Model**: `gpt-4-turbo`
- **Reason**: Higher quality for career progression text
- **Max Tokens**: 300
- **Temperature**: 0.7

---

## Error Handling

### Rate Limits
- **Detection**: Status 429 or error message contains "rate limit", "quota", "insufficient_quota", "billing"
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Logging**: Full error details including model used and API key plan info

### API Failures
- **No Fallback**: If OpenAI fails, enrichment fails explicitly (no mock data)
- **Error Message**: "OpenAI enrichment failed: [component] generation failed"
- **Enrichment Status**: `enrichment_completed` remains `false` (allows re-enrichment)

---

## Cost Considerations

### GPT-4 Turbo Pricing (Approximate)
- **Input**: ~$10 per 1M tokens
- **Output**: ~$30 per 1M tokens
- **Used for**: Bio and Value Proposition

### GPT-3.5 Turbo Pricing (Approximate)
- **Input**: ~$0.50 per 1M tokens
- **Output**: ~$1.50 per 1M tokens
- **Used for**: Project Summaries (cheaper for multiple repos)

### Estimated Cost per Enrichment
- **Bio**: ~$0.01-0.02 (GPT-4 Turbo, ~500 tokens)
- **Value Proposition**: ~$0.005-0.01 (GPT-4 Turbo, ~300 tokens)
- **Project Summaries**: ~$0.01-0.05 (GPT-3.5 Turbo, depends on repo count)
- **Total**: ~$0.025-0.08 per employee enrichment

---

## Testing Checklist

- [ ] OpenAI API key set in Railway (`OPENAI_API_KEY`)
- [ ] Backend restarted and logs show "OpenAI API key configured"
- [ ] Test enrichment with real employee data
- [ ] Verify bio generation succeeds
- [ ] Verify project summaries generation succeeds
- [ ] Verify value proposition generation succeeds
- [ ] Check logs for full request/response details
- [ ] Verify `enrichment_completed = true` in database
- [ ] Verify employee profile displays bio, summaries, and value proposition
- [ ] Test error handling (if API key invalid, should fail explicitly)

---

## Rollback Plan

If OpenAI migration causes issues:

1. **Temporary**: Revert `EnrichProfileUseCase.js` to use `GeminiAPIClient`
2. **Set**: `GEMINI_API_KEY` in Railway (if not already set)
3. **Redeploy**: Backend will use Gemini again

**Note**: GeminiAPIClient.js is still in the codebase but not used. Can be re-enabled by changing the import in EnrichProfileUseCase.js.

---

## Support

If you encounter issues:

1. **Check Railway logs** for OpenAI API errors
2. **Verify API key** is correct and has billing/quota
3. **Check OpenAI dashboard** for usage and rate limits
4. **Verify model access** (gpt-4-turbo-preview and gpt-3.5-turbo)

---

**Last Updated**: 2025-01-20

