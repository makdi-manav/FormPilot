// Content Script - FormPilot (Google Forms Auto-Filler)
// Supports Multi-Page Forms (1 to 50+ pages), Grids (Radios & Checkboxes),
// Realistic Demographic Pools, and Gemini AI Generation Mode.
// Unstoppable, self-healing execution that never halts until all responses are finished or user clicks Stop.

(() => {
  // Concurrency & Cancellation Flags
  let abortRequested = false;
  let isRunningCached = false;
  let isFillingActive = false;
  let isHandlingConfirmation = false;

  // Realistic Indian Demographic & Contextual Data Pools
  const INDIAN_FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Muhammad', 'Sai', 'Arnav', 'Ayan',
    'Krishna', 'Ishan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Kabir', 'Aryan', 'Dhruv', 'Ritvik',
    'Ananya', 'Diya', 'Aadhya', 'Pari', 'Saanvi', 'Sarah', 'Anika', 'Navya', 'Angel', 'Myra',
    'Sneha', 'Pooja', 'Priya', 'Riya', 'Kavya', 'Tanvi', 'Shreya', 'Meera', 'Nisha', 'Deepika',
    'Rohan', 'Vikram', 'Sanjay', 'Amit', 'Rajesh', 'Sunita', 'Lakshmi', 'Geeta', 'Rekha', 'Divya',
    'Naveen', 'Karthik', 'Siddharth', 'Meenakshi', 'Harish', 'Preeti', 'Swati', 'Manish', 'Neha'
  ];

  const INDIAN_LAST_NAMES = [
    'Sharma', 'Patel', 'Verma', 'Iyer', 'Gupta', 'Reddy', 'Singh', 'Nair', 'Joshi', 'Rao',
    'Kumar', 'Das', 'Chatterjee', 'Mehta', 'Bhat', 'Kulkarni', 'Pillai', 'Mishra', 'Deshmukh', 'Agarwal',
    'Nambiar', 'Choudhury', 'Bhattacharya', 'Banerjee', 'Mukherjee', 'Sen', 'Ghosh', 'Kapoor', 'Malhotra', 'Saxena',
    'Chauhan', 'Pandey', 'Trivedi', 'Menon', 'Venkatesh', 'Shetty', 'Bose', 'Dutta', 'Sengupta'
  ];

  const INDIAN_CITIES = [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
    'Jaipur', 'Lucknow', 'Chandigarh', 'Surat', 'Indore', 'Bhopal', 'Patna', 'Kochi',
    'Visakhapatnam', 'Coimbatore', 'Nagpur', 'Vadodara', 'Bhubaneswar', 'Dehradun', 'Mysore',
    'Guwahati', 'Ranchi', 'Varanasi', 'Thiruvananthapuram', 'Mangalore', 'Jamshedpur', 'Amritsar'
  ];

  const INDIAN_STATES = [
    'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Gujarat',
    'West Bengal', 'Telangana', 'Rajasthan', 'Kerala', 'Madhya Pradesh', 'Punjab',
    'Haryana', 'Bihar', 'Andhra Pradesh', 'Odisha', 'Assam', 'Goa', 'Uttarakhand', 'Jharkhand'
  ];

  const SHORT_ADDRESSES = [
    'Flat 402, Lotus Residency, MG Road',
    '12/A, Green Park Extension, 2nd Cross',
    'Plot 45, Shanti Niketan Society, Station Road',
    'House No. 87, Sector 14, Ring Road',
    'Flat 3B, Sunrise Apartments, Bannerghatta Road',
    '24, Nehru Street, Gandhi Nagar',
    'B-104, Royal Palms, Link Road',
    'Villa 18, Palm Meadows, Whitefield',
    'No. 65, Anna Salai, T. Nagar',
    'Flat 12, Gulmohar Enclave, Civil Lines',
    '44, Mayur Vihar Phase 1, Ring Road',
    '702, Silver Oak Towers, HSR Layout Sector 2',
    'Plot 19, Defense Colony, Road No. 3'
  ];

  const REASON_PHRASES = [
    'To streamline existing operational workflows and improve delivery times.',
    'Recommended by colleagues for consistent and dependable performance.',
    'Looking to evaluate modern automated tooling for daily tasks.',
    'Aiming to reduce manual effort and eliminate repetitive data entry.',
    'To test edge cases and verify responsiveness across scenarios.',
    'Exploring scalable alternatives for academic and research evaluation.',
    'Required for formal departmental auditing and compliance check.'
  ];

  const FEEDBACK_PHRASES = [
    'The overall user flow is intuitive and steps are well structured.',
    'Clear instructions provided on every section of the form.',
    'Response times are swift and no blockers were encountered.',
    'Good layout and clean typography throughout the questions.',
    'Everything functioned smoothly without unexpected delays.',
    'Great usability, would appreciate optional keyboard shortcuts in the future.',
    'Comprehensive question coverage that meets all evaluation criteria.'
  ];

  const GENERIC_SENTENCES = [
    'Everything looks good and functions as expected.',
    'The overall experience has been smooth and satisfactory.',
    'No issues or concerns encountered during testing.',
    'All requirements are met properly and timely.',
    'Good performance and intuitive user interface.',
    'The workflow is clear and straightforward.',
    'Testing completed with positive results.',
    'Satisfied with the overall experience.',
    'Clear guidelines and easy navigation.',
    'Adequate details provided across all fields.',
    'Properly structured question flow.',
    'Results align well with our expectations.'
  ];

  // Creates a cohesive persona for a single form submission
  function createPersona() {
    const firstName = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
    const lastName = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
    const fullName = `${firstName} ${lastName}`;
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const randNum = Math.floor(Math.random() * 90) + 10;
    const email = `${cleanFirst}.${cleanLast}${randNum}@example.com`;

    // Integer 18-60 (always >= 18)
    const age = Math.floor(Math.random() * (60 - 18 + 1)) + 18;

    // 10 digits starting with 6, 7, 8 or 9
    const firstDigit = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
    let restPhone = '';
    for (let i = 0; i < 9; i++) {
      restPhone += Math.floor(Math.random() * 10);
    }
    const phone = `${firstDigit}${restPhone}`;

    const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
    const state = INDIAN_STATES[Math.floor(Math.random() * INDIAN_STATES.length)];

    // 6-digit pincode starting with 1-8
    const pinFirst = Math.floor(Math.random() * 8) + 1;
    let pinRest = '';
    for (let i = 0; i < 5; i++) {
      pinRest += Math.floor(Math.random() * 10);
    }
    const pincode = `${pinFirst}${pinRest}`;

    const address = SHORT_ADDRESSES[Math.floor(Math.random() * SHORT_ADDRESSES.length)];

    return {
      firstName,
      lastName,
      fullName,
      email,
      age,
      phone,
      city,
      state,
      pincode,
      address,
      getTextForTitle(title, inputType = 'text') {
        const t = (title || '').toLowerCase();

        // 1. Email check
        if (inputType === 'email' || /\b(email|e-mail|mail\s*id|email\s*address)\b/i.test(t)) {
          return this.email;
        }
        // 2. Phone check
        if (inputType === 'tel' || /\b(phone|mobile|contact|cell|whatsapp|telephone|tel|phone\s*number|mobile\s*number)\b/i.test(t)) {
          return this.phone;
        }
        // 3. Age check
        if (/\b(age|years\s*old)\b/i.test(t)) {
          return String(this.age);
        }
        // 4. Pincode check
        if (/\b(pincode|pin\s*code|postal\s*code|zip|zipcode|pin)\b/i.test(t)) {
          return this.pincode;
        }
        // 5. City check
        if (/\b(city|town|district)\b/i.test(t)) {
          return this.city;
        }
        // 6. State check
        if (/\b(state|province)\b/i.test(t)) {
          return this.state;
        }
        // 7. Address check
        if (/\b(address|street|residence|house|flat|locality)\b/i.test(t)) {
          return this.address;
        }
        // 8. Name check
        if (/\b(name|full\s*name|first\s*name|last\s*name|candidate|applicant|student|respondent|person)\b/i.test(t)) {
          return this.fullName;
        }
        // 9. Gender check
        if (/\bgender\b/i.test(t)) {
          return Math.random() > 0.5 ? 'Female' : 'Male';
        }
        // 10. Reason / Why
        if (/\b(why|reason|purpose|objective)\b/i.test(t)) {
          return REASON_PHRASES[Math.floor(Math.random() * REASON_PHRASES.length)];
        }
        // 11. Feedback / Suggestion
        if (/\b(feedback|suggestion|comment|opinion|review)\b/i.test(t)) {
          return FEEDBACK_PHRASES[Math.floor(Math.random() * FEEDBACK_PHRASES.length)];
        }
        // 12. Experience
        if (/\b(experience|background)\b/i.test(t)) {
          return `Over ${Math.floor(Math.random() * 8) + 2} years of relevant professional experience.`;
        }
        // 13. HTML5 input types
        if (inputType === 'number') {
          return String(Math.floor(Math.random() * 50) + 1);
        }
        if (inputType === 'url') {
          return 'https://example.com/test';
        }

        // Return a randomized sentence
        return GENERIC_SENTENCES[Math.floor(Math.random() * GENERIC_SENTENCES.length)];
      }
    };
  }

  // Native Value Setter for React / Angular / Closure-based input watchers
  function setNativeValue(element, value) {
    let prototype = Object.getPrototypeOf(element);
    let descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    while (prototype && !descriptor) {
      prototype = Object.getPrototypeOf(prototype);
      if (prototype) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      }
    }

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Robust, verified option selection (does not uncheck checkboxes or double-click radios)
  async function safeSelectOption(el) {
    if (!el) return false;
    if (el.getAttribute('aria-checked') === 'true') {
      return true; // Already selected! Never click again to avoid toggling off!
    }

    try {
      el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } catch (_) {}

    try { el.focus(); } catch (_) {}

    // First try standard click
    el.click();
    await sleep(70);

    if (el.getAttribute('aria-checked') === 'true') {
      return true;
    }

    // Secondary attempt: dispatch pointer and mouse event sequence
    const innerTarget = el.querySelector('.uHMk6b, .AB7Lab, [role="presentation"]') || el;
    try {
      innerTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
      innerTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      innerTarget.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
      innerTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      innerTarget.click();
    } catch (_) {}

    await sleep(80);

    // Tertiary attempt: if still not checked and parent exists, click parent
    if (el.getAttribute('aria-checked') !== 'true' && el.parentElement) {
      try {
        el.parentElement.click();
      } catch (_) {}
      await sleep(80);
    }

    return el.getAttribute('aria-checked') === 'true';
  }

  // Safe button clicker (for Next and Submit buttons)
  function safeClickButton(btn) {
    if (!btn) return;
    try {
      btn.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } catch (_) {}
    try { btn.focus(); } catch (_) {}
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    btn.click();
  }

  // Utilities
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomDelay(min = 100, max = 250) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(ms);
  }

  async function isStillRunning() {
    if (abortRequested) return false;
    const data = await chrome.storage.local.get(['running']);
    if (data.running === false) {
      abortRequested = true;
      isRunningCached = false;
      return false;
    }
    return true;
  }

  // Multi-source Page & Section Detector
  function getCurrentPageInfo() {
    let current = null;
    let total = null;

    // 1. Check Google Forms progress bar element
    const pb = document.querySelector('[role="progressbar"]');
    if (pb) {
      const val = pb.getAttribute('aria-valuenow');
      const max = pb.getAttribute('aria-valuemax');
      if (val) current = parseInt(val, 10);
      if (max) total = parseInt(max, 10);

      const text = pb.getAttribute('aria-valuetext') || pb.innerText || '';
      const m = text.match(/\bPage\s+(\d+)\s+of\s+(\d+)\b/i);
      if (m) {
        if (!current) current = parseInt(m[1], 10);
        if (!total) total = parseInt(m[2], 10);
      }
    }

    // 2. Check full document text for "Page X of Y"
    if (!current) {
      const bodyText = document.body ? document.body.innerText : '';
      const match = bodyText.match(/\bPage\s+(\d+)\s+of\s+(\d+)\b/i);
      if (match) {
        current = parseInt(match[1], 10);
        total = parseInt(match[2], 10);
      }
    }

    // 3. Extract unique Coaster code (S01 to S40) from headings or image cards
    let coasterCode = null;
    const headings = Array.from(document.querySelectorAll('[role="heading"], div[role="listitem"]'));
    for (const h of headings) {
      const t = (h.innerText || h.textContent || '').trim();
      const cm = t.match(/\b(S\d{2})\b/);
      if (cm) {
        coasterCode = cm[1];
        break;
      }
    }

    const pageText = current && total ? `Page ${current} of ${total}` : (coasterCode ? `Coaster ${coasterCode}` : null);

    return { current, total, coasterCode, pageText };
  }

  // Fixed answer lookup (case-insensitive keyword matching)
  function findFixedAnswer(title, fixedAnswers) {
    if (!fixedAnswers || !Array.isArray(fixedAnswers)) return null;
    const t = (title || '').toLowerCase();
    for (const item of fixedAnswers) {
      if (item && item.keyword && item.keyword.trim().length > 0) {
        const kw = item.keyword.trim().toLowerCase();
        if (t.includes(kw)) {
          return item.answer !== undefined ? item.answer.trim() : '';
        }
      }
    }
    return null;
  }

  // Resilient Question Title Extractor
  function getQuestionTitle(item) {
    const heading = item.querySelector('[role="heading"]');
    if (heading) {
      const clone = heading.cloneNode(true);
      const badges = clone.querySelectorAll('[aria-label*="Required" i], [aria-hidden="true"], .vR13fe');
      badges.forEach(b => b.remove());
      const text = clone.innerText || clone.textContent || '';
      return text.replace(/\s*\*+\s*$/, '').trim();
    }
    const ariaLabel = item.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    const span = item.querySelector('span[dir="auto"], span');
    if (span) {
      return (span.innerText || span.textContent || '').replace(/\s*\*+\s*$/, '').trim();
    }
    return '';
  }

  // Filter for VISIBLE question blocks only on current active page
  function getVisibleQuestionBlocks() {
    const allBlocks = Array.from(document.querySelectorAll('div[role="listitem"]'));
    return allBlocks.filter(item => {
      const rect = item.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return false;

      const style = window.getComputedStyle(item);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }

      // Check if any ancestor is hidden (Google Forms hides inactive sections)
      let parent = item.parentElement;
      while (parent && parent !== document.body) {
        if (parent.style && (parent.style.display === 'none' || parent.getAttribute('aria-hidden') === 'true')) {
          return false;
        }
        parent = parent.parentElement;
      }

      return true;
    });
  }

  // Question Type Detection & Handlers
  function isFileUpload(item) {
    if (item.querySelector('input[type="file"]')) return true;
    const text = (item.innerText || item.textContent || '').toLowerCase();
    return text.includes('add file') || text.includes('upload file');
  }

  // Detects whether a question is required by Google Forms
  function isQuestionRequired(block) {
    if (!block) return false;
    if (block.querySelector('[aria-required="true"]')) return true;
    if (block.querySelector('.vR13fe, [aria-label*="Required" i]')) return true;
    const heading = block.querySelector('[role="heading"]');
    if (heading && /\*\s*$/.test(heading.textContent || '')) return true;
    return false;
  }

  // Extracts visible stimulus images from active page/section (ignoring icons, logos, avatars)
  function collectStimulusImages() {
    const allImgs = Array.from(document.querySelectorAll('img'));
    const candidateImages = [];
    const seenUrls = new Set();

    for (const img of allImgs) {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      if (rect.width < 50 || rect.height < 50) continue; // Ignore tiny icons, badges, indicators

      const src = img.currentSrc || img.src || '';
      if (!src || !/^https?:\/\//i.test(src)) continue;
      if (seenUrls.has(src)) continue;

      // Ignore Google account profile icons and decorative Google assets
      if (/cleardot\.gif|gstatic\.com\/docs\/forms|lh3\.googleusercontent\.com\/a\//i.test(src)) continue;

      // Ignore images inside buttons or navigation controls
      if (img.closest('button, [role="button"], [role="radio"], [role="checkbox"]')) continue;

      seenUrls.add(src);

      const alt = (img.getAttribute('alt') || img.getAttribute('aria-label') || '').trim();
      candidateImages.push({
        url: src,
        alt: alt,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }

    // Sort by visual area descending so largest/most prominent stimulus images come first
    candidateImages.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    return candidateImages;
  }

  // Extracts active section/page title and description
  function getActiveSectionInfo() {
    const pageInfo = getCurrentPageInfo();
    let title = pageInfo.coasterCode || '';
    let description = '';

    const headerElem = document.querySelector('.freebirdFormviewerViewHeaderTitle, [role="heading"][aria-level="1"], [role="heading"][aria-level="2"]');
    if (headerElem) {
      const text = (headerElem.innerText || headerElem.textContent || '').trim();
      if (text) {
        title = title ? `${title} - ${text}` : text;
      }
    }

    if (!title) {
      title = pageInfo.pageText || 'Active Section';
    }

    const descElem = document.querySelector('.freebirdFormviewerViewHeaderDescription, .M7eMe');
    if (descElem) {
      description = (descElem.innerText || descElem.textContent || '').trim();
    }

    return { title, description };
  }

  // Scans visible questions on active page and builds structured schema for Gemini API
  function scanVisibleQuestionsForAi(visibleBlocks) {
    const list = [];
    visibleBlocks.forEach((block, blockIndex) => {
      if (isFileUpload(block)) return;

      const title = getQuestionTitle(block);
      const isRequired = isQuestionRequired(block);
      const rows = getGridRowsFromBlock(block);

      // Grid question (multiple rows)
      if (rows && rows.length > 1) {
        rows.forEach((row, r) => {
          const rowLabel = (
            row.element.getAttribute('aria-label') ||
            row.element.querySelector('[role="rowheader"], th, .E29oPb')?.innerText ||
            row.options[0]?.getAttribute('data-row-label') ||
            `Row ${r + 1}`
          ).trim();

          const isCheckbox = row.options[0] && row.options[0].getAttribute('role') === 'checkbox';
          const opts = row.options.map(opt =>
            (opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.innerText || '').trim()
          ).filter(Boolean);

          list.push({
            id: `block_${blockIndex}_row_${r}`,
            title: `${title} [${rowLabel}]`,
            type: isCheckbox ? 'checkbox' : 'radio',
            options: opts.length > 0 ? opts : ['1', '2', '3', '4', '5'],
            required: isRequired
          });
        });
        return;
      }

      // Dropdown
      const hasListbox = block.querySelector('div[role="listbox"], select');
      if (hasListbox) {
        const select = block.querySelector('select');
        let opts = [];
        if (select) {
          opts = Array.from(select.options).map(o => o.text).filter(t => !/choose|select/i.test(t));
        } else {
          opts = Array.from(block.querySelectorAll('div[role="option"]')).map(o => (o.innerText || '').trim()).filter(Boolean);
        }
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'dropdown',
          options: opts,
          required: isRequired
        });
        return;
      }

      // Date
      if (block.querySelector('input[type="date"]') || block.querySelectorAll('input[type="text"][aria-label*="day" i], input[type="text"][aria-label*="month" i]').length >= 2) {
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'date',
          options: [],
          required: isRequired
        });
        return;
      }

      // Time
      if (block.querySelector('input[type="time"]') || block.querySelectorAll('input[type="text"][aria-label*="hour" i], input[type="text"][aria-label*="minute" i]').length >= 2) {
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'time',
          options: [],
          required: isRequired
        });
        return;
      }

      // Linear scale
      const radios = Array.from(block.querySelectorAll('[role="radio"]'));
      const isLinearScale = block.querySelectorAll('[role="radiogroup"]').length > 0 &&
        radios.length >= 3 &&
        /^[0-9]+$/.test((radios[0].innerText || radios[0].getAttribute('data-value') || '').trim());

      if (isLinearScale) {
        const opts = radios.map(r => (r.innerText || r.getAttribute('data-value') || '').trim()).filter(Boolean);
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'scale',
          options: opts.length > 0 ? opts : ['1', '2', '3', '4', '5'],
          required: isRequired
        });
        return;
      }

      // Multiple choice (standalone radio)
      if (radios.length > 0) {
        const opts = radios.map(r => (r.getAttribute('aria-label') || r.innerText || r.textContent || '').trim()).filter(Boolean);
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'radio',
          options: opts,
          required: isRequired
        });
        return;
      }

      // Checkboxes (standalone)
      const checkboxes = Array.from(block.querySelectorAll('[role="checkbox"]'));
      if (checkboxes.length > 0) {
        const opts = checkboxes.map(c => (c.getAttribute('aria-label') || c.innerText || c.textContent || '').trim()).filter(Boolean);
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'checkbox',
          options: opts,
          required: isRequired
        });
        return;
      }

      // Paragraph
      if (block.querySelector('textarea')) {
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'paragraph',
          options: [],
          required: isRequired
        });
        return;
      }

      // Short answer
      if (block.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], input[type="url"], input:not([type])')) {
        list.push({
          id: `block_${blockIndex}`,
          title: title,
          type: 'text',
          options: [],
          required: isRequired
        });
        return;
      }
    });

    return list;
  }

  async function fillDateQuestion(item, title, fixedAnswer, aiAnswer) {
    const nativeDate = item.querySelector('input[type="date"]');
    if (nativeDate) {
      let dateVal = fixedAnswer;
      if (!dateVal && aiAnswer) {
        const m = String(aiAnswer).match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (m) dateVal = m[1];
      }
      if (!dateVal) {
        const year = /birth|dob/i.test(title) ? (Math.floor(Math.random() * 30) + 1975) : (Math.floor(Math.random() * 4) + 2021);
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        dateVal = `${year}-${month}-${day}`;
      }
      setNativeValue(nativeDate, dateVal);
      return { type: 'Date', value: dateVal };
    }

    const textInputs = Array.from(item.querySelectorAll('input[type="text"]'));
    if (textInputs.length >= 2) {
      const dayInput = textInputs.find(i => /day|dd/i.test(i.getAttribute('aria-label') || ''));
      const monthInput = textInputs.find(i => /month|mm/i.test(i.getAttribute('aria-label') || ''));
      const yearInput = textInputs.find(i => /year|yyyy/i.test(i.getAttribute('aria-label') || ''));

      if (dayInput || monthInput || yearInput) {
        const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const y = String(Math.floor(Math.random() * 30) + 1985);

        if (dayInput) setNativeValue(dayInput, d);
        if (monthInput) setNativeValue(monthInput, m);
        if (yearInput) setNativeValue(yearInput, y);

        return { type: 'Date', value: `${d}/${m}/${y}` };
      }
    }
    return null;
  }

  async function fillTimeQuestion(item, title, fixedAnswer, aiAnswer) {
    const timeInputs = Array.from(item.querySelectorAll('input[type="time"]'));
    if (timeInputs.length > 0) {
      let val = fixedAnswer;
      if (!val && aiAnswer) {
        const m = String(aiAnswer).match(/\b(\d{2}:\d{2})\b/);
        if (m) val = m[1];
      }
      val = val || '14:30';
      setNativeValue(timeInputs[0], val);
      return { type: 'Time', value: val };
    }

    const inputs = Array.from(item.querySelectorAll('input[type="text"]'));
    const hourInput = inputs.find(i => /hour|hh/i.test(i.getAttribute('aria-label') || ''));
    const minInput = inputs.find(i => /minute|mm/i.test(i.getAttribute('aria-label') || ''));

    if (hourInput && minInput) {
      const h = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const m = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      setNativeValue(hourInput, h);
      setNativeValue(minInput, m);
      return { type: 'Time', value: `${h}:${m}` };
    }
    return null;
  }

  async function fillDropdownQuestion(item, title, fixedAnswer, aiAnswer) {
    const listbox = item.querySelector('div[role="listbox"]');
    if (listbox) {
      listbox.click();
      await sleep(350);

      const options = Array.from(document.querySelectorAll('div[role="option"], div.MocG8c, div.quantumWizMenuPaperselectOption'));
      const validOptions = options.filter(opt => {
        const t = (opt.innerText || opt.textContent || '').trim();
        return t && !/^(choose|select)$/i.test(t);
      });

      if (validOptions.length > 0) {
        let chosen = null;
        if (fixedAnswer) {
          chosen = validOptions.find(opt => {
            const t = (opt.innerText || opt.textContent || '').trim().toLowerCase();
            return t === fixedAnswer.toLowerCase() || t.includes(fixedAnswer.toLowerCase());
          });
        }

        if (!chosen && aiAnswer !== undefined && aiAnswer !== null) {
          const aiStr = String(aiAnswer).trim().toLowerCase();
          chosen = validOptions.find(opt => {
            const t = (opt.innerText || opt.textContent || '').trim().toLowerCase();
            return t === aiStr || t.startsWith(aiStr);
          });
          if (!chosen) {
            console.warn(`[FormPilot AI] Dropdown answer "${aiAnswer}" invalid for "${title}". Falling back to random.`);
          }
        }

        if (!chosen) {
          chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
        }
        const val = (chosen.innerText || chosen.textContent || 'Selected').trim();
        chosen.click();
        await sleep(150);
        return { type: 'Dropdown', value: val };
      }
    }

    const select = item.querySelector('select');
    if (select) {
      const opts = Array.from(select.options);
      const valid = opts.filter(o => o.value && !/choose|select/i.test(o.text));
      if (valid.length > 0) {
        let chosen = null;
        if (fixedAnswer) {
          chosen = valid.find(o => o.text.toLowerCase().includes(fixedAnswer.toLowerCase()));
        }
        if (!chosen && aiAnswer !== undefined && aiAnswer !== null) {
          const aiStr = String(aiAnswer).trim().toLowerCase();
          chosen = valid.find(o => o.text.trim().toLowerCase() === aiStr || o.text.trim().toLowerCase().startsWith(aiStr));
          if (!chosen) {
            console.warn(`[FormPilot AI] Dropdown answer "${aiAnswer}" invalid for "${title}". Falling back to random.`);
          }
        }
        if (!chosen) {
          chosen = valid[Math.floor(Math.random() * valid.length)];
        }
        select.value = chosen.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { type: 'Dropdown', value: chosen.text };
      }
    }

    return null;
  }

  // Extracts all distinct rows from ANY Grid / Table question block
  // Fully supports Multiple-Choice Grids (radios) AND Checkbox Grids (checkboxes)
  function getGridRowsFromBlock(block) {
    // 1. Check for standard container rows (role="radiogroup", role="group", role="row", or tr)
    const rawContainers = Array.from(block.querySelectorAll('[role="radiogroup"], [role="group"]:not([role="listitem"]), [role="row"], tr, div.kzNsGc')).filter(container => {
      const opts = container.querySelectorAll('[role="radio"], [role="checkbox"]');
      return opts.length >= 2 && opts.length <= 10;
    });

    if (rawContainers.length > 1) {
      // Deduplicate: ensure no option is claimed by more than one row container
      const distinctRows = [];
      const claimedOpts = new Set();

      for (const container of rawContainers) {
        const opts = Array.from(container.querySelectorAll('[role="radio"], [role="checkbox"]'));
        const unclaimed = opts.filter(o => !claimedOpts.has(o));
        if (unclaimed.length >= 2) {
          unclaimed.forEach(o => claimedOpts.add(o));
          distinctRows.push({
            element: container,
            options: unclaimed,
            hasChecked: unclaimed.some(o => o.getAttribute('aria-checked') === 'true')
          });
        }
      }

      if (distinctRows.length > 1) {
        return distinctRows;
      }
    }

    // 2. 100% Reliable Fallback: Vertical clustering of options
    const allOptions = Array.from(block.querySelectorAll('[role="radio"], [role="checkbox"]'));
    if (allOptions.length >= 4) {
      // Sort all options vertically
      const sorted = [...allOptions].sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        return rA.top - rB.top;
      });

      const clusters = [];
      let currentCluster = [sorted[0]];
      let currentTop = sorted[0].getBoundingClientRect().top;

      for (let i = 1; i < sorted.length; i++) {
        const opt = sorted[i];
        const top = opt.getBoundingClientRect().top;
        if (Math.abs(top - currentTop) <= 18) {
          currentCluster.push(opt);
        } else {
          if (currentCluster.length >= 2) {
            clusters.push(currentCluster);
          }
          currentCluster = [opt];
          currentTop = top;
        }
      }
      if (currentCluster.length >= 2) {
        clusters.push(currentCluster);
      }

      if (clusters.length > 1) {
        return clusters.map(group => ({
          element: group[0].parentElement || block,
          options: group,
          hasChecked: group.some(o => o.getAttribute('aria-checked') === 'true')
        }));
      }
    }

    return [];
  }

  // Unified Grid Handler (Supports BOTH Multiple-Choice Grids and Checkbox Grids + AI Mode)
  async function fillGridQuestionUnified(item, title, fixedAnswer, aiAnswers, blockIndex) {
    const rows = getGridRowsFromBlock(item);
    if (!rows || rows.length <= 1) {
      return null;
    }

    const selectedValues = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];

      // If this row already has a selected option, do not overwrite/uncheck it!
      const alreadyChecked = row.options.find(o => o.getAttribute('aria-checked') === 'true');
      if (alreadyChecked) {
        selectedValues.push((alreadyChecked.getAttribute('aria-label') || alreadyChecked.getAttribute('data-value') || 'Selected').trim());
        continue;
      }

      const options = row.options;
      if (options.length === 0) continue;

      let chosen = null;
      // Fixed answer override
      if (fixedAnswer) {
        chosen = options.find(opt => {
          const text = (opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.getAttribute('data-answer-value') || opt.innerText || '').toLowerCase();
          return text.includes(fixedAnswer.toLowerCase());
        });
      }

      // AI Answer for this specific row
      if (!chosen && aiAnswers) {
        const rowKey = `block_${blockIndex}_row_${r}`;
        let aiVal = aiAnswers[rowKey];
        if (Array.isArray(aiVal) && aiVal.length > 0) {
          aiVal = aiVal[0];
        }
        if (aiVal !== undefined && aiVal !== null) {
          const aiStr = String(aiVal).trim().toLowerCase();
          chosen = options.find(opt => {
            const text = (opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.getAttribute('data-answer-value') || opt.innerText || '').toLowerCase();
            return text === aiStr || text.startsWith(aiStr);
          });
          if (!chosen) {
            console.warn(`[FormPilot AI] Grid row answer "${aiVal}" invalid for row ${r + 1} of "${title}". Falling back to random.`);
          }
        }
      }

      // Random fallback
      if (!chosen) {
        chosen = options[Math.floor(Math.random() * options.length)];
      }

      let success = await safeSelectOption(chosen);
      // If safeSelectOption failed to check, try another option in the row
      if (!success && row.options.length > 1) {
        for (const fallbackOpt of row.options) {
          if (fallbackOpt !== chosen) {
            success = await safeSelectOption(fallbackOpt);
            if (success) {
              chosen = fallbackOpt;
              break;
            }
          }
        }
      }

      const val = (chosen.getAttribute('aria-label') || chosen.getAttribute('data-value') || chosen.innerText || `Option ${r + 1}`).trim();
      selectedValues.push(val);
      await sleep(60);
    }

    return { type: 'Grid Question', value: selectedValues.join(' | ') };
  }

  // Single Question Radio Handler (Multiple choice & Linear scale + AI validation)
  async function fillRadioQuestion(item, title, fixedAnswer, aiAnswer) {
    const radios = Array.from(item.querySelectorAll('[role="radio"]'));
    if (radios.length === 0) return null;

    // If one is already selected and no fixed override, skip
    const alreadyChecked = item.querySelector('[role="radio"][aria-checked="true"]');
    if (alreadyChecked && !fixedAnswer) {
      return { type: 'Multiple choice', value: (alreadyChecked.getAttribute('aria-label') || alreadyChecked.innerText || 'Selected').trim() };
    }

    const isLinearScale = item.querySelectorAll('[role="radiogroup"]').length > 0 && radios.length >= 3 && /^[0-9]+$/.test((radios[0].innerText || radios[0].getAttribute('data-value') || '').trim());
    const typeLabel = isLinearScale ? 'Linear scale' : 'Multiple choice';

    let chosen = null;
    // 1. Fixed Answer Override
    if (fixedAnswer) {
      chosen = radios.find(r => {
        const label = (
          r.getAttribute('aria-label') ||
          r.getAttribute('data-value') ||
          r.innerText ||
          r.textContent ||
          ''
        ).trim().toLowerCase();
        return label === fixedAnswer.toLowerCase() || label.includes(fixedAnswer.toLowerCase());
      });
    }

    // 2. AI Answer Validation
    if (!chosen && aiAnswer !== undefined && aiAnswer !== null) {
      const aiStr = String(aiAnswer).trim().toLowerCase();
      chosen = radios.find(r => {
        const label = (
          r.getAttribute('aria-label') ||
          r.getAttribute('data-value') ||
          r.innerText ||
          r.textContent ||
          ''
        ).trim().toLowerCase();
        return label === aiStr || label.startsWith(aiStr);
      });
      if (!chosen) {
        console.warn(`[FormPilot AI] Radio answer "${aiAnswer}" invalid for "${title}". Falling back to random.`);
      }
    }

    // 3. Random Fallback
    if (!chosen) {
      const standardRadios = radios.filter(r => {
        const label = (r.getAttribute('aria-label') || r.innerText || '').trim().toLowerCase();
        return !label.startsWith('other');
      });
      const pool = standardRadios.length > 0 ? standardRadios : radios;
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }

    await safeSelectOption(chosen);

    const val = (
      chosen.getAttribute('aria-label') ||
      chosen.getAttribute('data-value') ||
      chosen.innerText ||
      chosen.textContent ||
      'Selected option'
    ).trim();

    return { type: typeLabel, value: val };
  }

  // Standalone Checkbox Handler (Single question with multiple options + AI validation)
  async function fillCheckboxQuestion(item, title, fixedAnswer, aiAnswer) {
    const checkboxes = Array.from(item.querySelectorAll('[role="checkbox"]'));
    if (checkboxes.length === 0) return null;

    const picked = [];

    // 1. Fixed Answer Override
    if (fixedAnswer) {
      const targetAnswers = fixedAnswer.split(',').map(s => s.trim().toLowerCase());
      let matchedAny = false;

      for (const cb of checkboxes) {
        const label = (
          cb.getAttribute('aria-label') ||
          cb.getAttribute('data-answer-value') ||
          cb.innerText ||
          cb.textContent ||
          ''
        ).trim().toLowerCase();

        const isMatch = targetAnswers.some(ans => label === ans || label.includes(ans));
        if (isMatch) {
          if (cb.getAttribute('aria-checked') !== 'true') {
            await safeSelectOption(cb);
            await sleep(50);
          }
          picked.push((cb.getAttribute('aria-label') || cb.innerText || cb.textContent || 'Checked').trim());
          matchedAny = true;
        }
      }

      if (matchedAny) {
        return { type: 'Checkboxes', value: picked.join(', ') };
      }
    }

    // 2. AI Answer Validation
    if (aiAnswer !== undefined && aiAnswer !== null) {
      let targetAnswers = [];
      if (Array.isArray(aiAnswer)) {
        targetAnswers = aiAnswer.map(s => String(s).trim().toLowerCase());
      } else {
        targetAnswers = [String(aiAnswer).trim().toLowerCase()];
      }

      let matchedAny = false;
      for (const cb of checkboxes) {
        const label = (
          cb.getAttribute('aria-label') ||
          cb.getAttribute('data-answer-value') ||
          cb.innerText ||
          cb.textContent ||
          ''
        ).trim().toLowerCase();

        const isMatch = targetAnswers.some(ans => label === ans || label.startsWith(ans));
        if (isMatch) {
          if (cb.getAttribute('aria-checked') !== 'true') {
            await safeSelectOption(cb);
            await sleep(50);
          }
          picked.push((cb.getAttribute('aria-label') || cb.innerText || cb.textContent || 'Option').trim());
          matchedAny = true;
        }
      }

      if (matchedAny) {
        return { type: 'Checkboxes (AI)', value: picked.join(', ') };
      } else {
        console.warn(`[FormPilot AI] Checkbox answer "${JSON.stringify(aiAnswer)}" did not match options for "${title}". Falling back to random.`);
      }
    }

    // 3. Random Fallback: Pick 1 to 3 distinct random options
    const standardCbs = checkboxes.filter(cb => {
      const label = (cb.getAttribute('aria-label') || cb.innerText || '').trim().toLowerCase();
      return !label.startsWith('other');
    });
    const pool = standardCbs.length > 0 ? standardCbs : checkboxes;
    const count = Math.min(pool.length, Math.floor(Math.random() * 3) + 1);
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, count);

    for (const cb of shuffled) {
      if (cb.getAttribute('aria-checked') !== 'true') {
        await safeSelectOption(cb);
        const label = (cb.getAttribute('aria-label') || cb.innerText || cb.textContent || 'Option').trim();
        picked.push(label);
        await sleep(50);
      }
    }

    return { type: 'Checkboxes', value: picked.join(', ') };
  }

  async function fillParagraphQuestion(item, title, fixedAnswer, persona, aiAnswer) {
    const textarea = item.querySelector('textarea');
    if (!textarea) return null;

    let val = fixedAnswer;
    if (!val && aiAnswer) {
      val = String(aiAnswer).trim();
    }
    val = val || persona.getTextForTitle(title, 'textarea');

    textarea.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    await sleep(30);
    setNativeValue(textarea, val);
    return { type: 'Paragraph', value: val };
  }

  async function fillShortAnswerQuestion(item, title, fixedAnswer, persona, aiAnswer) {
    const input = item.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], input[type="url"], input:not([type])');
    if (!input || input.type === 'hidden') return null;

    const inputType = input.getAttribute('type') || 'text';
    let val = fixedAnswer;
    if (!val && aiAnswer) {
      val = String(aiAnswer).trim();
    }
    val = val || persona.getTextForTitle(title, inputType);

    input.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    await sleep(30);
    setNativeValue(input, val);
    return { type: 'Short answer', value: val };
  }

  // Single Question Handler
  async function fillSingleQuestion(item, persona, fixedAnswers, useRandomFallback = true, aiAnswers = null, blockIndex = 0) {
    try {
      const title = getQuestionTitle(item);
      const fixedAnswer = findFixedAnswer(title, fixedAnswers);
      const blockAiAns = aiAnswers ? aiAnswers[`block_${blockIndex}`] : null;

      if (isFileUpload(item)) {
        console.warn(`[FormPilot] Skipping file-upload question: "${title}"`);
        return { type: 'File Upload (Skipped)', value: '[SKIPPED]' };
      }

      const required = isQuestionRequired(item);

      // If optional and AI explicitly returned empty string, leave it blank (human-like skipping)
      if (!required && blockAiAns === '') {
        console.log(`[FormPilot] Skipping optional question "${title}" as per AI respondent behavior.`);
        return { type: 'Optional (Skipped by AI)', value: '[SKIPPED]' };
      }

      if (!fixedAnswer && !blockAiAns && !useRandomFallback) {
        return null;
      }

      let result = await fillDateQuestion(item, title, fixedAnswer, blockAiAns);
      if (!result) result = await fillTimeQuestion(item, title, fixedAnswer, blockAiAns);
      if (!result) result = await fillDropdownQuestion(item, title, fixedAnswer, blockAiAns);
      if (!result) result = await fillGridQuestionUnified(item, title, fixedAnswer, aiAnswers, blockIndex);
      if (!result) result = await fillRadioQuestion(item, title, fixedAnswer, blockAiAns);
      if (!result) result = await fillCheckboxQuestion(item, title, fixedAnswer, blockAiAns);
      if (!result) result = await fillParagraphQuestion(item, title, fixedAnswer, persona, blockAiAns);
      if (!result) result = await fillShortAnswerQuestion(item, title, fixedAnswer, persona, blockAiAns);

      if (result) {
        console.log(`[FormPilot] Question: "${title || '(Untitled)'}" | Type: ${result.type} | Value: "${result.value}"`);
        return result;
      }
      return null;
    } catch (err) {
      console.warn('[FormPilot] Error filling question block:', err);
      return null;
    }
  }

  // Comprehensive, bulletproof checker: ensures EVERY required field and row is filled
  async function ensurePageCompletelyFilled(visibleBlocks, persona, fixedAnswers, useRandomFallback) {
    for (const block of visibleBlocks) {
      // 1. Grid rows verification (BOTH radios and checkboxes)
      const rows = getGridRowsFromBlock(block);
      if (rows.length > 0) {
        for (const row of rows) {
          const hasChecked = row.options.some(o => o.getAttribute('aria-checked') === 'true');
          if (!hasChecked && row.options.length > 0) {
            for (const pick of row.options) {
              const success = await safeSelectOption(pick);
              if (success) break;
            }
            await sleep(50);
          }
        }
        continue; // This was a grid block, rows are handled!
      }

      // 2. Standalone radio question verification
      const radios = Array.from(block.querySelectorAll('[role="radio"]'));
      if (radios.length > 0 && !block.querySelector('[aria-checked="true"]')) {
        const standardRadios = radios.filter(r => {
          const label = (r.getAttribute('aria-label') || r.innerText || '').trim().toLowerCase();
          return !label.startsWith('other');
        });
        const pool = standardRadios.length > 0 ? standardRadios : radios;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        await safeSelectOption(pick);
        await sleep(50);
      }

      // 3. Standalone checkboxes verification (single question with multiple checkboxes)
      const cbs = Array.from(block.querySelectorAll('[role="checkbox"]'));
      if (cbs.length > 0 && !block.querySelector('[aria-checked="true"]')) {
        const pick = cbs[Math.floor(Math.random() * cbs.length)];
        await safeSelectOption(pick);
        await sleep(50);
      }

      // 4. Text and Textarea inputs verification
      const textInputs = Array.from(block.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), textarea'));
      for (const input of textInputs) {
        if (input.type === 'hidden') continue;
        if (!input.value || input.value.trim() === '') {
          const title = getQuestionTitle(block);
          const fixed = findFixedAnswer(title, fixedAnswers);
          const val = fixed || persona.getTextForTitle(title, input.getAttribute('type') || 'text');
          setNativeValue(input, val);
          await sleep(30);
        }
      }
    }

    // 5. Page-wide fallback for ANY unselected radio or checkbox row
    const allBlocks = visibleBlocks.length > 0 ? visibleBlocks : Array.from(document.querySelectorAll('div[role="listitem"]'));
    for (const block of allBlocks) {
      const rows = getGridRowsFromBlock(block);
      for (const row of rows) {
        const hasChecked = row.options.some(o => o.getAttribute('aria-checked') === 'true');
        if (!hasChecked && row.options.length > 0) {
          for (const pick of row.options) {
            const success = await safeSelectOption(pick);
            if (success) break;
          }
          await sleep(50);
        }
      }
    }

    // 6. Direct alert resolution: Any question showing a validation error
    const alerts = getVisibleValidationErrors();
    for (const alert of alerts) {
      const block = alert.closest('div[role="listitem"]');
      if (block) {
        const rows = getGridRowsFromBlock(block);
        if (rows.length > 0) {
          for (const row of rows) {
            const hasChecked = row.options.some(o => o.getAttribute('aria-checked') === 'true');
            if (!hasChecked && row.options.length > 0) {
              for (const pick of row.options) {
                const success = await safeSelectOption(pick);
                if (success) break;
              }
              await sleep(50);
            }
          }
        } else {
          const anyOpts = Array.from(block.querySelectorAll('[role="radio"], [role="checkbox"]'));
          if (anyOpts.length > 0 && !block.querySelector('[aria-checked="true"]')) {
            await safeSelectOption(anyOpts[Math.floor(Math.random() * anyOpts.length)]);
            await sleep(50);
          }
        }
      }
    }
  }

  // Navigation Finders
  function findNextButton() {
    const candidates = Array.from(document.querySelectorAll('div[role="button"], button'));
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || el.offsetParent === null) continue;

      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
      if (/^(next|continue)\b/i.test(text) || /\bnext\b/i.test(text)) {
        if (!/back|clear|previous/i.test(text)) {
          return el;
        }
      }
    }
    return null;
  }

  function findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('div[role="button"], button, input[type="submit"]'));
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || el.offsetParent === null) continue;

      const text = (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
      if (/^submit\b/i.test(text) || /\bsubmit\b/i.test(text)) {
        if (!/back|clear|next/i.test(text)) {
          return el;
        }
      }
    }
    return null;
  }

  function getVisibleValidationErrors() {
    const alerts = Array.from(document.querySelectorAll('[role="alert"], [aria-invalid="true"], .RHiSd'));
    return alerts.filter(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || '').trim();
      return rect.width > 0 && rect.height > 0 && text.length > 0;
    });
  }

  // True Confirmation Page Check:
  // Must have NO questions, NO navigation buttons, and must contain the recorded message or submit another link
  function isActualConfirmationPage() {
    const questionBlocks = document.querySelectorAll('div[role="listitem"]');
    if (questionBlocks.length > 0) {
      return false; // Ongoing form!
    }

    if (findNextButton() || findSubmitButton()) {
      return false; // Navigation buttons present = ongoing form!
    }

    const text = document.body ? (document.body.innerText || '') : '';
    const hasRecorded = /your response has been recorded/i.test(text);
    const hasAnotherLink = Array.from(document.querySelectorAll('a')).some(a =>
      /submit another response/i.test(a.innerText || a.textContent || '')
    );

    return hasRecorded || hasAnotherLink;
  }

  // Directly navigates the browser to a fresh form URL without requiring user clicks
  async function navigateToFreshForm() {
    const links = Array.from(document.querySelectorAll('a'));
    const link = links.find(a =>
      /submit another response/i.test(a.innerText || a.textContent || '')
    );

    let targetUrl = null;
    if (link && link.href) {
      targetUrl = link.href;
    } else {
      targetUrl = window.location.href.split('?')[0].replace(/\/formResponse.*$/, '/viewform');
    }

    console.log(`[FormPilot] Auto-navigating to fresh form: ${targetUrl}`);
    if (link) {
      try { link.click(); } catch (_) {}
    }
    await sleep(200);
    window.location.href = targetUrl;
  }

  // Unstoppable Next-Page Transition Loop
  async function advanceToNextPageUnstoppable(nextBtn, startPageInfo, currentVisibleBlocks, persona, fixedAnswers, useRandomFallback) {
    const oldPageNum = startPageInfo.current;
    const oldCoaster = startPageInfo.coasterCode;
    const oldBlocksSet = new Set(currentVisibleBlocks);

    let attempt = 0;

    while (true) {
      if (!(await isStillRunning())) return false;
      attempt++;

      console.log(`[FormPilot] Clicking Next button (attempt ${attempt})...`);
      safeClickButton(nextBtn);

      const waitStart = Date.now();

      while (Date.now() - waitStart < 6000) {
        if (!(await isStillRunning())) return false;
        await sleep(250);

        if (isActualConfirmationPage()) {
          return true;
        }

        if (findSubmitButton()) {
          return true;
        }

        const currentInfo = getCurrentPageInfo();
        if (oldPageNum && currentInfo.current && currentInfo.current !== oldPageNum) {
          return true;
        }

        if (oldCoaster && currentInfo.coasterCode && currentInfo.coasterCode !== oldCoaster) {
          return true;
        }

        const newBlocks = getVisibleQuestionBlocks();
        if (newBlocks.length > 0 && newBlocks.some(b => !oldBlocksSet.has(b))) {
          return true;
        }
      }

      console.warn(`[FormPilot] Page did not advance after attempt ${attempt}. Self-healing missing fields...`);
      await chrome.storage.local.set({
        currentPageStatus: `Advancing from ${startPageInfo.pageText || 'current page'} (Retry ${attempt})...`
      });

      await ensurePageCompletelyFilled(currentVisibleBlocks, persona, fixedAnswers, useRandomFallback);
      await sleep(300);

      nextBtn = findNextButton();
      if (!nextBtn) {
        if (findSubmitButton() || isActualConfirmationPage()) {
          return true;
        }
        const check = getCurrentPageInfo();
        if (oldPageNum && check.current && check.current !== oldPageNum) {
          return true;
        }
        await sleep(1000);
        nextBtn = findNextButton();
      }

      if (attempt >= 5) {
        console.warn(`[FormPilot] Still on ${startPageInfo.pageText || 'same page'}. If an ad blocker (e.g. uBlock Origin) is active, please pause it for docs.google.com.`);
      }
    }
  }

  // Final Submit Handler with Persistent Retries
  async function clickSubmitWithRetry(submitBtn, visibleBlocks, persona, fixedAnswers, useRandomFallback) {
    let attempt = 0;
    while (true) {
      if (!(await isStillRunning())) return false;
      attempt++;

      console.log(`[FormPilot] Clicking final Submit button (attempt ${attempt})...`);
      safeClickButton(submitBtn);

      const waitStart = Date.now();
      while (Date.now() - waitStart < 8000) {
        if (!(await isStillRunning())) return false;
        await sleep(300);

        if (isActualConfirmationPage()) {
          console.log('[FormPilot] Final confirmation page reached!');
          await handleConfirmationPage();
          return true;
        }
      }

      console.warn(`[FormPilot] Confirmation not reached yet. Re-verifying fields on final page...`);
      await ensurePageCompletelyFilled(visibleBlocks, persona, fixedAnswers, useRandomFallback);
      await sleep(400);

      submitBtn = findSubmitButton();
      if (!submitBtn) {
        if (isActualConfirmationPage()) {
          await handleConfirmationPage();
          return true;
        }
        await sleep(1000);
        submitBtn = findSubmitButton();
      }
    }
  }

  // Main Form Filling Routine supporting Multi-Page Forms & Gemini AI
  async function fillAndSubmitForm() {
    if (isFillingActive) {
      return;
    }
    if (!(await isStillRunning())) {
      return;
    }

    isFillingActive = true;
    try {
      const state = await chrome.storage.local.get([
        'fixedAnswers', 'done', 'total', 'useRandomFallback',
        'useAiAnswers', 'personaHint', 'apiKey'
      ]);
      const fixedAnswers = state.fixedAnswers || [];
      const done = state.done || 0;
      const total = state.total || 10;
      const useRandomFallback = state.useRandomFallback !== false;
      const useAiAnswers = Boolean(state.useAiAnswers);
      const personaHint = state.personaHint || '';

      // If AI mode is on, verify API key
      if (useAiAnswers) {
        if (!state.apiKey || !state.apiKey.trim()) {
          console.error('[FormPilot] Gemini API key is missing. Halting.');
          await chrome.storage.local.set({
            running: false,
            statusMessage: 'Stopped: Gemini API key missing. Open settings to configure.'
          });
          return;
        }
      }

      console.log(`%c[FormPilot] === Starting Form Submission (${done + 1} / ${total}) [Mode: ${useAiAnswers ? 'Gemini AI' : 'Random'}] ===`, 'color: #673ab7; font-weight: bold; font-size: 14px;');

      const persona = createPersona();
      let pageStep = 1;
      const maxSteps = 150; // Plenty of headroom for 43+ pages

      while (pageStep <= maxSteps) {
        if (!(await isStillRunning())) {
          console.log('[FormPilot] Aborted by user.');
          return;
        }

        const pageInfo = getCurrentPageInfo();
        const pageLabel = pageInfo.pageText || `Step ${pageStep}`;

        console.log(`%c[FormPilot] --- Processing ${pageLabel} ---`, 'color: #1976d2; font-weight: bold;');
        await chrome.storage.local.set({
          currentPageStatus: `Filling ${pageLabel} (Response ${done + 1} / ${total})...`
        });

        // 1. Get visible questions on current page
        await sleep(300);
        const visibleBlocks = getVisibleQuestionBlocks();
        console.log(`[FormPilot] ${pageLabel}: Found ${visibleBlocks.length} visible items.`);

        // 2. If AI mode is enabled, request answers for visible questions in ONE request with multimodal vision
        let aiAnswers = null;
        if (useAiAnswers && visibleBlocks.length > 0) {
          const aiQuestions = scanVisibleQuestionsForAi(visibleBlocks);
          if (aiQuestions.length > 0) {
            const sectionInfo = getActiveSectionInfo();
            const sectionImages = collectStimulusImages();

            await chrome.storage.local.set({
              currentPageStatus: `Generating AI vision answers for ${sectionInfo.title} via Gemini...`
            });

            try {
              const aiRes = await chrome.runtime.sendMessage({
                action: 'GET_AI_ANSWERS',
                stimulus: {
                  sectionTitle: sectionInfo.title,
                  sectionDescription: sectionInfo.description,
                  images: sectionImages,
                  questions: aiQuestions
                },
                personaHint: personaHint,
                submissionIndex: done
              });

              if (aiRes && aiRes.success) {
                aiAnswers = aiRes.answers || {};
                console.log(`[FormPilot] Received Gemini AI vision answers for ${pageLabel} (${sectionInfo.title}):`, aiAnswers);
              } else {
                const errMsg = aiRes ? (aiRes.message || aiRes.error) : 'Unknown AI error';
                console.warn(`[FormPilot] Gemini AI generation error: ${errMsg}`);

                if (/invalid api key/i.test(errMsg)) {
                  await chrome.storage.local.set({
                    running: false,
                    statusMessage: 'Stopped: Invalid Gemini API key. Check settings.'
                  });
                  return;
                }
                if (/rate limit/i.test(errMsg)) {
                  await chrome.storage.local.set({
                    running: false,
                    statusMessage: 'Stopped: Gemini API rate limit exceeded.'
                  });
                  return;
                }

                if (!useRandomFallback) {
                  await chrome.storage.local.set({
                    running: false,
                    statusMessage: `Stopped: ${errMsg}`
                  });
                  return;
                }
                console.log('[FormPilot] Falling back to random dummy data for this page.');
              }
            } catch (msgErr) {
              console.warn('[FormPilot] Error communicating with background worker:', msgErr);
              if (!useRandomFallback) {
                await chrome.storage.local.set({
                  running: false,
                  statusMessage: 'Stopped: Failed to contact background worker.'
                });
                return;
              }
            }
          }
        }

        // 3. Fill all visible questions on this page
        for (let i = 0; i < visibleBlocks.length; i++) {
          if (!(await isStillRunning())) return;
          const block = visibleBlocks[i];
          await fillSingleQuestion(block, persona, fixedAnswers, useRandomFallback, aiAnswers, i);

          if (i < visibleBlocks.length - 1) {
            await randomDelay(60, 150);
          }
        }

        // 4. Pre-flight verification: Guarantee ALL required fields and grid rows are filled!
        await ensurePageCompletelyFilled(visibleBlocks, persona, fixedAnswers, useRandomFallback);

        if (!(await isStillRunning())) return;
        await sleep(200);

        // 5. Look for navigation buttons (with polling grace period)
        let submitBtn = findSubmitButton();
        let nextBtn = findNextButton();

        if (!submitBtn && !nextBtn) {
          for (let b = 0; b < 25; b++) {
            await sleep(200);
            if (!(await isStillRunning())) return;
            if (isActualConfirmationPage()) {
              await handleConfirmationPage();
              return;
            }
            submitBtn = findSubmitButton();
            nextBtn = findNextButton();
            if (submitBtn || nextBtn) break;
          }
        }

        // If we reached the final confirmation screen:
        if (isActualConfirmationPage()) {
          await handleConfirmationPage();
          return;
        }

        // Handle Submit button on final page (Page 43)
        if (submitBtn) {
          console.log(`[FormPilot] Found Submit button on ${pageLabel}. Submitting final form response...`);
          await clickSubmitWithRetry(submitBtn, visibleBlocks, persona, fixedAnswers, useRandomFallback);
          return;
        }

        // Handle Next button on intermediate pages with an UNSTOPPABLE retry loop
        if (nextBtn) {
          console.log(`[FormPilot] ${pageLabel} complete. Advancing to next page...`);
          const advanced = await advanceToNextPageUnstoppable(nextBtn, pageInfo, visibleBlocks, persona, fixedAnswers, useRandomFallback);
          if (!advanced) {
            return; // Stopped by user
          }
          pageStep++;
          continue;
        }

        // If navigation button temporarily not found, wait and retry without stopping
        console.warn(`[FormPilot] Navigation button temporarily not visible on ${pageLabel}. Waiting...`);
        await sleep(1500);
      }
    } finally {
      isFillingActive = false;
    }
  }

  // Confirmation Page Handler (Auto-increments done, waits delay, and forces navigation to fresh form)
  async function handleConfirmationPage() {
    if (isHandlingConfirmation) return;
    isHandlingConfirmation = true;

    try {
      const data = await chrome.storage.local.get(['running', 'done', 'total', 'delay', 'lastRecordedAt', 'useAiAnswers']);
      if (!data.running) return;

      const total = Number(data.total) || 10;
      let currentDone = Number(data.done) || 0;
      // Default 4 seconds delay in AI mode to respect Gemini API rate limits
      const defaultDelay = data.useAiAnswers ? 4 : 2;
      const delay = data.delay !== undefined ? Number(data.delay) : defaultDelay;

      // Deduplicate: If confirmation was processed within the last 5 seconds, don't increment done again
      const now = Date.now();
      const lastRecordedAt = data.lastRecordedAt || 0;
      if (now - lastRecordedAt > 5000) {
        currentDone += 1;
        await chrome.storage.local.set({
          done: currentDone,
          lastRecordedAt: now
        });
      }

      console.log(`[FormPilot] Confirmation recorded! Done: ${currentDone} / ${total}`);

      if (currentDone >= total) {
        await chrome.storage.local.set({
          done: currentDone,
          running: false,
          statusMessage: `Finished (${currentDone} / ${total})`,
          currentPageStatus: 'All responses completed.'
        });
        console.log(`%c[FormPilot] Completed all ${total} responses across all pages! Finished.`, 'color: #2e7d32; font-weight: bold;');
        return;
      }

      // More responses remain
      await chrome.storage.local.set({
        done: currentDone,
        statusMessage: `Submitted ${currentDone} / ${total}`,
        currentPageStatus: `Waiting ${delay}s before starting Response ${currentDone + 1}...`
      });

      console.log(`[FormPilot] Waiting ${delay}s before next response...`);
      const delayMs = Math.max(500, delay * 1000);
      const steps = Math.ceil(delayMs / 100);
      for (let s = 0; s < steps; s++) {
        await sleep(100);
        if (!(await isStillRunning())) {
          console.log('[FormPilot] Stopped during delay interval.');
          return;
        }
      }

      // Auto-navigate to fresh form via direct location change
      await navigateToFreshForm();
    } finally {
      isHandlingConfirmation = false;
    }
  }

  // Page Routing & Initialization
  async function init() {
    const data = await chrome.storage.local.get(['running', 'done', 'total']);
    if (!data.running) return;

    // Check if this is the confirmation screen
    if (isActualConfirmationPage()) {
      await handleConfirmationPage();
      return;
    }

    // Wait patiently for Google Forms DOM elements to hydrate (up to 12 seconds)
    let isReady = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (!(await isStillRunning())) return;

      if (isActualConfirmationPage()) {
        await handleConfirmationPage();
        return;
      }

      if (document.querySelectorAll('div[role="listitem"]').length > 0 || findNextButton() || findSubmitButton()) {
        isReady = true;
        break;
      }
      await sleep(200);
    }

    if (isReady) {
      const current = await chrome.storage.local.get(['running', 'done', 'total']);
      if (current.running && (current.done || 0) < (current.total || 10)) {
        await sleep(400);
        await fillAndSubmitForm();
      }
    }
  }

  // Watchdog Timer: Runs every 2 seconds to ensure the extension never gets stuck or paused
  setInterval(async () => {
    if (isFillingActive || isHandlingConfirmation) return;
    const data = await chrome.storage.local.get(['running', 'done', 'total']);
    if (!data.running) return;

    if (isActualConfirmationPage()) {
      await handleConfirmationPage();
      return;
    }

    if ((data.done || 0) < (data.total || 10)) {
      const hasFormElements = document.querySelectorAll('div[role="listitem"]').length > 0 || findNextButton() || findSubmitButton();
      if (hasFormElements) {
        fillAndSubmitForm();
      }
    }
  }, 2000);

  // Message listener from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START') {
      abortRequested = false;
      isRunningCached = true;
      isFillingActive = false;
      isHandlingConfirmation = false;

      if (isActualConfirmationPage()) {
        navigateToFreshForm();
      } else {
        fillAndSubmitForm();
      }
      sendResponse({ status: 'started' });
    } else if (request.action === 'STOP') {
      abortRequested = true;
      isRunningCached = false;
      isFillingActive = false;
      isHandlingConfirmation = false;
      console.log('[FormPilot] Received STOP command from popup.');
      sendResponse({ status: 'stopped' });
    } else if (request.action === 'SCAN_QUESTIONS') {
      const visible = getVisibleQuestionBlocks();
      const titles = visible.map(b => getQuestionTitle(b)).filter(Boolean);
      sendResponse({ titles });
    }
    return true;
  });

  // Storage listener for state changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.running) {
      if (changes.running.newValue === false) {
        abortRequested = true;
        isRunningCached = false;
        isFillingActive = false;
        isHandlingConfirmation = false;
      } else if (changes.running.newValue === true) {
        abortRequested = false;
        isRunningCached = true;
        isFillingActive = false;
        isHandlingConfirmation = false;
        if (isActualConfirmationPage()) {
          navigateToFreshForm();
        } else {
          fillAndSubmitForm();
        }
      }
    }
  });

  // Run on load
  init();
})();
