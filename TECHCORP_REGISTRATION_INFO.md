# TechCorp Global - Company Registration Information

## Company Registration Form Fields

Use these details when registering TechCorp Global:

### Company Information
- **Company Name:** `TechCorp Global`
- **Industry:** `Software Development`
- **Company Domain:** `techcorp.global`

### HR Contact Information
- **HR Contact Name:** `Jennifer Martinez`
- **HR Contact Email:** `jennifer.martinez@techcorp.global`
- **HR Contact Role:** `HR Manager` or `Marketing Manager` (she's the Marketing Department Manager)

**Alternative HR Contact (if you prefer):**
- **HR Contact Name:** `Daniel White`
- **HR Contact Email:** `daniel.white@techcorp.global`
- **HR Contact Role:** `Support Manager` (he's the Support Department Manager)

## Registration Flow

1. **Fill Company Registration Form** with the information above
2. **Submit** → Company will be created
3. **Upload CSV** → Use `test_company_techcorp_global.csv`
4. **Verify** → Check Railway logs for Learner AI notification

## Expected Learner AI Notification

After registration, Directory should send to Coordinator:

```json
{
  "requester_service": "directory",
  "payload": {
    "action": "sending_new_decision_maker",
    "company_id": "<generated-uuid>",
    "company_name": "TechCorp Global",
    "approval_policy": "manual",
    "decision_maker": {
      "employee_id": "<robert-brown-uuid>",
      "employee_name": "Robert Brown",
      "employee_email": "robert.brown@techcorp.global"
    }
  },
  "response": {}
}
```

**Note:** The decision_maker will be Robert Brown (TC006) since he has the `DECISION_MAKER` role in the CSV.

