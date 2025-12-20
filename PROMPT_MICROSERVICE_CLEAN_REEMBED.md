# 🔄 MICROSERVICE - CLEAN REMOVAL & RE-EMBED BOT (Critical)

## 🎯 OBJECTIVE

**CRITICAL:** Remove ALL previous bot embedding attempts and re-embed correctly with CSS isolation.

**Why:** Early embedding attempts were done WITHOUT CSS isolation, causing conflicts. Some teams tried to fix issues with custom CSS that now conflicts with the new isolation system.

**Solution:** Complete clean removal, then fresh embedding with the new standardized approach.

---

## ⚠️ CRITICAL RULES

### ❌ DO NOT:
- Skip any removal steps
- Leave old bot code in place
- Keep custom CSS overrides
- Keep manual container creation
- Keep auto-open code

### ✅ DO:
- Follow ALL removal steps exactly
- Remove ALL bot-related code
- Remove ALL custom bot CSS
- Start fresh with clean slate
- Test after each step

---

## 🗑️ STEP 1: COMPLETE REMOVAL

### 1.1: Remove Bot Container from HTML

**File:** `public/index.html` (or main HTML file)

**Find and DELETE this entire block:**

```html
<!-- REMOVE THIS ENTIRE SECTION -->
<div id="edu-bot-container"></div>
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
<script>
  window.initializeEducoreBot({
    microservice: "YOUR_SERVICE",
    userId: user.id,
    token: user.token,
    tenantId: user.tenantId
  });
</script>
<!-- END REMOVE -->
```

**Result:** HTML file should have NO bot code at all.

---

### 1.2: Remove Container from React Components

**Search in ALL React components for:**

```bash
# Search for bot container references
grep -r "edu-bot-container" src/
grep -r "initializeEducoreBot" src/
grep -r "bot.js" src/
```

**Delete ANY code that:**
- Creates `#edu-bot-container` element
- Calls `window.initializeEducoreBot()`
- Loads bot script
- Manipulates bot elements

**Example of code to DELETE:**

```javascript
// ❌ DELETE THIS ENTIRE BLOCK
useEffect(() => {
  const container = document.createElement('div');
  container.id = 'edu-bot-container';
  document.body.appendChild(container);
  
  const script = document.createElement('script');
  script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
  document.head.appendChild(script);
  
  script.onload = () => {
    window.initializeEducoreBot({ ... });
  };
}, []);
// ❌ END DELETE
```

---

### 1.3: Remove Custom Bot CSS

**Search for bot-related CSS:**

```bash
# Search for bot styles
grep -r "edu-bot" src/
grep -r "bot-container" src/
grep -r "chat-widget" src/
grep -r "floating-chat" src/
```

**Delete ANY custom CSS like:**

```css
/* ❌ DELETE ALL OF THIS */
#edu-bot-container {
  all: initial;
  background: purple;
  /* etc. */
}

.chat-panel {
  background: white;
  /* etc. */
}

[class*="bot-"] {
  /* etc. */
}
/* ❌ END DELETE */
```

**Files to check:**
- `src/index.css`
- `src/App.css`
- `src/styles/*.css`
- Any component-specific CSS files

---

### 1.4: Remove Auto-Open Code

**Search for code that opens bot automatically:**

```bash
grep -r "setWidgetOpen" src/
grep -r "bot.*open" src/
grep -r "isOpen.*true" src/
```

**Delete ANY code like:**

```javascript
// ❌ DELETE THIS
useEffect(() => {
  setTimeout(() => {
    window.EDUCORE_BOT?.setWidgetOpen?.(true);
  }, 1000);
}, []);
```

---

### 1.5: Verify Complete Removal

**Run these checks:**

```bash
# Should return NOTHING:
grep -r "edu-bot-container" .
grep -r "initializeEducoreBot" .
grep -r "rag-production-3a4c" .

# If you see results, you missed something - remove it!
```

---

## ✅ STEP 2: FRESH EMBEDDING (CORRECT WAY)

### 2.1: Add Container to index.html (ROOT LEVEL)

**File:** `public/index.html`

**CRITICAL:** Container MUST be at `<body>` level, NOT inside `<div id="root">`!

**Find your HTML structure:**

```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div id="root"></div>  <!-- Your React app -->
    
    <!-- ADD BOT CONTAINER HERE ⬇️ -->
    
  </body>
</html>
```

**Add EXACTLY this (at `<body>` level, AFTER `<div id="root">`):**

```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div id="root"></div>
    
    <!-- ✅ EDUCORE BOT - DO NOT MODIFY -->
    <div id="edu-bot-container"></div>
    <!-- ✅ END BOT CONTAINER -->
    
  </body>
</html>
```

**Verify:**
- ✅ Container is at `<body>` level
- ✅ Container is AFTER `<div id="root">`
- ✅ Container is OUTSIDE `<div id="root">`
- ✅ No other bot code in HTML yet

---

### 2.2: Add Bot Script (Correct Location)

**File:** `public/index.html`

**Add script AFTER the container, BEFORE `</body>`:**

```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div id="root"></div>
    
    <!-- Bot Container -->
    <div id="edu-bot-container"></div>
    
    <!-- ✅ BOT SCRIPT - ADD HERE ⬇️ -->
    <script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>
    <!-- ✅ END BOT SCRIPT -->
    
  </body>
</html>
```

---

### 2.3: Add Initialization Script

**CRITICAL:** Get user data from your auth system!

**Option A: User is logged in (most common)**

**File:** `public/index.html`

**Add initialization AFTER bot script:**

```html
<!-- Bot Script -->
<script src="https://rag-production-3a4c.up.railway.app/embed/bot.js"></script>

<!-- ✅ INITIALIZATION - CUSTOMIZE THIS ⬇️ -->
<script>
  // Wait for bot script to load
  window.addEventListener('load', function() {
    // Get user data from your auth system
    // TODO: Replace with YOUR actual user data source
    const userData = window.APP_USER || {}; // Your user object
    
    // Initialize bot
    if (window.initializeEducoreBot) {
      window.initializeEducoreBot({
        microservice: 'YOUR_SERVICE_NAME',  // ⬅️ CHANGE THIS!
        userId: userData.id || 'anonymous',
        token: userData.token || '',
        tenantId: userData.tenantId || 'default'
      });
    }
  });
</script>
<!-- ✅ END INITIALIZATION -->
```

**IMPORTANT - Customize `microservice` value:**

| Your Microservice | Use This Value |
|-------------------|----------------|
| Assessment | `'ASSESSMENT'` |
| DevLab | `'DEVLAB'` |
| Content Studio | `'CONTENT'` |
| Course Builder | `'COURSE'` |
| Management Reporting | `'REPORTING'` |
| Directory | `'DIRECTORY'` |
| User Management | `'USER'` |
| Others | Ask RAG team |

---

**Option B: User data in React state**

**If your user data is in React (e.g., Redux, Context):**

**File:** `src/App.jsx` (or main component)

```javascript
import { useEffect } from 'react';
import { useSelector } from 'react-redux'; // or your auth hook

function App() {
  const user = useSelector(state => state.auth.user); // Your user state
  
  useEffect(() => {
    // Wait for user to be loaded
    if (user && window.initializeEducoreBot) {
      window.initializeEducoreBot({
        microservice: 'YOUR_SERVICE_NAME',  // ⬅️ CHANGE THIS!
        userId: user.id || 'anonymous',
        token: user.token || '',
        tenantId: user.tenantId || 'default'
      });
    }
  }, [user]); // Re-run when user changes
  
  return (
    <div>
      {/* Your app */}
    </div>
  );
}
```

---

### 2.4: Test the Embedding

**After adding the code, test:**

1. **Open browser console (F12)**

2. **Check for bot messages:**
   ```
   ✅ Should see: "EDUCORE Bot: Embedding script loaded"
   ✅ Should see: "🤖 RAG: Container exists? true"
   ✅ Should see: "✅ RAG: initializeEducoreBot called"
   ```

3. **Check for bot elements:**
   ```javascript
   // In console, run:
   document.querySelector('#edu-bot-container')
   // Should return: <div id="edu-bot-container">...</div>
   ```

4. **Look for floating button:**
   - ✅ Green circle button in bottom-right corner
   - ✅ Click opens chat panel
   - ✅ Panel has emerald green header (not teal!)
   - ✅ Messages area is light gray
   - ✅ Input field at bottom

---

## 🚨 COMMON MISTAKES - AVOID THESE!

### ❌ Mistake 1: Container inside React root

```html
<!-- ❌ WRONG -->
<body>
  <div id="root">
    <div id="edu-bot-container"></div>  <!-- WRONG LOCATION! -->
  </div>
</body>

<!-- ✅ CORRECT -->
<body>
  <div id="root"></div>
  <div id="edu-bot-container"></div>  <!-- CORRECT! -->
</body>
```

**Why:** Container inside React inherits parent CSS, causing conflicts.

---

### ❌ Mistake 2: Manual container creation

```javascript
// ❌ WRONG - Don't do this!
const container = document.createElement('div');
container.id = 'edu-bot-container';
document.body.appendChild(container);
```

**Why:** Container should be in HTML, not created by JS.

---

### ❌ Mistake 3: Wrong initialization timing

```javascript
// ❌ WRONG - Too early!
window.initializeEducoreBot({ ... });
// Bot script hasn't loaded yet!

// ✅ CORRECT - Wait for load
window.addEventListener('load', function() {
  window.initializeEducoreBot({ ... });
});
```

---

### ❌ Mistake 4: Missing microservice name

```javascript
// ❌ WRONG
window.initializeEducoreBot({
  userId: user.id,
  token: user.token
  // Missing microservice!
});

// ✅ CORRECT
window.initializeEducoreBot({
  microservice: 'ASSESSMENT',  // Required!
  userId: user.id,
  token: user.token
});
```

---

### ❌ Mistake 5: Adding custom CSS

```css
/* ❌ WRONG - Don't add custom styles! */
#edu-bot-container {
  background: purple !important;
}
```

**Why:** Bot now has CSS isolation built-in. Custom CSS causes conflicts.

---

## ✅ VERIFICATION CHECKLIST

Before considering embedding complete:

### File Structure:
- [ ] `public/index.html` has bot container at `<body>` level
- [ ] Container is AFTER `<div id="root">`
- [ ] Container is OUTSIDE `<div id="root">`
- [ ] Bot script loads AFTER container
- [ ] Initialization calls `window.initializeEducoreBot()`
- [ ] NO bot code in React components
- [ ] NO custom bot CSS anywhere

### Visual Check:
- [ ] Floating button visible (green circle, bottom-right)
- [ ] Button click opens panel
- [ ] Panel has correct size (~448px × 600px)
- [ ] Header is emerald green (NOT teal or purple!)
- [ ] Messages area is light gray
- [ ] Input field at bottom
- [ ] Send button is green circle

### Functional Check:
- [ ] Can type in input field
- [ ] Can click send button
- [ ] Bot responds to messages
- [ ] Close button works
- [ ] Panel reopens when clicking button again

### Browser Console:
- [ ] No errors related to bot
- [ ] See bot initialization messages
- [ ] `document.querySelector('#edu-bot-container')` returns element
- [ ] `window.initializeEducoreBot` is defined

### Different Zoom Levels:
- [ ] 67% - Bot visible and proportional
- [ ] 75% - Bot visible and proportional
- [ ] 100% - Bot visible and proportional (not cut off!)
- [ ] 125% - Bot visible and fits on screen

---

## 🎯 SUPPORT MODE vs CHAT MODE

### Chat Mode (Most microservices):

```javascript
window.initializeEducoreBot({
  microservice: 'YOUR_SERVICE',  // Your service name
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
  // mode: 'chat' is default
});
```

**Behavior:**
- Header: Emerald green
- Queries go to RAG knowledge base
- General AI assistant

---

### Support Mode (Assessment & DevLab only):

**Assessment:**
```javascript
window.initializeEducoreBot({
  microservice: 'ASSESSMENT',
  mode: 'support',  // ⬅️ Support mode
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**DevLab:**
```javascript
window.initializeEducoreBot({
  microservice: 'DEVLAB',
  mode: 'support',  // ⬅️ Support mode
  userId: user.id,
  token: user.token,
  tenantId: user.tenantId
});
```

**Behavior:**
- Assessment: Blue header, forwards to Assessment API
- DevLab: Purple header, forwards to DevLab API

---

## 🆘 TROUBLESHOOTING

### Problem: Bot not appearing

**Check:**
```javascript
// 1. Container exists?
console.log(document.querySelector('#edu-bot-container'));
// Should return <div id="edu-bot-container">...</div>

// 2. Script loaded?
console.log(typeof window.initializeEducoreBot);
// Should return 'function'

// 3. Initialization called?
// Check console for "✅ RAG: initializeEducoreBot called"
```

**Solution:** Verify container is in HTML, script loads, init is called.

---

### Problem: Panel cut off at 100% zoom

**This should be fixed in latest RAG deployment.**

**If still happening:**
- Notify RAG team - they need to deploy latest fixes
- Don't try to fix with custom CSS!

---

### Problem: Header wrong color (teal instead of emerald)

**This should be fixed in latest RAG deployment.**

**If still happening:**
- Notify RAG team - they need to deploy latest fixes
- Don't try to fix with custom CSS!

---

### Problem: Purple background in messages (DevLab)

**This should be fixed in latest RAG deployment.**

**If still happening:**
- Notify RAG team - they need to deploy latest fixes
- Don't try to fix with custom CSS!

---

### Problem: Bot doesn't respond

**Check:**
```javascript
// Check network tab for API calls
// Should see POST to /api/chat or similar
```

**Possible causes:**
- User not authenticated (token missing)
- Network blocked
- Backend down

**Solution:** Check user token, check network, notify RAG team.

---

## 📋 FINAL CHECKLIST

Before marking as complete:

- [ ] ALL old bot code removed
- [ ] ALL custom bot CSS removed
- [ ] Container added to `index.html` at `<body>` level
- [ ] Bot script added to `index.html`
- [ ] Initialization added with correct `microservice` value
- [ ] User data (userId, token, tenantId) passed correctly
- [ ] Bot appears visually correct
- [ ] Bot functions correctly
- [ ] Works at 67%, 75%, 100%, 125% zoom
- [ ] No console errors
- [ ] Tested by at least 2 people

---

## 🎯 SUCCESS CRITERIA

**Embedding is successful when:**

1. ✅ Floating button appears (green, bottom-right)
2. ✅ Panel opens on click
3. ✅ Header is emerald green (general) or blue/purple (support mode)
4. ✅ Messages area is light gray
5. ✅ Can send messages and get responses
6. ✅ Works at all zoom levels (67% to 125%)
7. ✅ No visual glitches or color issues
8. ✅ No console errors
9. ✅ No custom CSS needed
10. ✅ Clean, standardized implementation

---

## 📞 NEED HELP?

**If you encounter issues:**

1. **Check console for errors** - Most issues show error messages
2. **Verify checklist** - Did you follow all steps exactly?
3. **Test in incognito** - Rules out browser cache issues
4. **Check with RAG team** - They can verify bot deployment
5. **Share screenshot** - Visual issues are easier to diagnose with images

**Contact RAG team with:**
- Your microservice name
- Screenshot of the issue
- Browser console log (F12 → Console tab)
- Steps to reproduce

---

## 🚀 DEPLOYMENT

After successful local testing:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Clean bot re-embedding with CSS isolation"
   ```

2. **Deploy to staging** - Test there first!

3. **Deploy to production** - After staging verification

4. **Notify RAG team** - Let them know embedding is complete

---

**Follow this PROMPT exactly for clean, standardized bot embedding! 🎯**
