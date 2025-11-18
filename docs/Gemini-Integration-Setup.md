# Gemini AI Integration Setup Guide

This guide explains how to set up Google Gemini AI for employee profile enrichment.

**Last Updated**: Current session

---

## Overview

Gemini AI is used to generate:
- **Professional bio** from LinkedIn and GitHub profile data
- **Project summaries** for each GitHub repository

This enrichment happens **one-time only** after an employee connects both LinkedIn and GitHub accounts.

---

## 1. Get Gemini API Key

### Step 1: Go to Google AI Studio

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**

### Step 2: Create API Key

1. Select or create a Google Cloud project
2. Click **"Create API Key"**
3. Copy the API key (you'll only see it once)

**Important**: Keep your API key secure. Never commit it to Git.

---

## 2. Configure API Key in Railway

### Step 1: Add Environment Variable

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Click **"New Variable"**
4. Add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (paste the key you copied)
5. Click **"Add"**

### Step 2: Verify Configuration

After adding the variable, Railway will automatically redeploy. Check the logs:

```
[GeminiAPIClient] ✅ Gemini API key configured
```

If you see a warning instead:
```
[GeminiAPIClient] ⚠️  Gemini API key not configured.
```

- Check that the variable name is exactly `GEMINI_API_KEY`
- Verify the variable is set in Railway
- Check that the deployment completed successfully

---

## 3. API Endpoint and Model

### Endpoint
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

### Model
- **Model**: `gemini-pro`
- **API Version**: `v1beta`

### Authentication
- API key is passed as a query parameter: `?key=YOUR_API_KEY`

---

## 4. How It Works

### Bio Generation

**Trigger**: After both LinkedIn and GitHub OAuth connections are complete

**Input**:
- LinkedIn profile data (headline, summary, work experience)
- GitHub profile data (bio, repositories)
- Employee basic info (name, role)

**Output**: Professional bio (2-3 sentences)

**Example Prompt**:
```
Generate a professional, concise bio (2-3 sentences) for John Doe, who works as Software Engineer.

LinkedIn Profile Information:
- Headline: Senior Software Engineer
- Summary: Experienced developer with 5+ years...
- Work Experience: 3 position(s)

GitHub Profile Information:
- Bio: Full-stack developer
- Public Repositories: 15
- Total Repositories: 20

Requirements:
- Write in third person
- Keep it professional and concise (2-3 sentences)
- Focus on professional experience and technical expertise
- Do not include personal information or contact details
- Return only the bio text, no additional formatting or explanations
```

### Project Summaries Generation

**Trigger**: After both OAuth connections, if employee has GitHub repositories

**Input**: Array of GitHub repository objects (name, description, language, etc.)

**Output**: JSON array with repository summaries

**Example Prompt**:
```
Generate concise project summaries (1-2 sentences each) for the following GitHub repositories.

Repositories:
1. my-project - A web application built with React (JavaScript)
2. api-server - RESTful API server (Python)
...

Requirements:
- Return a JSON array with objects containing "repository_name" and "summary" fields
- Each summary should be 1-2 sentences describing what the project does
- Focus on the purpose and key technologies used
- Return only valid JSON, no markdown formatting or code blocks
```

---

## 5. Fallback to Mock Data

If Gemini API fails (network error, rate limit, invalid key, etc.), the system automatically falls back to mock data:

**Mock Bio**: Generic professional bio based on employee name and role

**Mock Project Summaries**: Basic summaries generated from repository metadata

**Location**: `/mockData/index.json`

---

## 6. Rate Limits and Best Practices

### Rate Limits

- **Free Tier**: 15 requests per minute (RPM)
- **Paid Tier**: Higher limits (check Google Cloud pricing)

### Best Practices

1. **One-Time Only**: Enrichment happens only once per employee
2. **Background Processing**: Enrichment runs in background (doesn't block OAuth callback)
3. **Error Handling**: Failures automatically fall back to mock data
4. **Timeout**: API calls have 30-second timeout
5. **Retry Logic**: Not implemented (falls back to mock data on first failure)

---

## 7. Testing

### Test with cURL

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Generate a professional bio for a software engineer named John Doe."
      }]
    }]
  }'
```

### Expected Response

```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "John Doe is a software engineer with expertise in..."
      }]
    }
  }]
}
```

---

## 8. Troubleshooting

### Issue: "Gemini API key not configured"

**Solution**:
1. Check Railway variables: `GEMINI_API_KEY` is set
2. Verify variable name is exactly `GEMINI_API_KEY` (case-sensitive)
3. Redeploy the service after adding the variable

### Issue: "Failed to generate bio" or "Failed to generate project summaries"

**Possible Causes**:
1. Invalid API key
2. Rate limit exceeded
3. Network error
4. API endpoint changed

**Solution**:
- Check Railway logs for detailed error messages
- Verify API key is valid in Google AI Studio
- System will automatically use mock data as fallback

### Issue: Enrichment not triggering

**Solution**:
1. Verify both LinkedIn and GitHub OAuth connections are complete
2. Check that `linkedin_data` and `github_data` are stored in database
3. Check Railway logs for enrichment errors
4. Manually trigger enrichment via API: `POST /api/v1/employees/:employeeId/enrich`

---

## 9. Environment Variables

### Required

```env
GEMINI_API_KEY=your_api_key_here
```

### Optional

```env
# Frontend URL (for redirects after enrichment)
FRONTEND_URL=https://your-frontend-url.com
```

---

## 10. Security Notes

1. **Never commit API keys to Git**
2. **Use Railway secrets** for production API keys
3. **Rotate keys** if exposed
4. **Monitor usage** in Google Cloud Console
5. **Set up billing alerts** if using paid tier

---

## 11. Cost Considerations

### Free Tier
- **15 requests per minute**
- **1,500 requests per day**
- Sufficient for testing and small deployments

### Paid Tier
- Pay per request (check current pricing)
- Higher rate limits
- Recommended for production with many employees

---

## 12. Related Documentation

- [Employee Profile Enrichment Flow](../docs/System-Knowledge.md)
- [OAuth Setup Guide](./LinkedIn-OAuth-Setup.md)
- [GitHub OAuth Setup Guide](./GitHub-OAuth-Setup.md)
- [API Interaction Rules](./API-Interaction-Rules.md)

---

## Summary

✅ **Setup Complete When**:
- `GEMINI_API_KEY` is set in Railway
- Logs show: `[GeminiAPIClient] ✅ Gemini API key configured`
- Enrichment triggers automatically after both OAuth connections
- Bio and project summaries are generated successfully

**Next Steps**:
1. Test enrichment with a real employee account
2. Verify bio and project summaries appear in employee profile
3. Monitor API usage in Google Cloud Console

---

## Support

If you encounter issues:
1. Check Railway logs for detailed error messages
2. Verify API key is valid in Google AI Studio
3. Test API key with cURL command above
4. Check fallback mock data is working if API fails

