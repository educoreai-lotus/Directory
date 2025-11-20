# OpenAI Data Flow Summary

## Overview

This document provides a detailed breakdown of how OpenAI is used for employee profile enrichment, including:
- **Data sent to OpenAI** for each generation method
- **Exact prompts** constructed for each method
- **Where responses are stored** in the database

---

## 1. generateBio() - Professional Bio Generation

### Model Used
- **Model**: `gpt-4-turbo`
- **Max Tokens**: 500
- **Temperature**: 0.7

### Data Sent to OpenAI

#### From Employee Database (employeeBasicInfo)
- `full_name` - Employee's full name
- `current_role_in_company` - Current job role
- `target_role_in_company` - Target/desired job role (if different)

#### From LinkedIn Data (linkedin_data JSONB column)
**⚠️ IMPORTANT**: LinkedIn OAuth2 API has limited fields available. The following fields are included **if present**:

**Available via OpenID Connect (`openid`, `profile`, `email` scopes):**
- `id` - LinkedIn user ID
- `name` - Full name
- `given_name` - First name
- `family_name` - Last name
- `email` - Email address (if `email` scope granted)
- `picture` - Profile picture URL
- `locale` - Location/locale
- `email_verified` - Email verification status

**Available via Legacy API (`r_liteprofile` scope):**
- `headline` - Professional headline (if available with scopes)

**❌ NOT Available via OAuth2:**
- `summary` - Professional summary (NOT available via OAuth2)
- `positions` / `experience` / `workExperience` - Work history (NOT available via OAuth2)
- These fields require additional LinkedIn API products/permissions that are not part of standard OAuth2 flow

**Note**: The code checks for `positions`, `experience`, or `workExperience` arrays, but these will typically be empty/null since LinkedIn OAuth2 doesn't provide work history data.

**What LinkedIn OAuth2 Actually Provides:**

Based on `LinkedInAPIClient.js`, the actual fields fetched are:

**OpenID Connect (`openid`, `profile`, `email` scopes):**
```javascript
{
  id: "linkedin-user-id",
  name: "Full Name",
  given_name: "First Name",
  family_name: "Last Name",
  email: "email@example.com", // if 'email' scope granted
  picture: "https://...", // profile picture URL
  locale: "en-US",
  email_verified: true/false
}
```

**Legacy API (`r_liteprofile` scope):**
```javascript
{
  id: "linkedin-user-id",
  name: "Full Name",
  given_name: "First Name",
  family_name: "Last Name",
  headline: "Professional Headline", // if available with scopes
  picture: "https://...", // profile picture URL
  email: "email@example.com" // from separate email endpoint (if r_emailaddress scope)
}
```

**Fields NOT Available via OAuth2:**
- ❌ `summary` - Professional summary (requires additional LinkedIn API products)
- ❌ `positions` / `experience` / `workExperience` - Work history (requires additional LinkedIn API products)
- ❌ Company details, education, skills, etc.

**Impact on Bio Generation:**
Since LinkedIn OAuth2 provides limited data (mainly name, headline, email), the bio generation will rely more heavily on GitHub data (repositories, languages, contributions) to create a meaningful professional bio.

#### From GitHub Data (github_data JSONB column)
The following fields are included **if present**:
- `name` - GitHub display name
- `login` - GitHub username
- `bio` - GitHub bio
- `company` - Company from GitHub profile
- `location` - Location from GitHub
- `blog` - Website/blog URL
- `public_repos` - Number of public repositories
- `followers` - Number of followers
- `following` - Number of users following
- `repositories` - Array of repositories:
  - **Top 10 repositories** are included in detail
  - For each repository:
    - `name` or `full_name` - Repository name
    - `description` - Repository description
    - `language` - Primary programming language
    - `stars` or `stargazers_count` - Number of stars
    - `forks` or `forks_count` - Number of forks
    - `url` or `html_url` - Repository URL
    - `is_fork` or `fork` - Whether it's a forked repository
    - `topics` - Array of repository topics/tags

### Exact Prompt Structure

```
You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.

CONTEXT:
You are creating a professional bio for [full_name], who currently works as [current_role_in_company] [with career goals to transition to [target_role_in_company] if different].

LINKEDIN PROFILE DATA:
- Full Name: [name]
- First Name: [given_name]
- Last Name: [family_name]
- Email: [email] (if available)
- Location: [locale]
- Professional Headline: [headline] (if available with scopes)

**Note**: LinkedIn OAuth2 API does NOT provide:
- Professional Summary
- Work Experience/Positions
- These fields are typically empty/null in the data

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
  1. [repository name]
     Description: [description]
     Primary Language: [language]
     Stars: [stars]
     Forks: [forks]
     URL: [url]
     [Note: Forked repository if applicable]
     Topics: [topics]
  [Up to 10 repositories...]

TASK:
Your task is to create a professional, compelling bio that:
1. Synthesizes information from both LinkedIn (professional experience) and GitHub (technical expertise)
2. Highlights the employee's professional background, technical skills, and career trajectory
3. Connects their current role with their career goals (if target role is different)
4. Showcases their technical contributions and professional achievements

OUTPUT REQUIREMENTS:
- Write in third person using "[pronoun]" and "[possessive]" as the pronoun (e.g., "[name] is a...", "[Pronoun] has...", "[Pronoun] specializes in...")
- Length: 3-5 sentences, maximum 250 words
- Tone: Professional, confident, and engaging
- Content: Synthesize information from LinkedIn (basic profile info, headline) and GitHub (repositories, languages, contributions) to create a unique, personalized bio. Note: LinkedIn OAuth2 provides limited data (no work history or summary), so focus more on GitHub technical contributions.
- Style: Use active voice, specific achievements, technologies mentioned in repositories, and career progression
- Personalization: Make it unique to this person - reference specific technologies, projects, or experiences from their LinkedIn and GitHub data
- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles
- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting

Now generate a unique, professional bio specifically for [full_name]:
```

**Note**: Pronoun is automatically determined based on:
- First name patterns (female name endings: 'a', 'ia', 'ella', 'ette', 'ine', 'elle')
- LinkedIn `gender` field (if present)
- LinkedIn `pronouns` field (if present)

### Response Storage

**Database Table**: `employees`
- **Field**: `bio` (TEXT)
- **Also Updated**:
  - `enrichment_completed` = `TRUE`
  - `enrichment_completed_at` = Current timestamp
  - `profile_status` = `'enriched'`
  - `updated_at` = Current timestamp

---

## 2. generateProjectSummaries() - Project Summaries Generation

### Model Used
- **Model**: `gpt-3.5-turbo` (cheaper/faster for multiple repos)
- **Max Tokens**: 4000
- **Temperature**: 0.7

### Data Sent to OpenAI

#### From GitHub Data (github_data.repositories array)
For each repository (up to **20 repositories**), the following fields are included **if present**:
- `name` or `full_name` - Repository name
- `description` - Repository description
- `language` - Primary programming language
- `stars` or `stargazers_count` - Number of stars
- `forks` or `forks_count` - Number of forks
- `url` or `html_url` - Repository URL
- `created_at` - Creation date
- `updated_at` - Last update date
- `is_fork` or `fork` - Boolean indicating if it's a forked repository
- `is_private` - Boolean indicating if it's a private repository
- `topics` - Array of repository topics/tags

**Note**: Only the first **20 repositories** are processed (sorted as they appear in the array).

### Exact Prompt Structure

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
   [Type: Forked repository (contribution to existing project) if applicable]
   [Visibility: Private repository if applicable]
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

### Response Format Expected

OpenAI should return a JSON array:
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

### Response Storage

**Database Table**: `employee_project_summaries`
- **Fields**:
  - `employee_id` (UUID) - References `employees.id`
  - `repository_name` (VARCHAR(255)) - Repository name
  - `repository_url` (VARCHAR(500)) - Repository URL (from original GitHub data)
  - `summary` (TEXT) - AI-generated summary
  - `created_at` (TIMESTAMP) - Auto-generated

**Process**:
1. **Delete** all existing project summaries for the employee
2. **Insert** new project summaries (one row per repository)
3. **Upsert logic**: Uses `ON CONFLICT (employee_id, repository_name) DO UPDATE` to handle duplicates

---

## 3. generateValueProposition() - Value Proposition Generation

### Model Used
- **Model**: `gpt-4-turbo`
- **Max Tokens**: 300
- **Temperature**: 0.7

### Data Sent to OpenAI

#### From Employee Database (employeeBasicInfo)
- `full_name` - Employee's full name
- `current_role_in_company` - Current job role
- `target_role_in_company` - Target/desired job role (can be same as current role)

**Note**: This method **does NOT** use LinkedIn or GitHub data - only employee basic info from the database.

### Exact Prompt Structure

```
You are a professional HR and career development AI assistant specializing in creating value propositions for employee career progression.

CONTEXT:
You are creating a value proposition statement for [full_name].
- Current Role: [current_role_in_company]
- Target Role: [target_role_in_company] [or "Same as current role (no career progression planned)" if same]

TASK:
Create a professional, concise value proposition statement that:
1. States that [full_name] currently works as [current_role_in_company] in the company
2. States that [full_name] will be upgraded to work as [target_role_in_company] [or "Notes that [full_name] is continuing in their current role" if same]
3. Identifies what skills, knowledge, or experience [full_name] is missing to reach the target role [only if target role is different]
4. Is written in a professional, encouraging tone
5. Is suitable for display on an employee profile

OUTPUT REQUIREMENTS:
- Length: 2-3 sentences, maximum 150 words
- Format: Plain text, no markdown, no code blocks, no bullet points
- Tone: Professional, clear, and motivating
- Structure: Start with current role, mention target role (if different), then mention what's needed to get there
- Example format: "[full_name] currently works as [current_role_in_company] in the company. [full_name] will be upgraded to work as [target_role_in_company]. To achieve this transition, [full_name] needs to develop [specific skills/knowledge/experience]."

Now generate a value proposition statement for [full_name]:
```

### Response Storage

**Database Table**: `employees`
- **Field**: `value_proposition` (TEXT)
- **Also Updated** (same as bio):
  - `enrichment_completed` = `TRUE`
  - `enrichment_completed_at` = Current timestamp
  - `profile_status` = `'enriched'`
  - `updated_at` = Current timestamp

---

## Complete Data Flow Summary

### Input Data Sources

1. **Employee Table** (`employees`):
   - `full_name`
   - `current_role_in_company`
   - `target_role_in_company`
   - `linkedin_data` (JSONB) - Parsed and sent to `generateBio()`
   - `github_data` (JSONB) - Parsed and sent to `generateBio()` and `generateProjectSummaries()`

2. **Data Parsing**:
   - `linkedin_data` and `github_data` are stored as JSONB in PostgreSQL
   - They are parsed from JSON string if needed: `typeof data === 'string' ? JSON.parse(data) : data`

### Output Storage

1. **Bio** → `employees.bio` (TEXT)
2. **Value Proposition** → `employees.value_proposition` (TEXT)
3. **Project Summaries** → `employee_project_summaries` table (multiple rows)

### Enrichment Status Tracking

When all three OpenAI calls succeed:
- `employees.enrichment_completed` = `TRUE`
- `employees.enrichment_completed_at` = Current timestamp
- `employees.profile_status` = `'enriched'`

If any OpenAI call fails:
- Enrichment process **stops** (throws error)
- **No data is saved** (transaction is rolled back)
- `enrichment_completed` remains `FALSE`
- Employee can retry enrichment later

---

## Example: Sample Employee Data Flow

### Sample Employee Record

```sql
SELECT 
  id,
  full_name,
  current_role_in_company,
  target_role_in_company,
  linkedin_data,
  github_data
FROM employees
WHERE id = 'some-uuid';
```

**Example Data**:
- `full_name`: "John Smith"
- `current_role_in_company`: "Software Engineer"
- `target_role_in_company`: "Senior Software Engineer"
- `linkedin_data`: `{"id": "abc123", "name": "John Smith", "given_name": "John", "family_name": "Smith", "email": "john@example.com", "headline": "Software Engineer at Tech Corp", "locale": "en-US", "picture": "https://..."}`
  - **Note**: No `summary` or `positions` fields (not available via OAuth2)
- `github_data`: `{"login": "johnsmith", "repositories": [...], ...}`

### What Gets Sent to OpenAI

#### generateBio()
- **Employee**: "John Smith", "Software Engineer", "Senior Software Engineer"
- **LinkedIn**: Limited fields from `linkedin_data` JSONB (name, given_name, family_name, email, locale, headline, picture)
  - **Note**: No `summary` or `positions` (not available via OAuth2)
- **GitHub**: All fields from `github_data` JSONB (login, bio, top 10 repos, etc.)

#### generateProjectSummaries()
- **Repositories**: First 20 repositories from `github_data.repositories` array

#### generateValueProposition()
- **Employee**: "John Smith", "Software Engineer", "Senior Software Engineer"
- **No LinkedIn/GitHub data** used

### What Gets Stored

#### After Successful Enrichment

**employees table**:
```sql
UPDATE employees SET
  bio = 'AI-generated bio text...',
  value_proposition = 'AI-generated value proposition...',
  enrichment_completed = TRUE,
  enrichment_completed_at = '2025-01-20 10:30:00',
  profile_status = 'enriched'
WHERE id = 'some-uuid';
```

**employee_project_summaries table**:
```sql
INSERT INTO employee_project_summaries (employee_id, repository_name, repository_url, summary)
VALUES
  ('some-uuid', 'repo-1', 'https://github.com/...', 'AI-generated summary...'),
  ('some-uuid', 'repo-2', 'https://github.com/...', 'AI-generated summary...'),
  ...
```

---

## Verification Checklist

Before running enrichment, verify:

- [ ] Employee has `linkedin_data` JSONB populated (not null)
- [ ] Employee has `github_data` JSONB populated (not null)
- [ ] `linkedin_data` contains expected fields (name, headline, positions, etc.)
- [ ] `github_data` contains `repositories` array with repository data
- [ ] Employee has `full_name`, `current_role_in_company`, `target_role_in_company` set
- [ ] `OPENAI_API_KEY` is configured in Railway
- [ ] Database has `value_proposition` column (added via migration)
- [ ] `employee_project_summaries` table exists

---

**Last Updated**: 2025-01-20

