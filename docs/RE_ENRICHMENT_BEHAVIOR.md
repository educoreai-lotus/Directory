# Re-Enrichment Behavior - How It Works

## Question: Can users enrich their profile again if they exit before completing?

**Answer:** Yes, users can continue enrichment if they exit before completing. Here's how it works:

---

## Current Behavior

### Scenario 1: User connects LinkedIn but doesn't click "Continue"
1. User connects LinkedIn → Data saved to `employees.linkedin_data` and `employees.linkedin_url`
2. User exits page without clicking "Continue to Your Profile"
3. User logs in again later
4. **Result:** User can still access `/enrich` page and continue the process
5. **Data:** LinkedIn data is already saved, so the "LinkedIn Connected" button will show as connected
6. **Enrichment:** User can still click "Continue to Your Profile" to trigger enrichment

### Scenario 2: User connects LinkedIn and clicks "Continue" but enrichment fails
1. User connects LinkedIn → Data saved
2. User clicks "Continue to Your Profile" → Enrichment triggered
3. Enrichment fails (e.g., API error, insufficient data)
4. User logs in again later
5. **Result:** User can access `/enrich` page again
6. **Data:** LinkedIn data is still saved
7. **Enrichment:** User can try again (will overwrite previous enrichment attempt if it partially succeeded)

### Scenario 3: User connects LinkedIn and enrichment succeeds
1. User connects LinkedIn → Data saved
2. User clicks "Continue to Your Profile" → Enrichment succeeds
3. `profile_status` set to `'enriched'`
4. User logs in again later
5. **Result:** User is redirected to profile page (cannot access `/enrich` page)
6. **Reason:** `EnrichProfilePage` checks `user.profileStatus === 'enriched'` and redirects

---

## Data Storage Behavior

### OAuth Data (LinkedIn/GitHub)
- **Saved immediately** when OAuth connection succeeds
- **Stored in:** `employees.linkedin_data` and `employees.github_data` columns
- **Overwrite behavior:** If user connects again, data is **overwritten** (one-time connection check prevents this, but if bypassed, data is overwritten)

### PDF Data
- **Saved immediately** when PDF is uploaded
- **Stored in:** `employees.pdf_data` column
- **Overwrite behavior:** If user uploads again, data is **overwritten**

### Manual Form Data
- **Saved when** user clicks "Save Details" button
- **Stored in:** `employees.manual_data` column
- **Overwrite behavior:** If user saves again, data is **overwritten**

### Enrichment Status
- **Set to `'enriched'`** when enrichment succeeds
- **Stored in:** `employees.profile_status` column
- **Overwrite behavior:** If enrichment runs again, status is **updated** (can go from `'enriched'` back to `'basic'` if enrichment fails, but normally stays `'enriched'`)

---

## Access Control

### Who Can Access `/enrich` Page?

**Allowed:**
- Users with `profile_status === 'basic'` (not enriched)
- Users who connected OAuth but haven't completed enrichment
- Users who uploaded PDF but haven't completed enrichment
- Users who filled manual form but haven't completed enrichment

**Blocked (redirected to profile):**
- Users with `profile_status === 'enriched'`
- Users with `profile_status === 'approved'`

---

## Re-Enrichment Flow

If a user has partial data (e.g., LinkedIn connected) but hasn't completed enrichment:

1. **User logs in** → Sees "Enrich Profile" button on profile page
2. **User clicks "Enrich Profile"** → Navigates to `/enrich` page
3. **Page loads** → Shows LinkedIn as "Connected" (data already saved)
4. **User can:**
   - Connect GitHub (if not connected)
   - Upload CV (if not uploaded)
   - Fill manual form (if not filled)
   - Click "Continue to Your Profile" to trigger enrichment

5. **Enrichment runs** → Uses all saved data (LinkedIn, GitHub, PDF, Manual)
6. **Result:**
   - Success → `profile_status` set to `'enriched'`, user redirected to profile
   - Failure → User stays on `/enrich` page, can try again

---

## Data Overwrite Behavior

### If User Connects LinkedIn Again
- **Current code:** Prevents re-connection (throws error: "LinkedIn is already connected")
- **If bypassed:** Data would be overwritten

### If User Uploads PDF Again
- **Current code:** Allows re-upload
- **Behavior:** New PDF data **overwrites** old PDF data

### If User Saves Manual Form Again
- **Current code:** Allows re-save
- **Behavior:** New manual data **overwrites** old manual data

### If User Triggers Enrichment Again
- **Current code:** Allows re-enrichment if `profile_status !== 'enriched'`
- **Behavior:** New enrichment **overwrites** old bio/value_proposition/project summaries

---

## Summary

**Yes, users can enrich again if they exit before completing:**
- OAuth data is saved immediately (not lost)
- User can return and continue
- All data sources can be added incrementally
- Enrichment can be triggered multiple times until it succeeds
- Once `profile_status === 'enriched'`, user cannot access `/enrich` page again

**Data is overwritten when:**
- User uploads new PDF (overwrites old PDF)
- User saves manual form again (overwrites old manual data)
- User triggers enrichment again (overwrites bio/value_proposition)

**Data is NOT overwritten when:**
- User connects LinkedIn again (blocked by one-time check)
- User connects GitHub again (blocked by one-time check)

