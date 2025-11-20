# OpenAI Prompts and Data Fields

This document shows the exact prompts and data fields sent to OpenAI for bio and value proposition generation.

---

## 1. BIO GENERATION

### Model Used
- **Model**: `gpt-4-turbo`
- **Max Tokens**: 500
- **Temperature**: 0.7

### Data Fields Sent

#### From Employee Database (`employeeBasicInfo`)
```javascript
{
  full_name: "Robert Taylor",           // Employee's full name
  current_role_in_company: "Software Engineer",  // Current job role
  target_role_in_company: "Senior Software Engineer"  // Target/desired role
}
```

#### From LinkedIn Data (`linkedinData` - JSONB from `employees.linkedin_data`)
**Fields included IF present:**
- `name` - Full name
- `given_name` - First name
- `family_name` - Last name
- `email` - Email address
- `locale` - Location
- `headline` - Professional headline
- `summary` - Professional summary (if available, but typically NOT available via OAuth2)
- `positions` or `experience` or `workExperience` - Array of work positions (up to 5):
  - `title` or `jobTitle` - Job title
  - `companyName` or `company` - Company name
  - `description` - Job description (truncated to 200 chars)
  - `startDate` or `start_date` - Start date
  - `endDate` or `end_date` - End date (or "Current" if ongoing)

**Note**: LinkedIn OAuth2 typically only provides: `id`, `name`, `given_name`, `family_name`, `email`, `picture`, `locale`, `headline`. Work history (`positions`) is usually NOT available.

#### From GitHub Data (`githubData` - JSONB from `employees.github_data`)
**Fields included IF present:**
- `name` - GitHub display name
- `login` - GitHub username
- `bio` - GitHub bio
- `company` - Company from GitHub profile
- `location` - Location from GitHub
- `blog` - Website/blog URL
- `public_repos` - Number of public repositories
- `followers` - Number of followers
- `following` - Number of users following
- `repositories` - Array of repositories (top 10 included):
  - `name` or `full_name` - Repository name
  - `description` - Repository description
  - `language` - Primary programming language
  - `stars` or `stargazers_count` - Number of stars
  - `forks` or `forks_count` - Number of forks
  - `url` or `html_url` - Repository URL
  - `is_fork` or `fork` - Whether it's a forked repository
  - `topics` - Array of repository topics/tags

### Complete Bio Prompt

```
You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.

CONTEXT:
You are creating a professional bio for [full_name], who currently works as [current_role_in_company] [with career goals to transition to [target_role_in_company] if different].

LINKEDIN PROFILE DATA:
- Full Name: [name]
- First Name: [given_name]
- Last Name: [family_name]
- Email: [email]
- Location: [locale]
- Professional Headline: [headline]
- Professional Summary: [summary] (if available)
- Work Experience ([count] position(s)):
  1. [title] at [companyName]
     Description: [description (first 200 chars)]
     Duration: [startDate] - [endDate or "Current"]
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
- Length: 2-3 sentences, maximum 150 words (keep it concise and general)
- Tone: Professional, confident, and engaging
- Content: Provide a general overview synthesizing information from LinkedIn (basic profile info, headline) and GitHub (repositories, languages, contributions) to create a unique, personalized bio
- Style: Use active voice, keep it general and concise - avoid excessive detail
- Personalization: Make it unique to this person - reference key technologies or general expertise from their GitHub data, but keep it brief
- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles
- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting

Now generate a unique, professional bio specifically for [full_name]:
```

**Note**: Pronoun is automatically determined based on:
- First name patterns (female name endings: 'a', 'ia', 'ella', 'ette', 'ine', 'elle')
- LinkedIn `gender` field (if present)
- LinkedIn `pronouns` field (if present)

---

## 2. VALUE PROPOSITION GENERATION

### Model Used
- **Model**: `gpt-4-turbo`
- **Max Tokens**: 300
- **Temperature**: 0.7

### Data Fields Sent

#### From Employee Database ONLY (`employeeBasicInfo`)
```javascript
{
  full_name: "Robert Taylor",           // Employee's full name
  current_role_in_company: "Software Engineer",  // Current job role
  target_role_in_company: "Senior Software Engineer"  // Target/desired role
}
```

**Note**: Value Proposition does NOT use LinkedIn or GitHub data - only employee basic info from the database.

### Complete Value Proposition Prompt

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

---

## Example: Complete Data Flow

### For Bio Generation

**Input:**
```javascript
employeeBasicInfo = {
  full_name: "Robert Taylor",
  current_role_in_company: "Software Engineer",
  target_role_in_company: "Senior Software Engineer"
}

linkedinData = {
  id: "abc123",
  name: "Robert Taylor",
  given_name: "Robert",
  family_name: "Taylor",
  email: "robert@example.com",
  locale: "en-US",
  headline: "Software Engineer at Tech Corp",
  picture: "https://..."
  // Note: No summary or positions (not available via OAuth2)
}

githubData = {
  login: "roberttaylor",
  name: "Robert Taylor",
  bio: "Software engineer passionate about...",
  public_repos: 15,
  repositories: [
    {
      name: "my-project",
      description: "A web application...",
      language: "JavaScript",
      stars: 10,
      forks: 2,
      url: "https://github.com/roberttaylor/my-project",
      topics: ["react", "nodejs"]
    },
    // ... up to 10 repositories
  ]
}
```

**Prompt sent to OpenAI:**
```
You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.

CONTEXT:
You are creating a professional bio for Robert Taylor, who currently works as Software Engineer with career goals to transition to Senior Software Engineer.

LINKEDIN PROFILE DATA:
- Full Name: Robert Taylor
- First Name: Robert
- Last Name: Taylor
- Email: robert@example.com
- Location: en-US
- Professional Headline: Software Engineer at Tech Corp

GITHUB PROFILE DATA:
- Name: Robert Taylor
- Username: roberttaylor
- Bio: Software engineer passionate about...
- Public Repositories: 15
- Total Repositories: 15
- Top Repositories (showing technical expertise):
  1. my-project
     Description: A web application...
     Primary Language: JavaScript
     Stars: 10
     Forks: 2
     URL: https://github.com/roberttaylor/my-project
     Topics: react, nodejs
  [More repositories...]

TASK:
Your task is to create a professional, compelling bio that:
1. Synthesizes information from both LinkedIn (professional experience) and GitHub (technical expertise)
2. Highlights the employee's professional background, technical skills, and career trajectory
3. Connects their current role with their career goals (if target role is different)
4. Showcases their technical contributions and professional achievements

OUTPUT REQUIREMENTS:
- Write in third person using "he" and "his" as the pronoun (e.g., "Robert Taylor is a...", "He has...", "He specializes in...")
- Length: 2-3 sentences, maximum 150 words (keep it concise and general)
- Tone: Professional, confident, and engaging
- Content: Provide a general overview synthesizing information from LinkedIn (basic profile info, headline) and GitHub (repositories, languages, contributions) to create a unique, personalized bio
- Style: Use active voice, keep it general and concise - avoid excessive detail
- Personalization: Make it unique to this person - reference key technologies or general expertise from their GitHub data, but keep it brief
- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles
- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting

Now generate a unique, professional bio specifically for Robert Taylor:
```

### For Value Proposition Generation

**Input:**
```javascript
employeeBasicInfo = {
  full_name: "Robert Taylor",
  current_role_in_company: "Software Engineer",
  target_role_in_company: "Senior Software Engineer"
}
```

**Prompt sent to OpenAI:**
```
You are a professional HR and career development AI assistant specializing in creating value propositions for employee career progression.

CONTEXT:
You are creating a value proposition statement for Robert Taylor.
- Current Role: Software Engineer
- Target Role: Senior Software Engineer

TASK:
Create a professional, concise value proposition statement that:
1. States that Robert Taylor currently works as Software Engineer in the company
2. States that Robert Taylor will be upgraded to work as Senior Software Engineer
3. Identifies what skills, knowledge, or experience Robert Taylor is missing to reach the target role
4. Is written in a professional, encouraging tone
5. Is suitable for display on an employee profile

OUTPUT REQUIREMENTS:
- Length: 2-3 sentences, maximum 150 words
- Format: Plain text, no markdown, no code blocks, no bullet points
- Tone: Professional, clear, and motivating
- Structure: Start with current role, mention target role (if different), then mention what's needed to get there
- Example format: "Robert Taylor currently works as Software Engineer in the company. Robert Taylor will be upgraded to work as Senior Software Engineer. To achieve this transition, Robert Taylor needs to develop [specific skills/knowledge/experience]."

Now generate a value proposition statement for Robert Taylor:
```

---

## Summary

### Bio Generation
- **Uses**: Employee info + LinkedIn data + GitHub data
- **Focus**: Professional overview combining LinkedIn and GitHub information
- **Length**: 2-3 sentences, max 150 words
- **Pronoun**: Automatically determined from name patterns

### Value Proposition
- **Uses**: Employee info ONLY (no LinkedIn/GitHub)
- **Focus**: Career progression and skill gaps
- **Length**: 2-3 sentences, max 150 words
- **Content**: Current role → Target role → Missing skills

---

**Last Updated**: 2025-01-20

