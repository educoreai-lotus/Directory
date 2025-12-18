# AI Enrichment Prompt - All 4 Data Sources

This document shows the complete AI prompt used for profile enrichment, demonstrating how all 4 data sources (LinkedIn, GitHub, CV PDF, Manual Form) are incorporated.

---

## Prompt Structure

The prompt is built in `backend/src/infrastructure/OpenAIAPIClient.js` in the `buildBioPrompt()` method.

---

## Complete Prompt Example

```
You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.

CONTEXT:
You are creating a professional bio for [Employee Name], who currently works as [Current Role] at [Company Name].

LINKEDIN PROFILE DATA:
- Full Name: [Name]
- First Name: [Given Name]
- Last Name: [Family Name]
- Email: [Email]
- Location: [Locale]
- Professional Headline: [Headline]
- Professional Summary: [Summary]
- Work Experience (X position(s)):
  1. [Position Title] at [Company Name]
     Description: [Description]
     Duration: [Start Date] - [End Date]
  ...

GITHUB PROFILE DATA:
- Name: [Name]
- Username: [Login]
- Bio: [Bio]
- Company: [Company]
- Location: [Location]
- Website: [Blog]
- Public Repositories: [Count]
- Followers: [Count]
- Following: [Count]
- Total Repositories: [Count]
- Top Repositories (showing technical expertise):
  1. [Repository Name]
     Description: [Description]
     Primary Language: [Language]
     Stars: [Count]
     Forks: [Count]
     URL: [URL]
     Topics: [Topics]
  ...

WORK EXPERIENCE (from CV PDF or Manual Form):
- [Work Experience Entry 1]
- [Work Experience Entry 2]
  ...

SKILLS (from CV PDF or Manual Form):
- [Skill 1], [Skill 2], [Skill 3], ...

EDUCATION (from CV PDF or Manual Form):
- [Education Entry 1]
- [Education Entry 2]
  ...

TASK:
Your task is to create a professional, compelling bio that:
1. Synthesizes information from all available sources (LinkedIn professional experience, GitHub technical expertise, CV PDF data, and Manual form data)
2. Highlights the employee's professional background, technical skills, and past achievements
3. Describes their current role and responsibilities at [Company Name]
4. Showcases their technical contributions and professional accomplishments

OUTPUT REQUIREMENTS:
- Write in third person using "[pronoun]" and "[possessive]" as the pronoun (e.g., "[Name] is a...", "[Pronoun] has...", "[Pronoun] specializes in...")
- Length: 2-3 sentences, maximum 150 words (keep it concise and general)
- Tone: Professional, confident, and engaging
- Content: Provide a general overview synthesizing information from LinkedIn (basic profile info, headline) and GitHub (repositories, languages, contributions) to create a unique, personalized bio
- Style: Use active voice, keep it general and concise - avoid excessive detail
- Personalization: Make it unique to this person - reference key technologies or general expertise from their GitHub data, but keep it brief
- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles
- CRITICAL: Do NOT mention the employee's future goals, target role, growth steps, or what the company expects them to achieve. The Bio should ONLY describe their existing professional background, past experience, technical expertise, and current responsibilities. It should read like a professional summary of who they are — not where they are going.
- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting

Now generate a unique, professional bio specifically for [Employee Name]:
```

---

## Data Source Integration

### 1. LinkedIn Data ✅
- **Source**: `linkedinData` parameter
- **Fields Used**:
  - Name, email, location
  - Professional headline and summary
  - Work experience/positions (up to 5)
  - Each position includes: title, company, description, duration

### 2. GitHub Data ✅
- **Source**: `githubData` parameter
- **Fields Used**:
  - Profile info (name, username, bio, company, location)
  - Repository statistics (public repos, followers, following)
  - Top repositories (up to 10) with:
    - Name, description, language
    - Stars, forks, URL
    - Topics and fork status

### 3. CV PDF Data ✅
- **Source**: `mergedData.work_experience`, `mergedData.skills`, `mergedData.education`
- **Fields Used**:
  - Work experience (up to 5 entries)
  - Skills (up to 20 skills)
  - Education (up to 3 entries)
- **Note**: Data is extracted from PDF and stored in `employees.pdf_data` column

### 4. Manual Form Data ✅
- **Source**: `mergedData.work_experience`, `mergedData.skills`, `mergedData.education`
- **Fields Used**:
  - Work experience (user-entered text)
  - Skills (comma-separated list)
  - Education (user-entered text)
- **Note**: Data is stored in `employees.manual_data` column

---

## How Data is Merged

The `MergeRawDataUseCase` combines all 4 sources:

1. **Work Experience**: Merged from PDF, LinkedIn, and Manual form
2. **Skills**: Merged from PDF and Manual form
3. **Education**: Merged from PDF and Manual form
4. **LinkedIn Profile**: Used directly from LinkedIn OAuth
5. **GitHub Profile**: Used directly from GitHub OAuth

The merged data is then passed to `OpenAIAPIClient.generateBio()` as the `mergedData` parameter.

---

## Code Location

**File**: `backend/src/infrastructure/OpenAIAPIClient.js`

**Method**: `buildBioPrompt(linkedinData, githubData, employeeBasicInfo, mergedData)`

**Lines**: 310-486

---

## Verification

To verify all 4 sources are included, check the logs:

```
[OpenAIAPIClient] LinkedIn data fields available: [fields]
[OpenAIAPIClient] GitHub data fields available: [fields]
[OpenAIAPIClient] Merged data fields available: [fields]
```

The prompt explicitly states:
> "Synthesizes information from all available sources (LinkedIn professional experience, GitHub technical expertise, CV PDF data, and Manual form data)"

---

## Example Prompt with All Sources

If an employee has:
- ✅ LinkedIn connected → LinkedIn data included
- ✅ GitHub connected → GitHub data included
- ✅ CV uploaded → PDF data included in mergedData
- ✅ Manual form filled → Manual data included in mergedData

The prompt will include:
1. LinkedIn section with profile and work experience
2. GitHub section with repositories and technical info
3. Work Experience section (from PDF + Manual)
4. Skills section (from PDF + Manual)
5. Education section (from PDF + Manual)

All sources are combined to create a comprehensive bio.

