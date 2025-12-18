# How to View Skills Engine Response

When you send a request to Skills Engine via Coordinator from the UI, you can see the response in **multiple places**:

## 1. **Backend Logs (Railway)** ✅

The backend logs the **full response** from Skills Engine. Look for these log entries:

### When Profile is Approved:
```
[EmployeeProfileApprovalController] ✅ Skills Engine response received:
[EmployeeProfileApprovalController] Response: {
  "user_id": "...",
  "competencies_count": 5,
  "relevance_score": 85,
  "has_gap": true,
  "full_response": { ... }
}
```

### When Employee Views Profile:
```
[GetEmployeeSkillsUseCase] ✅ Found stored skills in database, returning cached data
[GetEmployeeSkillsUseCase] Stored skills summary: {
  "employee_id": "...",
  "competencies_count": 5,
  "relevance_score": 85,
  ...
}
```

### Coordinator Response (Full Details):
```
[CoordinatorClient] Response data parsed: {
  "success": true,
  "data": {
    "response": {
      "user_id": "...",
      "competencies": [...],
      "relevance_score": 85
    }
  }
}
```

**Where to find:**
- Railway Dashboard → Your Directory Service → Logs
- Search for: `[EmployeeProfileApprovalController]` or `[GetEmployeeSkillsUseCase]` or `[CoordinatorClient]`

## 2. **Frontend Browser Console** ✅

Open your browser's Developer Tools (F12) and check the Console tab. You'll see:

```
[ProfileSkills] ===== SKILLS ENGINE RESPONSE =====
[ProfileSkills] Raw response: { ... }
[ProfileSkills] Extracted skills: { ... }
[ProfileSkills] Skills summary: {
  competencies_count: 5,
  relevance_score: 85,
  has_gap: true,
  user_id: "..."
}
[ProfileSkills] ===== END SKILLS ENGINE RESPONSE =====
```

**How to view:**
1. Open browser Developer Tools (F12 or Right-click → Inspect)
2. Go to "Console" tab
3. Filter by: `[ProfileSkills]` or `Skills Engine`

## 3. **Postman** ✅

Use the Postman template (`backend/scripts/postman-skills-engine-template.json`) to:
- See the exact request being sent
- See the full response from Skills Engine
- Test without going through the UI

**Steps:**
1. Import `backend/scripts/postman-skills-engine-template.json` into Postman
2. Update collection variables with your employee/company data
3. Generate signature using `generate-signature-for-request.js`
4. Send request
5. View response in Postman's response panel

## 4. **Test Script** ✅

Run the test script to see request/response:

```bash
node backend/scripts/test-skills-engine-request.js
```

This will:
- Show the exact payload being sent
- Display the full response from Skills Engine
- Generate a Postman template with signature

## Response Structure

The Skills Engine response typically looks like:

```json
{
  "user_id": "employee-uuid",
  "competencies": [
    {
      "name": "Skill Category",
      "nested_competencies": [
        {
          "name": "Sub-category",
          "skills": [
            {
              "name": "Python",
              "verified": true
            },
            {
              "name": "SQL",
              "verified": false
            }
          ]
        }
      ]
    }
  ],
  "relevance_score": 85,
  "gap": {
    "missing_skills": ["Docker", "Kubernetes"]
  }
}
```

## Tips

1. **Railway Logs**: If logs are truncated, look for the `[CoordinatorClient] Response data parsed:` line - it shows the full response
2. **Browser Console**: Use `console.table()` or expand objects to see nested data
3. **Filter Logs**: In Railway, filter by `Skills Engine` or `Coordinator` to find relevant logs
4. **Network Tab**: In browser DevTools → Network tab, you can see the API request/response

## Troubleshooting

**Can't see response in Railway?**
- Check if logs are being truncated (Railway has a 500 line limit)
- Look for the most recent log entries
- Search for specific employee ID or company ID

**Can't see response in browser?**
- Make sure Developer Tools Console is open
- Check if console is filtered (clear filters)
- Look for errors (red text) that might indicate the request failed

**Want to see raw response?**
- Use Postman or the test script
- Check `[CoordinatorClient] Response data parsed:` in Railway logs
- Check `[ProfileSkills] Raw response:` in browser console

