# Development TODO

This file tracks all fixes, improvements, and future tasks for the EDUCORE Directory Management System.

---

## 🔧 Current Fixes (In Progress)

### 1. Global/Header
- [ ] Add project logo to header (right side)
  - Light mode → logo2
  - Dark mode → logo1
  - Use design tokens for sizing/spacing (no hardcoding)
- [ ] Ensure header logo behavior works on all pages (Login, CSV Upload, Company Profile, etc.)

### 2. Login Page
- [ ] Verify header uses token-driven logo behavior

### 3. CSV Upload Page
- [ ] **WAITING FOR APPROVAL**: Update CSV requirements format UI
  - Show company mandatory settings (learning_path_approval)
  - Show optional company settings (primary_kpis, logo_url)
  - Show all employee fields clearly
- [ ] Remove auto-redirect after CSV processing
- [ ] Create post-upload processing page component
- [ ] Add "Continue" button to redirect to Company Profile

### 4. Company Profile Page
- [ ] Change company logo shape to circular (use design tokens for radius)
- [ ] Hierarchy tab: Remove clickable links on employee names
- [ ] Employees tab: Add filter controls
- [ ] Employees tab: Add sort controls
- [ ] Employees tab: Add search functionality (by name/email)
- [ ] Employees tab: Add "Add Employee" button with two options:
  - [ ] Manual entry form (same fields as CSV, same validation)
  - [ ] Upload CSV option (additional CSV with same schema)
- [ ] Handle new employee addition (update company profile and DB)
- [ ] Validate company-level fields when adding via CSV

### 5. Pending Requests / Learning Path Approvals
- [ ] Move Learning Path approvals to Decision Maker employee view (not company-level)
- [ ] Create "Learning Paths Approvals" tab for Decision Maker employees only
- [ ] Show count of pending approvals (e.g., "4 waiting approvals")
- [ ] Add redirect to Learner AI microservice frontend (or placeholder if not available)
- [ ] Hide approval UI from non-Decision Maker employees

---

## 📋 Future Tasks (Not Started)

### Profile Improvements
- UX/UI upgrades for employee profiles
- Add more details to employee profiles
- Improve profile display and navigation

### Course Enrollment Logic
- Refine flow for assigning courses
- Improve validation for enrolling employees
- Enhance tracking of course enrollment within company's learning environment
- Implement three main learning flows:
  - Career-path-driven
  - Skill-driven
  - Trainer-led

---

## 🔗 Dependencies on Other Microservices

### Learner AI Microservice
- Learning Path approvals redirect
- Frontend integration (or placeholder if not available)

### Auth Service (Future)
- Replace dummy authentication
- JWT-based authentication integration

---

## ⚠️ Tasks Requiring Approval

1. **CSV Requirements UI Update** - Waiting for user approval on proposed format
2. **Learning Path Approvals UI** - May need clarification on exact UI/UX requirements
3. **Add Employee Form** - Need to confirm all fields match CSV exactly

---

## 🧪 Testing Checklist

Before pushing any commits, verify:
- [ ] Entire application builds successfully
- [ ] All current flows behave exactly as expected
- [ ] UI matches design tokens (no hardcoded values)
- [ ] No regression bugs introduced
- [ ] Header logo displays correctly in light/dark mode
- [ ] CSV upload flow works end-to-end
- [ ] Company profile displays correctly
- [ ] Employee profile displays correctly
- [ ] All existing features still work

---

## 📝 Notes

- All styling must use design tokens from `design-tokens.json`
- No hardcoded colors, sizes, or spacing values
- Ensure responsive design across all pages
- Maintain backward compatibility with existing data
- Follow TDD principles when adding new features

---

*Last Updated: [Current Date]*

