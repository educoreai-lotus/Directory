# AI Prompts Documentation

**Purpose**: Complete documentation of all AI prompts used in the Directory Service, including the exact prompts, fields sent, code locations, and model choices.

**Last Updated**: 2025-01-21

---

## Table of Contents

1. [Bio Generation Prompt](#1-bio-generation-prompt)
2. [Value Proposition Prompt](#2-value-proposition-prompt)
3. [Project Summaries Prompt](#3-project-summaries-prompt)
4. [AI Query Generation Prompt](#4-ai-query-generation-prompt)

---

## 1. Bio Generation Prompt

### Code Location
**File**: `backend/src/infrastructure/OpenAIAPIClient.js`  
**Method**: `buildBioPrompt()` (lines 308-432)  
**Called from**: `generateBio()` (lines 27-167)  
**Use Case**: `EnrichProfileUseCase.enrichProfile()` (line 93)

### AI Model
**Model**: `gpt-4-turbo`  
**Temperature**: `0.7`  
**Max Tokens**: `500`

### Why GPT-4-Turbo?
1. **Quality**: Bio is a critical profile component that needs high-quality, personalized content
2. **Context Understanding**: Needs to synthesize complex data from LinkedIn and GitHub
3. **Personalization**: Must create unique bios based on specific employee data
4. **Professional Tone**: Requires sophisticated language and professional writing

### Fields Sent to OpenAI

#### From `employeeBasicInfo`:
- `full_name` - Employee's full name
- `current_role_in_company` - Current job title
- `target_role_in_company` - Target job title (if different)
- `company_name` - Company name

#### From `linkedinData` (if available):
- `name` - Full name
- `given_name` - First name
- `family_name` - Last name
- `email` - Email address
- `locale` - Location
- `headline` - Professional headline
- `summary` - Professional summary
- `positions` / `experience` / `workExperience` - Array of work positions (up to 5):
  - `title` / `jobTitle` - Job title
  - `companyName` / `company` - Company name
  - `description` - Job description (first 200 chars)
  - `startDate` / `start_date` - Start date
  - `endDate` / `end_date` - End date

#### From `githubData` (if available):
- `name` - Name
- `login` - GitHub username
- `bio` - GitHub bio
- `company` - Company
- `location` - Location
- `blog` - Website
- `public_repos` - Number of public repositories
- `followers` - Number of followers
- `following` - Number of following
- `repositories` - Array of repositories (up to 10):
  - `name` / `full_name` - Repository name
  - `description` - Repository description
  - `language` - Primary programming language
  - `stars` / `stargazers_count` - Number of stars
  - `forks` / `forks_count` - Number of forks
  - `url` / `html_url` - Repository URL
  - `is_fork` / `fork` - Boolean if forked
  - `topics` - Array of topics/tags

### Complete Prompt Template

```
You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.

CONTEXT:
You are creating a professional bio for [full_name], who currently works as [current_role_in_company] at [company_name].

LINKEDIN PROFILE DATA:
- Full Name: [name]
- First Name: [given_name]
- Last Name: [family_name]
- Email: [email]
- Location: [locale]
- Professional Headline: [headline]
- Professional Summary: [summary]
- Work Experience ([count] position(s)):
  1. [title] at [companyName]
     Description: [description]
     Duration: [startDate] - [endDate]
  [Up to 5 positions...]

GITHUB PROFILE DATA:
- Name: [name]
- Username: [login]
- Bio: [bio]
- Company: [company]
- Location: [location]
- Website: [blog]
- Public Repositories: [public_repos]
- Followers: [followers]
- Following: [following]
- Total Repositories: [count]
- Top Repositories (showing technical expertise):
  1. [name]
     Description: [description]
     Primary Language: [language]
     Stars: [stars]
     Forks: [forks]
     URL: [url]
     Note: Forked repository [if applicable]
     Topics: [topics]
  [Up to 10 repositories...]

TASK:
Your task is to create a professional, compelling bio that:
1. Synthesizes information from both LinkedIn (professional experience) and GitHub (technical expertise)
2. Highlights the employee's professional background, technical skills, and past achievements
3. Describes their current role and responsibilities at [company_name]
4. Showcases their technical contributions and professional accomplishments

OUTPUT REQUIREMENTS:
- Write in third person using "[pronoun]" and "[possessive]" as the pronoun (e.g., "[name] is a...", "[Pronoun] has...", "[Pronoun] specializes in...")
- Length: 2-3 sentences, maximum 150 words (keep it concise and general)
- Tone: Professional, confident, and engaging
- Content: Provide a general overview synthesizing information from LinkedIn (basic profile info, headline) and GitHub (repositories, languages, contributions) to create a unique, personalized bio
- Style: Use active voice, keep it general and concise - avoid excessive detail
- Personalization: Make it unique to this person - reference key technologies or general expertise from their GitHub data, but keep it brief
- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles
- CRITICAL: Do NOT mention the employee's future goals, target role, growth steps, or what the company expects them to achieve. The Bio should ONLY describe their existing professional background, past experience, technical expertise, and current responsibilities. It should read like a professional summary of who they are — not where they are going.
- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting

Now generate a unique, professional bio specifically for [full_name]:
```

### Pronoun Detection Logic
The prompt includes logic to determine correct pronouns (he/she/they) based on:
- First name patterns (common female name endings)
- LinkedIn gender field (if available)
- LinkedIn pronouns field (if available)

---

## 2. Value Proposition Prompt

### Code Location
**File**: `backend/src/infrastructure/OpenAIAPIClient.js`  
**Method**: `buildValuePropositionPrompt()` (lines 619-668)  
**Called from**: `generateValueProposition()` (lines 495-614)  
**Use Case**: `EnrichProfileUseCase.enrichProfile()` (line 144)

### AI Model
**Model**: `gpt-4-turbo`  
**Temperature**: `0.7`  
**Max Tokens**: `300`

### Why GPT-4-Turbo?
1. **Strategic Content**: Value proposition requires strategic thinking about career progression
2. **Future-Focused**: Must articulate future potential and organizational impact
3. **Quality**: Critical profile component that needs sophisticated language
4. **Distinction**: Must clearly separate from Bio (past vs. future focus)

### Fields Sent to OpenAI

#### From `employeeBasicInfo`:
- `full_name` - Employee's full name
- `current_role_in_company` - Current job title
- `target_role_in_company` - Target job title (if different from current)
- `company_name` - Company name

**Note**: Value Proposition does NOT receive LinkedIn or GitHub data - it focuses only on role progression and company value.

### Complete Prompt Template

```
You are a professional HR and career development AI assistant specializing in creating value propositions for employee career progression.

CONTEXT:
You are creating a value proposition statement for [full_name].
- Company: [company_name]
- Current Role: [current_role_in_company]
- Target Role: [target_role_in_company] [or "Same as current role (no career progression planned)"]

TASK:
Create a professional, concise value proposition statement that:
1. Opens with a strategic contribution statement (e.g., "[Full_name] plays a key role in...", "In their current position at [company_name], [full_name] contributes to...", "[Full_name] supports the success of [company_name] through...") - do NOT start with "currently works as"
2. States that [full_name] will be upgraded to work as [target_role_in_company] [if target role is different]
   OR
   Notes that [full_name] is continuing in their current role [if target role is same]
3. Identifies what skills, knowledge, or experience [full_name] is missing to reach the target role [if target role is different]
   OR
   Explains the value [full_name] brings to [company_name] in their current role and their organizational impact [if target role is same]
4. Explains the value [full_name] brings to [company_name] and their potential impact in the target role [if target role is different]
5. Is written in a professional, encouraging tone
6. Is suitable for display on an employee profile

OUTPUT REQUIREMENTS:
- Length: 2-3 sentences, maximum 150 words
- Format: Plain text, no markdown, no code blocks, no bullet points
- Tone: Professional, clear, and motivating
- Structure: Start with a strategic contribution statement (not "currently works as"), mention target role (if different), then mention what's needed to get there and the value they bring
- Example format [if target role different]: "[full_name] plays a key role in [strategic area] at [company_name]. [full_name] will be upgraded to work as [target_role_in_company]. To achieve this transition, [full_name] needs to develop [specific skills/knowledge/experience]."
- Example format [if target role same]: "In their current position at [company_name], [full_name] contributes to [strategic area] and brings [value/impact] to the organization."
- CRITICAL: Do NOT repeat elements from the Bio such as career history, technical skills, GitHub details, or LinkedIn data. Do NOT describe the employee's background or responsibilities. The Value Proposition must focus ONLY on future potential, organizational impact, and the employee's development path — not their past. This section should describe their future trajectory inside the company and the value they bring to the organization.

Now generate a value proposition statement for [full_name]:
```

### Key Distinctions from Bio
- **Bio**: Past & present (background, experience, technical skills)
- **Value Proposition**: Future & company-specific value (career progression, organizational impact, development needs)

---

## 3. Project Summaries Prompt

### Code Location
**File**: `backend/src/infrastructure/OpenAIAPIClient.js`  
**Method**: `buildProjectSummariesPrompt()` (lines 438-488)  
**Called from**: `generateProjectSummaries()` (lines 174-302)  
**Use Case**: `EnrichProfileUseCase.enrichProfile()` (line 117)

### AI Model
**Model**: `gpt-3.5-turbo`  
**Temperature**: `0.7`  
**Max Tokens**: `4000`

### Why GPT-3.5-Turbo?
1. **Cost Efficiency**: Processing multiple repositories (up to 20) - cheaper model reduces costs
2. **Sufficient Quality**: Project summaries are less critical than bio/value proposition
3. **Speed**: Faster response time for batch processing
4. **Token Limit**: Higher max_tokens (4000) needed for multiple summaries

### Fields Sent to OpenAI

#### From `repositories` Array (up to 20 repositories):
For each repository:
- `name` / `full_name` - Repository name
- `description` - Repository description
- `language` - Primary programming language
- `stars` / `stargazers_count` - Number of stars
- `forks` / `forks_count` - Number of forks
- `url` / `html_url` - Repository URL
- `created_at` - Creation date
- `updated_at` - Last update date
- `is_fork` / `fork` - Boolean indicating if forked
- `is_private` - Boolean indicating if private
- `topics` - Array of topics/tags

### Complete Prompt Template

```
You are a technical documentation AI assistant specializing in creating clear, professional project summaries for software repositories.

CONTEXT:
You are creating project summaries for an employee's GitHub repositories to showcase their technical contributions and expertise.
These summaries will appear on the employee's professional profile.

REPOSITORY DATA:
1. [repository name]
   Description: [description]
   Primary Language: [language]
   Stars: [stars]
   Forks: [forks]
   URL: [url]
   Created: [created_at]
   Last Updated: [updated_at]
   Type: Forked repository (contribution to existing project) [if applicable]
   Visibility: Private repository [if applicable]
   Topics: [topics]
[Up to 20 repositories...]

TASK:
For EACH repository listed above, create a UNIQUE, concise, professional summary that:
1. Describes the SPECIFIC project's purpose and main functionality (use the repository description, language, and name to understand what it does)
2. Highlights the SPECIFIC technologies, frameworks, or tools used (mention the primary language and any frameworks if evident from the name/description)
3. Explains the business value or technical significance of THIS SPECIFIC project
4. For forked repositories, notes that it's a contribution to an existing project and what the contribution adds
5. Make each summary UNIQUE - do not use generic descriptions. Reference specific details from the repository data above

OUTPUT REQUIREMENTS:
- Return a valid JSON array with objects containing "repository_name" and "summary" fields
- Each summary: 2-3 sentences, maximum 200 words
- Tone: Professional, technical, and suitable for a work profile
- Content: Focus on what THIS SPECIFIC project does, why it matters, and key technologies used
- Uniqueness: Each summary must be different - reference the repository name, description, language, and other specific details
- Format: Valid JSON only, no markdown code blocks, no explanations, no additional text
- Example format: [{"repository_name": "project-name", "summary": "Unique professional description specific to this project..."}]

Now generate UNIQUE project summaries for each repository listed above:
```

### Expected Response Format
```json
[
  {
    "repository_name": "repo-name-1",
    "summary": "Professional summary text..."
  },
  {
    "repository_name": "repo-name-2",
    "summary": "Professional summary text..."
  }
]
```

### Response Processing
1. **Parse JSON** from OpenAI response (removes markdown code blocks if present)
2. **Map to repository URLs** by matching `repository_name` with original repository data
3. **Filter** entries that have both `repository_name` and `summary`

---

## 4. AI Query Generation Prompt

### Code Location
**File**: `backend/src/infrastructure/AIQueryGenerator.js`  
**Method**: `buildPrompt()` (lines 87-118)  
**Called from**: `generateQuery()` (lines 48-77)  
**Use Case**: `FillContentMetricsUseCase.execute()` (line 42)  
**Controller**: `UniversalEndpointController.handleRequest()`

### AI Model
**Model**: `gemini-1.5-flash` (Google Gemini)  
**API**: Google Generative AI SDK

### Why Gemini-1.5-Flash?
1. **Cost**: Free tier available (25 RPM, 250K TPM)
2. **Speed**: Fast response time for query generation
3. **SQL Generation**: Good at generating SQL queries from natural language
4. **Context Window**: Large context window allows including full database schema
5. **Alternative to OpenAI**: Reduces dependency on single AI provider

### Fields Sent to Gemini

#### From `payload` (Request payload from microservice):
- `service_id` - Microservice identifier
- `client_id` - Company/client UUID
- `request` - Request object containing:
  - `table` - Table name to query
  - `fields` - Fields to retrieve
  - `filters` - Filter conditions (e.g., `{ company_id: "uuid" }`)
  - `operation` - Operation type (e.g., "select")

#### From `responseTemplate` (Response structure to fill):
- Template object showing expected response structure
- Field names that need to be populated

#### From `migrationContent` (Database schema):
- Full content of `database/migrations/001_initial_schema.sql`
- Includes all table definitions, columns, relationships, constraints

### Complete Prompt Template

```
You are a SQL query generator for a PostgreSQL database. Your task is to generate a valid SQL query that will fill the response template based on the provided payload.

DATABASE SCHEMA:
[Full content of 001_initial_schema.sql - includes all tables, columns, relationships, constraints]

REQUESTER SERVICE: [requesterService]

PAYLOAD (input data):
[Full JSON payload object]

RESPONSE TEMPLATE (structure to fill):
[Full JSON response template object]

INSTRUCTIONS:
1. Analyze the payload to understand what data is being requested
2. Look at the response template to understand what fields need to be filled
3. Generate a PostgreSQL SELECT query that retrieves the necessary data
4. Map database columns to response template fields (e.g., user_id → employee_id, company_id → company_id)
5. Handle schema matching: Directory uses "employee_id" and "company_id", but other services might use "user_id" or "company_id"
6. If the payload contains filters (e.g., employee_id, company_id), use them in WHERE clauses
7. Return ONLY the SQL query, no explanations, no markdown formatting, just the raw SQL

IMPORTANT RULES:
- Use proper JOINs when needed (employees, companies, departments, teams, employee_roles, etc.)
- Use parameterized queries with $1, $2, etc. for values from payload
- Handle NULL values appropriately
- Use proper data types (UUID, VARCHAR, TEXT, JSONB, etc.)
- Return the query as a single line or properly formatted SQL

Generate the SQL query now:
```

### SQL Safety Validation
After generation, the query is validated:
- **Dangerous Keywords Blocked**: `DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `INSERT`, `UPDATE`
- **Must Start with SELECT**: Only SELECT queries are allowed
- **Parameterized Queries**: Uses `$1`, `$2`, etc. for SQL injection prevention

### Response Processing
1. **Extract SQL** from Gemini response (removes markdown code blocks, explanations)
2. **Validate SQL** for safety (no dangerous operations)
3. **Extract Parameters** from payload for parameterized query
4. **Execute Query** against PostgreSQL database
5. **Map Results** to response template structure

### Example Flow

**Input Payload**:
```json
{
  "service_id": "skills-engine",
  "client_id": "company-uuid",
  "request": {
    "table": "employees",
    "fields": ["id", "full_name", "email", "company_id"],
    "filters": { "company_id": "company-uuid" }
  }
}
```

**Generated SQL**:
```sql
SELECT id, full_name, email, company_id 
FROM employees 
WHERE company_id = $1;
```

**Parameters**: `["company-uuid"]`

---

## Summary Table

| Prompt Type | AI Model | Temperature | Max Tokens | Code Location | Why This Model |
|-------------|----------|-------------|------------|---------------|----------------|
| **Bio** | `gpt-4-turbo` | 0.7 | 500 | `OpenAIAPIClient.js:308-432` | High quality, personalized content |
| **Value Proposition** | `gpt-4-turbo` | 0.7 | 300 | `OpenAIAPIClient.js:619-668` | Strategic thinking, future-focused |
| **Project Summaries** | `gpt-3.5-turbo` | 0.7 | 4000 | `OpenAIAPIClient.js:438-488` | Cost-efficient for batch processing |
| **AI Query Generation** | `gemini-1.5-flash` | Default | N/A | `AIQueryGenerator.js:87-118` | Free tier, fast, good at SQL |

---

## API Configuration

### OpenAI Configuration
- **Base URL**: `https://api.openai.com/v1`
- **Endpoint**: `/chat/completions`
- **API Key**: `OPENAI_API_KEY` (from environment/config)
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout**: 30 seconds (60 seconds for project summaries)

### Gemini Configuration
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
- **Endpoint**: `/models/{model}:generateContent`
- **API Key**: `GEMINI_API_KEY` (from environment/config)
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout**: 30 seconds

---

## Field Mapping Summary

### Bio Generation
- **Input**: LinkedIn data + GitHub data + Employee basic info
- **Output**: Plain text bio (2-3 sentences, max 150 words)

### Value Proposition
- **Input**: Employee basic info only (no LinkedIn/GitHub)
- **Output**: Plain text value proposition (2-3 sentences, max 150 words)

### Project Summaries
- **Input**: GitHub repositories array (up to 20 repos)
- **Output**: JSON array of `{repository_name, summary}` objects

### AI Query Generation
- **Input**: Payload + Response template + Database schema
- **Output**: SQL SELECT query (parameterized)

---

## Notes

1. **No Fallback for Bio/Value Proposition**: These are critical and must succeed (no mock data fallback)
2. **Project Summaries**: Can be empty array if no repositories exist
3. **AI Query Generation**: Returns empty response template if generation fails
4. **Temperature 0.7**: Balanced between creativity and consistency
5. **Pronoun Detection**: Bio prompt includes logic to determine he/she/they based on name patterns
6. **Separation of Concerns**: Bio (past) vs. Value Proposition (future) - no overlap

