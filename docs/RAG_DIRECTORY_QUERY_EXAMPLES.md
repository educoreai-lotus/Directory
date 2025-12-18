# RAG Directory Service Query Examples (RBAC-Aware)

This document provides examples of questions **employees** can ask RAG about **their own profile and general organizational information**. 

**⚠️ RBAC Note:** Employees can only query their own data, not other employees' information.

## How RAG Recognizes Directory Queries

RAG identifies Directory-related queries by detecting keywords in the user's question:
- **Company/Companies** - Triggers company information queries (general info only)
- **Employee/My Profile/My Information** - Triggers employee's own profile queries
- **Department/Departments** - Triggers department information queries (general structure)
- **Team/Teams** - Triggers team information queries (teams employee belongs to)

The Directory service uses the `user_id` from the request context to ensure employees only access their own data.

---

## 📋 Example Questions by Category (Employee Self-Service)

### 👤 My Profile Information

**Questions employees can ask about THEIR OWN profile:**

1. **Basic Profile Info:**
   - "What is my profile information?"
   - "Show me my employee profile"
   - "Tell me about my profile"
   - "What is my current role?"
   - "What is my target role?"
   - "What is my employee ID?"

2. **Profile Status:**
   - "What is my profile status?"
   - "Is my profile approved?"
   - "Has my profile been enriched?"
   - "What is the status of my profile enrichment?"

3. **My Roles:**
   - "What roles do I have?"
   - "Am I a trainer?"
   - "Am I a team manager?"
   - "What are my roles in the company?"

4. **My Teams:**
   - "What teams do I belong to?"
   - "Which teams am I part of?"
   - "Show me my teams"
   - "What is my team?"

5. **My Details:**
   - "What is my preferred language?"
   - "What is my email address?"
   - "Show me my bio"
   - "What is my value proposition?"
   - "When was my profile enriched?"

6. **My Status:**
   - "Am I an active employee?"
   - "What is my employment status?"

---

### 🏢 Company Information (General/Public)

**Questions about the company (general information only):**

1. **Basic Company Info:**
   - "What is my company name?"
   - "What company do I work for?"
   - "What industry is my company in?"
   - "What is the company domain?"

2. **Company Settings (Public):**
   - "What is our company's approval policy?"
   - "What is the passing grade for assessments?"
   - "How many assessment attempts are allowed?"
   - "Are exercises limited in assessments?"

3. **HR Contact:**
   - "Who is the HR contact?"
   - "What is the HR email address?"
   - "Who should I contact in HR?"
   - "How can I reach HR?"

4. **Company Status:**
   - "Is my company verified?"
   - "What is the company verification status?"

---

### 🏛️ Department Information (General Structure)

**Questions about departments (organizational structure):**

1. **Department List:**
   - "What departments exist in my company?"
   - "List all departments"
   - "Show me the departments in my company"
   - "What are the company departments?"

2. **My Department:**
   - "What department do I belong to?"
   - "Which department am I in?"
   - "Tell me about my department"

---

### 👥 Team Information (My Teams)

**Questions about teams (teams the employee belongs to):**

1. **My Teams:**
   - "What teams do I belong to?"
   - "Which teams am I part of?"
   - "Show me my teams"
   - "What is my team name?"
   - "Tell me about my team"

2. **Team Structure:**
   - "What department does my team belong to?"
   - "Which department is my team under?"

---

### 📊 Organizational Overview (Public Statistics)

**Questions about organizational structure (public info only):**

1. **General Questions:**
   - "How many employees are in my company?"
   - "How many departments are there?"
   - "How many teams are in the company?"
   - "What is the company size?"

2. **Organizational Structure:**
   - "Give me an overview of the organization"
   - "What is the organizational structure?"
   - "Show me organizational statistics"

---

## 🎯 Best Practices for Employees

### ✅ Good Questions (Will Work - Self-Service):

- **Ask about yourself:** "What is my profile?" ✅
- **Use keywords:** "What teams do I belong to?" ✅
- **Ask about your company:** "What is my company name?" ✅
- **Request your details:** "What is my current role?" ✅
- **Check your status:** "Is my profile approved?" ✅

### ❌ Questions That Won't Work (RBAC Restricted):

- **Other employees:** "Show me all employees" ❌ (RBAC: Can't see other employees)
- **Other people's profiles:** "Tell me about employee John Doe" ❌ (RBAC: Can only see own profile)
- **Sensitive company data:** "Show me all employee salaries" ❌ (Not available in Directory)
- **Too vague:** "Tell me everything" ❌ (RAG might not know what to query)
- **No keywords:** "Show me stuff" ❌ (No Directory keywords detected)
- **Wrong service:** "What courses are available?" ❌ (This is for Course Builder, not Directory)

---

## 🔍 How RAG Routes to Directory (RBAC-Enforced)

When an employee asks a question:

1. **RAG analyzes the question** for keywords (company, employee, department, team)
2. **RAG identifies** this as a Directory-related query
3. **RAG sends request** to Coordinator with:
   - `target_service: "directory-service"`
   - `payload.query: "user's question"`
   - `tenant_id: "company_id"` (from user context)
   - `user_id: "employee_id"` (from authenticated user context) ⚠️ **RBAC Key**
4. **Coordinator routes** to Directory service via GRPC
5. **Directory processes** the query and **enforces RBAC**:
   - If query is about "my profile" → Returns only the requesting employee's data
   - If query is about company/departments/teams → Returns general/public info only
   - If query tries to access other employees → Returns empty or error
6. **RAG formats** the response for the user

---

## 📝 Example Conversation Flows (RBAC-Aware)

### Example 1: Employee Asking About Own Profile

**Employee:** "What is my profile status?"

**RAG Processing:**
1. Detects keyword: "profile" (related to employee)
2. Detects "my" → Self-service query
3. Identifies service: Directory
4. Sends query: `{ query: "my profile status", tenant_id: "company-uuid", user_id: "employee-uuid" }`

**Directory Response (RBAC-Enforced):**
```json
{
  "data": [
    {
      "employee_id": "employee-uuid",
      "full_name": "Jasmine Mograby",
      "profile_status": "approved",
      "enrichment_completed": true,
      "current_role_in_company": "Software Engineer",
      "roles": ["REGULAR_EMPLOYEE", "TRAINER"],
      ...
    }
  ]
}
```

**RAG Response to Employee:**
"Your profile status is **approved**. Your profile has been enriched and you are currently a Software Engineer with roles: Regular Employee and Trainer."

---

### Example 2: Employee Asking About Own Teams

**Employee:** "What teams do I belong to?"

**RAG Processing:**
1. Detects keyword: "teams" + "I" → Self-service query
2. Identifies service: Directory
3. Sends query: `{ query: "my teams", tenant_id: "company-uuid", user_id: "employee-uuid" }`

**Directory Response:**
```json
{
  "data": [
    {
      "employee_id": "employee-uuid",
      "teams": [
        {
          "id": "...",
          "team_id": "DEV-001",
          "team_name": "Frontend Development Team"
        }
      ],
      ...
    }
  ]
}
```

**RAG Response to Employee:**
"You belong to the **Frontend Development Team** (DEV-001)."

---

### Example 3: Employee Asking About Company (General Info)

**Employee:** "What is my company name?"

**RAG Processing:**
1. Detects keyword: "company"
2. Identifies service: Directory
3. Sends query: `{ query: "company name", tenant_id: "company-uuid", user_id: "employee-uuid" }`

**Directory Response:**
```json
{
  "data": [
    {
      "company_id": "company-uuid",
      "company_name": "Lotus techhub",
      "industry": "Technology",
      "domain": "lotustechhub.com",
      ...
    }
  ]
}
```

**RAG Response to Employee:**
"Your company is **Lotus techhub** in the Technology industry (lotustechhub.com)."

---

## 🚀 Advanced Self-Service Queries

### Query About Own Profile with Details:
- "What is my current role and target role?"
- "Show me my profile including my bio and value proposition"
- "What is my employee ID and email?"

### Query About Own Company Context:
- "What is my company and which department am I in?"
- "Tell me about my company and my team"
- "What is my company's approval policy and my profile status?"

### Combined Self-Service Queries:
- "What is my role, teams, and profile status?"
- "Show me my profile information and company details"

---

## 💡 Tips for Better Results (Employee Self-Service)

1. **Use "my" or "I":** Ask about YOUR data: "What is MY profile?" not "Show all employees"
2. **Use clear keywords:** Mention "my profile", "my company", "my team", or "my department"
3. **Be specific:** Ask for specific information: "What is my current role?" not "tell me everything"
4. **Use natural language:** RAG understands natural questions: "What teams do I belong to?"
5. **Focus on yourself:** You can only query your own profile and general company information
6. **Ask about status:** "Is my profile approved?" "What is my profile status?"

---

## 🔗 Related Services

- **Skills Engine:** For employee skills and competencies (query: "What are my skills?")
- **Learner AI:** For learning paths and career progression (query: "What is my learning path?")
- **Course Builder:** For available courses and content (query: "What courses are available?")
- **Assessment:** For assessment results and scores (query: "What are my assessment results?")

**Directory is specifically for:**
- ✅ Your own employee profile information
- ✅ General company information (public)
- ✅ Organizational structure (departments, teams - general info)
- ❌ Other employees' profiles (RBAC restricted)
- ❌ Sensitive company data (not available)

---

## 🔒 RBAC Summary

**What Employees CAN Query:**
- ✅ Their own profile (status, roles, teams, bio, etc.)
- ✅ General company information (name, domain, HR contact, settings)
- ✅ Organizational structure (departments, teams - general list)
- ✅ Their own teams and departments

**What Employees CANNOT Query:**
- ❌ Other employees' profiles
- ❌ Other employees' personal information
- ❌ Other employees' roles or teams
- ❌ Sensitive company data (salaries, private settings, etc.)

**RBAC is enforced by the Directory service using the `user_id` from the authenticated request context.**

