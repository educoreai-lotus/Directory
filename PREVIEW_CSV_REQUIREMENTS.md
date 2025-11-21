# Preview: New CSV File Requirements Format

## How it will look in the UI:

---

### **CSV File Requirements**

#### **1. File Structure**
- **Row 1** → Company settings
- **Rows 2+** → Employees only

---

#### **2. Column Order**
```
company_name, industry, logo_url, approval_policy, kpis, passing_grade, max_attempts, exercises_limited, num_of_exercises, learning_path_approval, employee_id, full_name, email, role_type, department_id, department_name, team_id, team_name, manager_id, password, current_role_in_company, target_role_in_company, preferred_language, status, ai_enabled, public_publish_enable
```

---

#### **3. Row 1 – Company Settings**

| Field | Description |
|-------|-------------|
| **company_name** | Company name |
| **industry** | Company industry |
| **logo_url** | Company logo URL |
| **approval_policy** | `manual` / `auto` |
| **kpis** | Split by `;` (semicolon) |
| **passing_grade** | 0–100 |
| **max_attempts** | Maximum attempts |
| **exercises_limited** | `true` / `false` |
| **num_of_exercises** | Required when `exercises_limited = true` |
| **learning_path_approval** | Alternative to `approval_policy` |

**Note:** If `approval_policy = manual` → state one `DECISION_MAKER`

---

#### **4. Rows 2+ – Employee Records (Mandatory per employee)**

**Required Fields:**
- `employee_id`
- `full_name`
- `email`
- `role_type`
- `department_id`, `department_name`
- `team_id`, `team_name`
- `manager_id` (could be empty)
- `password`
- `current_role_in_company`
- `target_role_in_company`
- `preferred_language`
- `status`

**Only for TRAINERS:**
- `ai_enabled`
- `public_publish_enable`

---

#### **5. Role Rules (Short & Important)**

**BASE ROLE:**
- `REGULAR_EMPLOYEE` or `TRAINER`

**Addition:**
- `TEAM_MANAGER` / `DEPARTMENT_MANAGER` / `DECISION_MAKER`

**✅ Valid Examples:**
- `REGULAR_EMPLOYEE`
- `TRAINER`
- `REGULAR_EMPLOYEE + TEAM_MANAGER`
- `REGULAR_EMPLOYEE + DEPARTMENT_MANAGER + DECISION_MAKER`

**❌ Not Valid:**
- `TEAM_MANAGER` (missing base role)
- `DEPARTMENT_MANAGER + DECISION_MAKER` (missing base role)

---

#### **6. File Size**
**MAX 10MB**

---

## Visual Styling:
- Clean numbered sections (1-6)
- Clear headings with bold text
- Table format for Row 1 fields
- Bullet points for employee fields
- Valid/Invalid examples with checkmarks and X marks
- Code-style formatting for field names and values
- Proper spacing and indentation for readability

