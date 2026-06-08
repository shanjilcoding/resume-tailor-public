const WORKDAY_SCRIPT_TEMPLATE = `(async function () {
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ─────────────────────────────────────────────────────────────
  // RESUME DATA — keys are Workday label text
  // ─────────────────────────────────────────────────────────────
  const RESUME_DATA = __RESUME_DATA_PLACEHOLDER__;

  // ─────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────
  const AUTO_CONFIRM_SECONDS = 8;
  const HARDCODED_OPTIONS = {
    'reading':  ['Advanced', 'Beginner', 'Classroom', 'Fluent', 'Intermediate'],
    'speaking': ['Advanced', 'Beginner', 'Classroom', 'Fluent', 'Intermediate'],
    'writing':  ['Advanced', 'Beginner', 'Classroom', 'Fluent', 'Intermediate']
  };

  function normalize(s) {
    return String(s || '').toLowerCase().trim().replace(/['']/g, '').replace(/\\s+/g, ' ').replace(/[:*]/g, '').trim();
  }

  function stem(s) {
    let n = normalize(s);
    if (n.endsWith('s') && !n.endsWith('ss')) n = n.slice(0, -1);
    return n;
  }

  function visibleText(el) {
    return String(el?.textContent || el?.value || '').trim().replace(/\\s+/g, ' ');
  }

  function realClick(el) {
    if (!el) return false;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  }

  function scoreDegreeOption(option, userValue) {
    const o = normalize(option);
    const u = normalize(userValue);
    let score = 0;
    if (o === u) score += 100;
    if (o.includes(u)) score += 50;
    if (u.includes(o)) score += 40;
    if (o.includes('bachelor')) score += 20;
    if (o.includes('degree')) score += 12;
    if (o.includes('science')) score += 25;
    if (o.includes('computer')) score += 10;
    if (o.includes('arts')) score -= 50;
    if (o === 'bachelor of arts') score -= 100;
    return score;
  }

  function readWrapperValue(wrapper) {
    return [...wrapper.querySelectorAll('input, textarea, [role="button"], button, [data-automation-id*="selected"], [data-automation-id*="Selected"]')]
      .filter(el => el.offsetParent !== null)
      .map(el => el.value || el.textContent || '')
      .join(' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  // ─────────────────────────────────────────────────────────────
  // CLOSE STRATEGY — real outside double-click as primary
  // ─────────────────────────────────────────────────────────────
  function isAnyDropdownOpen() {
    return !!document.querySelector('[role="listbox"], [data-automation-id="activeListContainer"]')
        || [...document.querySelectorAll('[role="option"], [data-automation-id="menuItem"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"]')]
             .some(el => el.offsetParent !== null);
  }

  function mouseSeq(el, x = 20, y = 20) {
    if (!el) return;
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
    }
  }

  async function fastClose() {
    if (document.activeElement && document.activeElement.blur) {
      try { document.activeElement.blur(); } catch(e) {}
    }
    for (let i = 0; i < 2; i++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, keyCode: 27 }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, keyCode: 27 }));
      await wait(80);
    }
    for (let i = 0; i < 2; i++) {
      const target = document.elementFromPoint(25, 25) || document.body;
      mouseSeq(target, 25, 25);
      target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window, clientX: 25, clientY: 25 }));
      try { target.click(); } catch(e) {}
      await wait(220);
    }
    await wait(250);
    return !isAnyDropdownOpen();
  }

  async function forceCloseDropdowns(label = '') {
    return await fastClose();
  }

  function visibleListboxes({ exclude = new Set() } = {}) {
    return [...document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]')]
      .filter(el => el.offsetParent !== null && !exclude.has(el));
  }

  // ─────────────────────────────────────────────────────────────
  // SECTIONS
  // ─────────────────────────────────────────────────────────────
  const SECTION_ALIASES = {
    workExperience: ['Work Experience', 'Work History', 'Employment History', 'Professional Experience', 'Experience'],
    education:      ['Education', 'Education and Training', 'Academic Background', 'Academic History'],
    certifications: ['Certifications', 'Licenses & Certifications', 'Certifications & Licenses'],
    languages:      ['Languages', 'Language Skills', 'Language Proficiencies'],
    websites:       ['Websites', 'Website', 'Web Presence', 'Online Profiles'],
    skills:         ['Skills', 'Skill', 'Type to Add Skills']
  };

  function findSection(aliases, { requireAddBtn = true } = {}) {
    const headingSelectors = ['h2', 'h3', 'h4', 'h5', 'h6', '[class*="heading"]', '[class*="title"]'];
    for (const alias of aliases) {
      for (const sel of headingSelectors) {
        const heading = [...document.querySelectorAll(sel)]
          .find(el => el.textContent.trim() === alias && el.offsetParent !== null);
        if (heading) {
          let el = heading.parentElement;
          for (let d = 0; d < 15; d++) {
            if (!el || el === document.body) break;
            const hasAddBtn = el.querySelector('[data-automation-id="add-button"]');
            const hasInput = el.querySelector('input, [role="combobox"]');
            if ((requireAddBtn && hasAddBtn) || (!requireAddBtn && hasInput)) {
              return { container: el, heading: alias, headingEl: heading };
            }
            el = el.parentElement;
          }
        }
      }
    }
    return null;
  }

  console.log('🔎 Resume Tailor Workday Assistant');
  console.log('   Phase 1: Scanning page...');

  const sections = {};
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    const r = findSection(aliases, { requireAddBtn: key !== 'skills' });
    if (r) sections[key] = r;
  }
  console.log('   Found sections:', Object.keys(sections).join(', '));

  // ─────────────────────────────────────────────────────────────
  // TEMP ENTRIES
  // ─────────────────────────────────────────────────────────────
  const addedTempEntries = [];
  for (const [key, section] of Object.entries(sections)) {
    if (key === 'skills') continue;
    if (section.container.querySelector('[data-automation-id^="formField-"]')) continue;
    const addBtn = section.container.querySelector('[data-automation-id="add-button"]');
    if (addBtn) {
      addBtn.click();
      await wait(900);
      addedTempEntries.push({ section, key });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FIELD DETECTION
  // ─────────────────────────────────────────────────────────────
  function detectFieldType(wrapper) {
    if (wrapper.querySelector('[data-automation-id^="dateSection"]')) return 'date';
    if (wrapper.querySelector('textarea')) return 'textarea';
    if (wrapper.querySelector('[data-automation-id*="ultiselect"], [data-automation-id*="ultiSelect"]')) return 'searchable';
    if (wrapper.querySelector('input[role="combobox"]') || wrapper.querySelector('input[aria-haspopup="listbox"]')) return 'searchable';
    if (wrapper.querySelector('button[aria-haspopup]') || wrapper.querySelector('[role="combobox"]:not(input)') || wrapper.querySelector('[data-automation-id*="promptIcon"]')) return 'dropdown';
    const cb = wrapper.querySelector('input[type="checkbox"]');
    const otherInput = wrapper.querySelector('input:not([type="checkbox"]), textarea');
    if (cb && !otherInput) return 'checkbox';
    if (wrapper.querySelector('input')) return 'text';
    return 'unknown';
  }

  function discoverFieldsIn(container) {
    const fields = [];
    const seen = new Set();
    container.querySelectorAll('[data-automation-id^="formField-"]').forEach(wrapper => {
      if (seen.has(wrapper)) return;
      seen.add(wrapper);
      let label = '';
      const labelEl = wrapper.querySelector('label');
      if (labelEl) label = labelEl.textContent.replace(/\\*/g, '').trim();
      if (!label) {
        const inputEl = wrapper.querySelector('input, textarea, button, [role="combobox"]');
        if (inputEl?.id) {
          const lbl = container.querySelector('label[for="' + inputEl.id + '"]');
          if (lbl) label = lbl.textContent.replace(/\\*/g, '').trim();
        }
      }
      if (!label) {
        const prev = wrapper.previousElementSibling;
        if (prev?.tagName === 'LABEL') label = prev.textContent.replace(/\\*/g, '').trim();
      }
      fields.push({
        wrapper, label,
        labelNorm: normalize(label),
        automationId: wrapper.getAttribute('data-automation-id') || '',
        type: detectFieldType(wrapper)
      });
    });
    return fields;
  }

  // ─────────────────────────────────────────────────────────────
  // OPTION SCRAPING
  // ─────────────────────────────────────────────────────────────
  function collectOptionsFrom(container) {
    if (!container) return [];
    return [...container.querySelectorAll('[role="option"], [data-automation-id="menuItem"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"]')]
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent.trim())
      .filter(t => t && t !== 'Select One' && t !== 'No Items.' && t !== 'Loading...' && !t.startsWith('Search Results'));
  }

  function collectVisibleOptionElements(container) {
    if (!container) return [];
    return [...container.querySelectorAll('[role="option"], [data-automation-id="menuItem"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"]')]
      .filter(el => el.offsetParent !== null);
  }

  function findActiveListContainer(beforeSet) {
    const all = [...document.querySelectorAll('[data-automation-id="activeListContainer"], [role="listbox"]')];
    const fresh = all.filter(c => !beforeSet.has(c) && c.offsetParent !== null);
    if (fresh.length > 0) return fresh[fresh.length - 1];
    return all.filter(c => c.offsetParent !== null).pop() || null;
  }

  function findScrollContainer(listbox) {
    if (!listbox) return null;
    let el = listbox;
    for (let i = 0; i < 5 && el; i++) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el;
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) return el;
      el = el.parentElement;
    }
    return listbox;
  }

  async function scrapeOptions(wrapper, label, { isSearchable = false } = {}) {
    await fastClose();
    const before = new Set(document.querySelectorAll('[data-automation-id="activeListContainer"], [role="listbox"]'));
    const trigger = isSearchable
      ? (wrapper.querySelector('input, [role="combobox"], button') || wrapper)
      : (wrapper.querySelector('button, [role="button"], [role="combobox"]') || wrapper);
    if (!trigger) return [];
    try {
      trigger.click();
      if (trigger.focus) trigger.focus();
      await wait(isSearchable ? 1000 : 700);
      let target = findActiveListContainer(before);
      if (!target && isSearchable) {
        const inner = wrapper.querySelector('input');
        if (inner) { inner.click(); inner.focus(); await wait(700); target = findActiveListContainer(before); }
      }
      if (!target) { await fastClose(); return []; }
      const scrollEl = findScrollContainer(target);
      scrollEl.scrollTop = 0;
      await wait(200);
      const needsScroll = scrollEl.scrollHeight > scrollEl.clientHeight + 10;
      const collected = new Set();
      if (!needsScroll) {
        for (const t of collectOptionsFrom(target)) collected.add(t);
      } else {
        let lastScroll = -1, stable = 0;
        for (let i = 0; i < 80; i++) {
          for (const t of collectOptionsFrom(target)) collected.add(t);
          const cur = scrollEl.scrollTop;
          if (cur === lastScroll) { stable++; if (stable >= 3) break; } else stable = 0;
          lastScroll = cur;
          scrollEl.scrollTop = cur + 400;
          await wait(120);
        }
      }
      await fastClose();
      return [...collected];
    } catch (e) {
      await fastClose();
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCAN
  // ─────────────────────────────────────────────────────────────
  const pageFields = {};
  const scanStart = Date.now();

  for (const [key, section] of Object.entries(sections)) {
    if (key === 'skills') {
      pageFields[key] = [{ type: 'multiAdd', container: section.container }];
      continue;
    }
    const fields = discoverFieldsIn(section.container);
    const seenAutoIds = new Set();
    const unique = [];
    for (const f of fields) {
      if (seenAutoIds.has(f.automationId)) continue;
      seenAutoIds.add(f.automationId);
      unique.push(f);
    }
    for (const f of unique) {
      if (f.type === 'dropdown' || f.type === 'searchable') {
        const hard = HARDCODED_OPTIONS[f.labelNorm];
        if (hard) {
          f.options = hard;
          console.log('   · ' + f.label + ' (' + f.type + ', hardcoded ' + hard.length + ' options)');
        } else {
          f.options = await scrapeOptions(f.wrapper, f.label, { isSearchable: f.type === 'searchable' });
          console.log('   · ' + f.label + ' (' + f.type + ', ' + f.options.length + ' options)');
        }
      } else {
        console.log('   · ' + f.label + ' (' + f.type + ')');
      }
    }
    pageFields[key] = unique;
  }

  for (const _ of addedTempEntries) {
    const delBtn = [...document.querySelectorAll('[role="button"], button, a')]
      .find(el => el.textContent.trim() === 'Delete' && el.offsetParent !== null);
    if (delBtn) { delBtn.click(); await wait(600); }
  }

  const scanElapsed = ((Date.now() - scanStart) / 1000).toFixed(1);
  console.log('\\n   Phase 1 complete in ' + scanElapsed + 's.');

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: PRE-RESOLVE
  // ─────────────────────────────────────────────────────────────
  console.log('\\n   Phase 2: Pre-resolving values against page options...');

  function findBestMatch(userValue, options, context = {}) {
    if (!options || !options.length) return null;
    const target = normalize(userValue);
    if (!target) return null;
    const stemTarget = stem(userValue);
    const sectionKey = context.sectionKey || '';
    const dataKey = normalize(context.dataKey || '');

    if (sectionKey === 'education' && dataKey === 'degree') {
      const ranked = options
        .map(o => ({ option: o, score: scoreDegreeOption(o, userValue) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0] && ranked[0].score > 0) return ranked[0].option;
    }

    if (sectionKey === 'languages' && dataKey === 'language') {
      let m = options.find(o => normalize(o) === target);
      if (m) return m;
      m = options.find(o => normalize(o).startsWith(target + ' '));
      if (m) return m;
      m = options.find(o => normalize(o).includes(target));
      if (m) return m;
      return null;
    }

    let m = options.find(o => normalize(o) === target);
    if (m) return m;
    m = options.find(o => normalize(o).includes(target));
    if (m) return m;
    m = options.find(o => target.includes(normalize(o)));
    if (m) return m;
    m = options.find(o => normalize(o).startsWith(stemTarget));
    if (m) return m;

    const targetFirst = stem(target.split(' ')[0]);
    m = options.find(o => {
      const optFirst = stem(normalize(o).split(' ')[0]);
      return optFirst === targetFirst;
    });
    if (m) return m;

    const targetWords = target.split(' ').filter(w => w.length > 2);
    m = options.find(o => {
      const optWords = normalize(o).split(' ');
      return targetWords.some(tw => optWords.some(ow => stem(ow) === stem(tw)));
    });
    return m || null;
  }

  function matchFieldToKey(fields, key) {
    const k = normalize(key);
    return fields.find(f => f.labelNorm === k)
        || fields.find(f => f.labelNorm.includes(k) || k.includes(f.labelNorm))
        || fields.find(f => f.automationId.toLowerCase().includes(k.replace(/\\s+/g, '')));
  }

  function isEmpty(v) {
    if (v === '' || v == null) return true;
    if (typeof v === 'object' && !Array.isArray(v)) return Object.values(v).every(x => x === '' || x == null);
    return false;
  }

  const plan = [];
  for (const [sectionKey, entries] of Object.entries({
    workExperience: RESUME_DATA.workExperience,
    education: RESUME_DATA.education,
    languages: RESUME_DATA.languages,
    certifications: RESUME_DATA.certifications,
    websites: RESUME_DATA.websites
  })) {
    const fields = pageFields[sectionKey];
    if (!fields || !entries.length) continue;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      for (const [dataKey, value] of Object.entries(entry)) {
        if (isEmpty(value)) continue;
        const field = matchFieldToKey(fields, dataKey);
        if (!field) {
          plan.push({ section: sectionKey, entry: i, key: dataKey, value, resolved: null, status: 'no-field' });
          continue;
        }
        let resolved = value;
        let status = 'ok';
        if ((field.type === 'dropdown' || field.type === 'searchable') && typeof value === 'string') {
          if (field.options && field.options.length) {
            const match = findBestMatch(value, field.options, { sectionKey, dataKey });
            if (match) {
              resolved = match;
              status = (normalize(match) === normalize(value)) ? 'exact' : 'fuzzy';
            } else {
              status = 'no-match';
            }
          }
        }
        plan.push({ section: sectionKey, entry: i, key: dataKey, value, field, resolved, status });
      }
    }
  }

  let skillsPlan = null;
  if (pageFields.skills && RESUME_DATA.skills) {
    const skills = RESUME_DATA.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 15);
    skillsPlan = { container: sections.skills.container, skills };
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 3: DRY RUN
  // ─────────────────────────────────────────────────────────────
  console.log('\\n📋 Dry run — here is what will be filled:');
  console.log('═══════════════════════════════════════════════════════════════');

  const grouped = {};
  for (const p of plan) {
    const k = p.section + ' #' + p.entry;
    (grouped[k] = grouped[k] || []).push(p);
  }
  for (const [grp, items] of Object.entries(grouped)) {
    console.log('\\n▸ ' + grp);
    for (const p of items) {
      const valStr = typeof p.value === 'object' ? JSON.stringify(p.value) : p.value;
      if (p.status === 'exact' || p.status === 'ok') {
        console.log('   ✅ ' + p.key + ' → ' + (typeof p.resolved === 'object' ? JSON.stringify(p.resolved) : p.resolved));
      } else if (p.status === 'fuzzy') {
        console.log('   🔄 ' + p.key + ': "' + valStr + '" → "' + p.resolved + '" (closest match)');
      } else if (p.status === 'no-match') {
        console.log('   ⚠️ ' + p.key + ': "' + valStr + '" — no matching option, will skip');
      } else if (p.status === 'no-field') {
        console.log('   ⚪ ' + p.key + ': field not found on this page, will skip');
      }
    }
  }
  if (skillsPlan) {
    console.log('\\n▸ skills');
    console.log('   📝 Will search and add ' + skillsPlan.skills.length + ' skills:');
    console.log('      ' + skillsPlan.skills.join(', '));
  }

  console.log('\\n═══════════════════════════════════════════════════════════════');
  console.log('   Auto-filling in ' + AUTO_CONFIRM_SECONDS + ' seconds.');
  console.log('   Type cancelFill() to cancel, or just wait.');
  console.log('═══════════════════════════════════════════════════════════════');

  let cancelled = false;
  window.cancelFill = () => { cancelled = true; console.log('🛑 Fill cancelled.'); };

  for (let s = AUTO_CONFIRM_SECONDS; s > 0; s--) {
    if (cancelled) return;
    await wait(1000);
  }
  if (cancelled) return;

  // ─────────────────────────────────────────────────────────────
  // PHASE 4: FILL
  // ─────────────────────────────────────────────────────────────
  console.log('\\n🚀 Phase 3: Filling...');

  function fill(el, value) {
    if (!el) return false;
    el.focus();
    if (el.select) el.select();
    try {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    } catch(e) { el.value = value; }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(value) }));
    const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps'));
    if (propsKey) {
      const props = el[propsKey];
      if (props.onChange) props.onChange({ target: el, currentTarget: el, preventDefault: ()=>{}, stopPropagation: ()=>{} });
      if (props.onBlur) props.onBlur({ target: el, currentTarget: el, preventDefault: ()=>{}, stopPropagation: ()=>{} });
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    el.blur();
    return true;
  }

  function findBtn(text, root = document) {
    return [...root.querySelectorAll('[role="button"], button, a')]
      .find(el => el.textContent.trim() === text && el.offsetParent !== null);
  }

  console.log('   🗑️ Clearing existing entries...');
  let cleared = 0;
  while (cleared < 30) {
    const btn = findBtn('Delete');
    if (!btn) break;
    btn.click();
    await wait(600);
    cleared++;
  }
  console.log('   Cleared ' + cleared + ' deletable entries.');

  const stuckFirstEntries = {};
  for (const [key, section] of Object.entries(sections)) {
    if (key === 'skills') continue;
    if (section.container.querySelector('[data-automation-id^="formField-"]')) {
      stuckFirstEntries[key] = true;
      console.log('   ℹ️ ' + key + ' has a permanent first entry — first item will overwrite it.');
    }
  }

  const fillLog = [];

  async function fillTextField(wrapper, value) {
    const input = wrapper.querySelector('input, textarea');
    return fill(input, value);
  }

  async function fillCheckbox(wrapper, value) {
    const cb = wrapper.querySelector('input[type="checkbox"]');
    if (!cb) return false;
    if (cb.checked !== !!value) cb.click();
    return true;
  }

  async function fillDate(wrapper, value) {
    if (!value || typeof value !== 'object') return false;
    const monthInput = wrapper.querySelector('[data-automation-id*="Month"] input, [data-automation-id="dateSectionMonth-input"]');
    const yearInput = wrapper.querySelector('[data-automation-id*="Year"] input, [data-automation-id="dateSectionYear-input"]');
    let ok = true;
    if (value.month && monthInput) { ok = fill(monthInput, value.month) && ok; monthInput.click(); }
    if (value.year && yearInput) { ok = fill(yearInput, value.year) && ok; yearInput.click(); }
    return ok;
  }

  async function openDropdownList(wrapper) {
    if (isAnyDropdownOpen()) await fastClose();
    const trigger = wrapper.querySelector('button, [role="button"], [role="combobox"]') || wrapper;
    try { trigger.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
    await wait(150);
    realClick(trigger);
    if (trigger.focus) trigger.focus();
    await wait(700);
    let lb = [...document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]')]
      .filter(el => el.offsetParent !== null).pop();
    if (!lb) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
      trigger.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
      await wait(500);
      lb = [...document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]')]
        .filter(el => el.offsetParent !== null).pop();
    }
    if (!lb) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ', code: 'Space', keyCode: 32 }));
      trigger.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ', code: 'Space', keyCode: 32 }));
      await wait(500);
      lb = [...document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]')]
        .filter(el => el.offsetParent !== null).pop();
    }
    return { trigger, lb };
  }

  async function fillDropdown(wrapper, exactValue) {
    const opened = await openDropdownList(wrapper);
    const lb = opened.lb;
    if (!lb) { await fastClose(); return false; }
    const scrollEl = findScrollContainer(lb);
    scrollEl.scrollTop = 0;
    await wait(150);
    let found = null;
    let lastScroll = -1, stable = 0;
    for (let i = 0; i < 80; i++) {
      const visible = collectVisibleOptionElements(lb);
      found = visible.find(el => visibleText(el) === exactValue)
           || visible.find(el => normalize(visibleText(el)) === normalize(exactValue))
           || visible.find(el => normalize(visibleText(el)).includes(normalize(exactValue)));
      if (found) break;
      const cur = scrollEl.scrollTop;
      if (cur === lastScroll) { stable++; if (stable >= 3) break; } else stable = 0;
      lastScroll = cur;
      scrollEl.scrollTop = cur + 250;
      await wait(120);
    }
    if (found) {
      realClick(found);
      await wait(500);
      await fastClose();
      return true;
    }
    await fastClose();
    return false;
  }

  async function fillLanguageDropdown(wrapper, exactValue) {
    const targetLanguage = exactValue || 'English';
    const section = sections.languages || findSection(SECTION_ALIASES.languages, { requireAddBtn: true });
    if (!section) return false;
    if (!section.container.querySelector('[data-automation-id^="formField-"]')) {
      const addBtn = section.container.querySelector('[data-automation-id="add-button"]');
      if (addBtn) { addBtn.click(); await wait(900); }
    }
    const fields = discoverFieldsIn(section.container);
    const languageField = matchFieldToKey(fields, 'Language');
    if (!languageField) return false;
    await fastClose();
    const before = new Set(visibleListboxes());
    const trigger = languageField.wrapper.querySelector('button, [role="button"], [role="combobox"]') || languageField.wrapper;
    try { trigger.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
    await wait(200);
    realClick(trigger);
    if (trigger.focus) trigger.focus();
    await wait(700);
    let listboxes = visibleListboxes({ exclude: before });
    if (!listboxes.length) listboxes = visibleListboxes();
    if (!listboxes.length) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
      trigger.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
      await wait(700);
      listboxes = visibleListboxes({ exclude: before });
      if (!listboxes.length) listboxes = visibleListboxes();
    }
    const opened = listboxes[listboxes.length - 1] || null;
    if (!opened) { await fastClose(); return false; }
    function languageOptions(root) {
      return [...root.querySelectorAll('[role="option"], [data-automation-id="menuItem"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"], li, [data-automation-id*="item"], [data-automation-id*="Item"]')]
        .filter(el => el.offsetParent !== null)
        .filter(el => {
          const t = visibleText(el);
          if (!t) return false;
          if (t === 'Select One' || t === 'No Items.' || t === 'Loading...') return false;
          if (t.startsWith('Search Results')) return false;
          return true;
        });
    }
    const scrollEl = findScrollContainer(opened);
    if (scrollEl) scrollEl.scrollTop = 0;
    await wait(150);
    let found = null;
    let lastScroll = -1;
    let stable = 0;
    for (let i = 0; i < 120; i++) {
      const opts = languageOptions(opened);
      found = opts.find(el => normalize(visibleText(el)) === normalize(targetLanguage))
           || opts.find(el => normalize(visibleText(el)).startsWith(normalize(targetLanguage) + ' '))
           || opts.find(el => normalize(visibleText(el)).includes(normalize(targetLanguage)));
      if (found) break;
      if (!scrollEl) break;
      const cur = scrollEl.scrollTop;
      if (cur === lastScroll) { stable++; if (stable >= 4) break; } else stable = 0;
      lastScroll = cur;
      scrollEl.scrollTop = cur + 300;
      await wait(120);
    }
    if (!found) {
      console.warn('   ⚠️ Language visible options sample: ' + languageOptions(opened).slice(0, 12).map(visibleText).join(' | '));
      await fastClose();
      return false;
    }
    const chosenText = visibleText(found);
    realClick(found);
    await wait(900);
    await fastClose();
    await wait(400);
    console.log('   · Language clicked: ' + chosenText);
    return normalize(chosenText).includes(normalize(targetLanguage));
  }

  async function fillSearchable(wrapper, exactValue) {
    await forceCloseDropdowns('before searchable ' + exactValue);
    const innerInput = wrapper.querySelector('input[type="text"], input[role="combobox"]') || wrapper.querySelector('input');
    const trigger = innerInput || wrapper.querySelector('[role="combobox"], button') || wrapper;
    trigger.click();
    if (innerInput) innerInput.focus();
    await wait(700);
    if (!innerInput) { await forceCloseDropdowns('searchable no input'); return false; }
    fill(innerInput, '');
    await wait(150);
    const before = new Set(document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]'));
    for (const ch of exactValue) {
      innerInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ch }));
      fill(innerInput, innerInput.value + ch);
      innerInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
      await wait(40);
    }
    await wait(1000);
    let opt = null;
    const firstWord = normalize(String(exactValue).split(' ')[0]);
    const start = Date.now();
    while (Date.now() - start < 3500) {
      const lbs = [...document.querySelectorAll('[role="listbox"], [data-automation-id="activeListContainer"]')]
        .filter(el => el.offsetParent !== null && !before.has(el));
      const allOpts = [];
      for (const lb of lbs) {
        allOpts.push(...collectVisibleOptionElements(lb).filter(el => {
          const t = visibleText(el);
          return t && t !== 'Select One' && t !== 'No Items.' && t !== 'Loading...' && !t.startsWith('Search Results');
        }));
      }
      opt = allOpts.find(el => normalize(visibleText(el)) === normalize(exactValue))
         || allOpts.find(el => normalize(visibleText(el)).includes(normalize(exactValue)))
         || allOpts.find(el => normalize(visibleText(el)).includes(firstWord))
         || allOpts[0];
      if (opt) break;
      await wait(200);
    }
    if (opt) {
      realClick(opt);
      try { opt.click(); } catch(e) {}
      await wait(900);
      await forceCloseDropdowns('after searchable ' + exactValue);
      return true;
    }
    innerInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
    innerInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowDown', keyCode: 40 }));
    await wait(150);
    innerInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
    innerInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
    await wait(900);
    await forceCloseDropdowns('after searchable keyboard ' + exactValue);
    return true;
  }

  const planByGroup = {};
  const groupOrder = [];
  for (const p of plan) {
    if (p.status === 'no-field' || p.status === 'no-match') continue;
    const k = p.section + '#' + p.entry;
    if (!planByGroup[k]) { planByGroup[k] = []; groupOrder.push(k); }
    planByGroup[k].push(p);
  }

  const entriesCreated = {};

  for (const grp of groupOrder) {
    const items = planByGroup[grp];
    const [sectionKey, entryIdxStr] = grp.split('#');
    const entryIdx = parseInt(entryIdxStr);
    const section = sections[sectionKey];
    if (!section) continue;
    const sectionCount = entriesCreated[sectionKey] || 0;
    const isFirstUserEntry = sectionCount === 0;
    const useExisting = isFirstUserEntry && stuckFirstEntries[sectionKey];
    if (useExisting) {
      console.log('   ▸ Overwriting existing entry in ' + sectionKey + ' #' + entryIdx);
    } else {
      if (isAnyDropdownOpen()) await fastClose();
      const addBtn = section.container.querySelector('[data-automation-id="add-button"]');
      if (addBtn) {
        addBtn.click();
        await wait(700);
        console.log('   ▸ Added new entry in ' + sectionKey + ' #' + entryIdx);
      }
    }
    entriesCreated[sectionKey] = sectionCount + 1;

    for (const p of items) {
      const isDropdownLike = p.field.type === 'dropdown' || p.field.type === 'searchable';
      if (isDropdownLike && isAnyDropdownOpen()) await fastClose();
      const freshFields = discoverFieldsIn(section.container);
      const matches = freshFields.filter(f =>
        f.labelNorm === normalize(p.key)
        || f.labelNorm.includes(normalize(p.key))
        || normalize(p.key).includes(f.labelNorm)
      );
      const field = useExisting ? matches[0] : matches[matches.length - 1];
      if (!field) {
        fillLog.push({ ...p, success: false, reason: 'field disappeared' });
        continue;
      }
      let ok = false;
      try {
        if (sectionKey === 'languages' && normalize(p.key) === 'language') {
          ok = await fillLanguageDropdown(field.wrapper, p.resolved);
        } else {
          switch (field.type) {
            case 'text':
            case 'textarea':
              ok = await fillTextField(field.wrapper, p.resolved); break;
            case 'checkbox':
              ok = await fillCheckbox(field.wrapper, p.resolved); break;
            case 'date':
              ok = await fillDate(field.wrapper, p.resolved); break;
            case 'dropdown':
              ok = await fillDropdown(field.wrapper, p.resolved); break;
            case 'searchable':
              ok = await fillSearchable(field.wrapper, p.resolved); break;
          }
        }
      } catch (e) {
        console.warn('   ⚠️ Error filling ' + p.key + ':', e.message);
      }
      fillLog.push({ ...p, success: ok });
      console.log('   ' + (ok ? '✅' : '⚠️') + ' [' + sectionKey + ' #' + entryIdx + '] ' + p.key + (ok ? '' : ' (failed)'));
      if (isDropdownLike && !(sectionKey === 'languages' && normalize(p.key) === 'language')) await forceCloseDropdowns('after ' + sectionKey + ' ' + p.key);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SKILLS
  // ─────────────────────────────────────────────────────────────
  function selectedSkillTexts(container) {
    return container.textContent.replace(/\\s+/g, ' ').trim();
  }

  function findSkillsInput(container, inputSelectors) {
    for (const sel of inputSelectors) {
      const found = [...container.querySelectorAll(sel)].filter(el => el.offsetParent !== null);
      if (found.length) return found[found.length - 1];
    }
    return null;
  }

  async function openSkillsPicker(section, inputSelectors) {
    await forceCloseDropdowns('before skills picker');
    section.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(400);
    let input = findSkillsInput(section.container, inputSelectors);
    if (!input) {
      const trigger = section.container.querySelector('[role="combobox"], button, [role="button"]') || section.container;
      realClick(trigger);
      await wait(700);
      input = findSkillsInput(section.container, inputSelectors);
    }
    if (input) {
      realClick(input);
      input.focus?.();
      await wait(500);
    }
    return input;
  }

  function firstSkillOption(listboxes, skill) {
    const skillText = normalize(skill);
    function isGoodRow(el) {
      const t = normalize(visibleText(el));
      if (!t) return false;
      if (t.includes('type to add skills')) return false;
      if (t === 'search') return false;
      if (t === 'no items' || t === 'loading') return false;
      if (t.startsWith('search results')) return false;
      return t === skillText || t.includes(skillText) || skillText.includes(t);
    }
    for (const lb of listboxes) {
      const checks = [...lb.querySelectorAll('input[type="checkbox"], [role="checkbox"]')].filter(el => el.offsetParent !== null);
      for (const cb of checks) {
        const row = cb.closest('[role="option"], li, [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"], [data-automation-id="menuItem"], div') || cb;
        if (isGoodRow(row)) return { row, checkbox: cb, text: visibleText(row) };
      }
      const rows = [...lb.querySelectorAll('[role="option"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"], [data-automation-id="menuItem"], li')]
        .filter(el => el.offsetParent !== null)
        .filter(isGoodRow);
      if (rows.length) {
        const row = rows[0];
        const cb = row.querySelector('input[type="checkbox"], [role="checkbox"]');
        return { row, checkbox: cb && cb.offsetParent !== null ? cb : null, text: visibleText(row) };
      }
    }
    return null;
  }

  async function clearSkillsSearch(input) {
    if (!input) return;
    input.focus();
    fill(input, '');
    await wait(200);
  }

  async function typeSkillSearch(input, value) {
    await clearSkillsSearch(input);
    const lower = String(value || '').toLowerCase();
    for (const ch of lower) {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ch }));
      fill(input, input.value + ch);
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ch }));
      await wait(35);
    }
    await wait(750);
  }

  function dispatchPointerMouse(el, x, y) {
    const common = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      try {
        const Ctor = type.startsWith('pointer') && window.PointerEvent ? PointerEvent : MouseEvent;
        el.dispatchEvent(new Ctor(type, common));
      } catch(e) {
        try { el.dispatchEvent(new MouseEvent(type, common)); } catch(_) {}
      }
    }
  }

  async function clickSkillResultOption(result) {
    if (!result) return false;
    const row = result.row || result;
    let checkbox = result.checkbox || row.querySelector?.('input[type="checkbox"], [role="checkbox"]');
    if (checkbox && checkbox.offsetParent === null) checkbox = null;
    try { row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
    await wait(150);
    let target = checkbox || row;
    let rect = target.getBoundingClientRect ? target.getBoundingClientRect() : row.getBoundingClientRect();
    if (!rect || rect.width < 3 || rect.height < 3) {
      rect = row.getBoundingClientRect();
      target = row;
    }
    const rowRect = row.getBoundingClientRect();
    const x = checkbox && rect.width >= 3 ? rect.left + rect.width / 2 : rowRect.left + 14;
    const y = checkbox && rect.height >= 3 ? rect.top + rect.height / 2 : rowRect.top + rowRect.height / 2;
    dispatchPointerMouse(target, x, y);
    await wait(250);
    if (checkbox && 'checked' in checkbox && !checkbox.checked) {
      try { checkbox.focus?.(); } catch(e) {}
      try { checkbox.click(); } catch(e) {}
      await wait(250);
    }
    if (checkbox && 'checked' in checkbox && !checkbox.checked) {
      try { checkbox.focus?.(); } catch(e) {}
      checkbox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ', code: 'Space', keyCode: 32 }));
      checkbox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ', code: 'Space', keyCode: 32 }));
      await wait(250);
    }
    if (checkbox && 'checked' in checkbox && !checkbox.checked) {
      const rr = row.getBoundingClientRect();
      dispatchPointerMouse(row, rr.left + 14, rr.top + rr.height / 2);
      await wait(250);
    }
    await wait(900);
    return true;
  }

  async function addOneSkill(skill, skillsPlan, inputSelectors) {
    let input = findSkillsInput(skillsPlan.container, inputSelectors);
    if (!input) input = await openSkillsPicker(skillsPlan, inputSelectors);
    if (!input) return { ok: false, reason: 'skills input not found' };
    const searchTerm = String(skill || '').toLowerCase();
    const beforeText = selectedSkillTexts(skillsPlan.container);
    const beforeChipCount = (beforeText.match(/×/g) || []).length;
    input.focus();
    realClick(input);
    await typeSkillSearch(input, searchTerm);
    const beforeEnter = new Set(visibleListboxes());
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
    await wait(1000);
    let best = null;
    const start = Date.now();
    while (Date.now() - start < 5500) {
      let listboxes = visibleListboxes().filter(lb => !beforeEnter.has(lb));
      if (!listboxes.length) listboxes = visibleListboxes();
      for (const lb of listboxes) {
        const opt = firstSkillOption([lb], searchTerm);
        if (!opt) continue;
        const optionText = normalize(opt.text || visibleText(opt.row));
        const skillText = normalize(searchTerm);
        if (optionText === skillText || optionText.includes(skillText) || skillText.includes(optionText)) {
          best = opt;
        }
        break;
      }
      if (best) break;
      await wait(200);
    }
    if (!best) {
      await clearSkillsSearch(input);
      return { ok: false, reason: 'first dropdown result did not match search' };
    }
    const chosen = best.text || visibleText(best.row);
    await clickSkillResultOption(best);
    await wait(600);
    const afterText = selectedSkillTexts(skillsPlan.container);
    const afterChipCount = (afterText.match(/×/g) || []).length;
    const committed = afterChipCount > beforeChipCount || normalize(afterText).includes(normalize(chosen)) || !!(best.checkbox && best.checkbox.checked);
    input = findSkillsInput(skillsPlan.container, inputSelectors) || input;
    if (input && input.offsetParent !== null) {
      input.focus();
      fill(input, '');
      await wait(350);
    }
    return { ok: committed, chosen, reason: committed ? '' : 'clicked first matching result but chip did not appear' };
  }

  if (skillsPlan && skillsPlan.skills.length) {
    console.log('\\n   📝 Filling skills...');
    skillsPlan.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(600);
    const inputSelectors = [
      'input[placeholder*="Search"]',
      'input[type="search"]',
      'input[role="combobox"]',
      'input[type="text"]',
      'input:not([type="checkbox"]):not([type="hidden"])'
    ];
    let searchInput = await openSkillsPicker(skillsPlan, inputSelectors);
    if (searchInput) {
      for (const skill of skillsPlan.skills) {
        try {
          const result = await addOneSkill(skill, skillsPlan, inputSelectors);
          if (result.ok) {
            console.log('   ✅ ' + String(skill).toLowerCase() + ' → ' + (result.chosen || skill));
          } else if (result.chosen) {
            console.log('   ⚠️ ' + String(skill).toLowerCase() + ' → clicked "' + result.chosen + '" but not confirmed yet');
          } else {
            console.log('   ⚠️ ' + String(skill).toLowerCase() + ' → ' + result.reason + ', skipped');
          }
        } catch (e) {
          console.warn('   ⚠️ Skills error for ' + skill + ':', e.message);
        }
      }
      await forceCloseDropdowns('after skills section');
    } else {
      console.log('   ⚠️ Skills input not found, skipped');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\\n📊 Fill Summary');
  const passed = fillLog.filter(l => l.success);
  const failed = fillLog.filter(l => !l.success);
  console.log('   ✅ ' + passed.length + ' fields filled successfully');
  if (failed.length) {
    console.warn('   ⚠️ ' + failed.length + ' fields failed:');
    failed.forEach(l => console.warn('      [' + l.section + ' #' + l.entry + '] ' + l.key));
  }
  console.log('\\n🎉 Done! Review every field before clicking Save.');
})();`;

export function generateWorkdayScript(resumeData, tailoredBullets = []) {
  const {
    workExperience = [],
    education = [],
    languages = [],
    certifications = [],
    websites = [],
    skills = ''
  } = resumeData;

  // Merge tailored bullets — fall back to original bullets if not tailored
  const workExperienceMapped = workExperience.map(we => {
    const tailored = tailoredBullets.find(t =>
      t.company === we.company || t.company === we.title
    );
    const sourceBullets = tailored
      ? tailored.bullets
      : we.bullets;
    const bullets = (Array.isArray(sourceBullets) ? sourceBullets : [])
      .filter(b => typeof b === 'string' && b.trim());

    // Prefix each bullet with "- " for Workday display
    const description = bullets.map(b => {
      const trimmed = b.trim();
      return trimmed.startsWith('-') ? trimmed : '- ' + trimmed;
    }).join('\n');

    return {
      "Job Title": we.title || '',
      "Company": we.company || '',
      "Location": we.location || '',
      "I currently work here": !!we.currentlyWork,
      "From": { month: we.fromMonth || '', year: we.fromYear || '' },
      "To": we.currentlyWork
        ? { month: '', year: '' }
        : { month: we.toMonth || '', year: we.toYear || '' },
      "Role Description": description
    };
  });

  const educationMapped = education.map(ed => ({
    "School or University": ed.school || '',
    "Degree": ed.degree || '',
    "Field of Study": ed.field || '',
    "Overall Result (GPA)": ed.gpa || '',
    "From": { year: ed.fromYear || '' },
    "To (Actual or Expected)": { year: ed.toYear || '' }
  }));

  const languagesMapped = languages.map(l => ({
    "Language": l.language || 'English',
    "I am fluent in this language": l.fluent !== false,
    "Reading": l.reading || 'Advanced',
    "Speaking": l.speaking || 'Advanced',
    "Writing": l.writing || 'Advanced'
  }));

  const certificationsMapped = certifications
    .filter(c => c.name && c.name.trim())
    .map(c => ({
      "Certification": c.name || '',
      "Certification Number": '',
      "Issued Date": c.year ? { year: c.year } : { year: '' },
      "Expiration Date": { year: '' }
    }));

  const websitesMapped = (Array.isArray(websites) ? websites : [])
    .filter(w => w && typeof w === 'string' && w.trim())
    .map(url => ({ "URL": url.trim() }));

  // Skills: clean the comma-separated string
  const skillsString = typeof skills === 'string'
    ? skills
    : (typeof skills === 'object' && skills !== null)
      ? Object.values(skills).filter(v => v && typeof v === 'string').join(', ')
      : '';
  const cleanSkillsString = skillsString
    .split(',')
    .map(skill => skill.trim())
    .filter(Boolean)
    .join(', ');

  const RESUME_DATA_OBJ = {
    workExperience: workExperienceMapped,
    education: educationMapped,
    languages: languagesMapped,
    certifications: certificationsMapped,
    websites: websitesMapped,
    skills: cleanSkillsString
  };

  // Safe interpolation — JSON.stringify handles apostrophes, quotes, newlines
  const resumeDataJson = JSON.stringify(RESUME_DATA_OBJ, null, 2);

  return WORKDAY_SCRIPT_TEMPLATE.replace('__RESUME_DATA_PLACEHOLDER__', resumeDataJson);
}
