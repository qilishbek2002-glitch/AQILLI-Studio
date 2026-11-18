// Bo'lim ish oynasi: mavzu → sozlamalar → AIga yuborish → javobni qo'yish → natija.
// Hamma bo'lim uchun bitta ekran; farqlar modul manifestidan keladi.
import { h, clear, icon, toast, download } from './dom.js';
import { coverHtml } from './covers.js';
import { availableFormats, defaultMinutes, durationChoices, durationLimits, computePlan } from '../core/plan.js';
import { LANGUAGES, buildCommand, resolveOptions, buildContext } from '../core/prompt.js';
import { parseAiResponse } from '../core/parse.js';
import { validate } from '../core/validate.js';
import { buildOutputs, estimateImages, imagesAsText, sortedItems } from '../core/outputs.js';
import { AI_SITES, prepareLink, copyText } from '../core/handoff.js';
import { saveProject, getCovers } from '../core/store.js';
import { debounce, getPath, setPath, fmtDuration } from '../core/util.js';

async function copy(text, what = 'Nusxalandi') {
  const ok = await copyText(text);
  toast(ok ? what : 'Nusxalab bo\'lmadi. Matnni belgilab qo\'lda nusxalang.', ok ? 'ok' : 'err');
}

function copyBtn(label, text, small = true) {
  return h('button', { class: `btn${small ? ' small' : ''}`, type: 'button', onclick: () => copy(typeof text === 'function' ? text() : text) }, icon('copy', 16), label);
}

function stepCard(no, title, sub, body, { dim = false } = {}) {
  return h(
    'section',
    { class: `step${dim ? ' dim' : ''}` },
    h('div', { class: 'step-head' }, h('span', { class: 'step-no' }, String(no)), h('div', {}, h('h2', {}, title), sub ? h('div', { class: 'sub' }, sub) : null)),
    body
  );
}

function msg(kind, text, ico) {
  return h('div', { class: `msg ${kind}` }, icon(ico || (kind === 'err' ? 'warn' : kind === 'ok' ? 'check' : 'info'), 18), h('span', {}, text));
}

export function wizardView(app, m, p) {
  const formats = availableFormats(m);
  if (!formats.includes(p.format)) p.format = formats[0];
  if (!p.minutes) p.minutes = defaultMinutes(m, p.format);
  p.moduleId = m.id;
  p.moduleVersion = m.version;
  p.options = p.options || {};
  p.language = p.language || app.settings.language;

  const saveSoon = debounce(() => {
    if ((p.topic || '').trim() || p.data) saveProject(p);
  }, 400);
  const saveNow = () => {
    if ((p.topic || '').trim() || p.data) saveProject(p);
  };

  const refs = {};
  const topicGroups = m.topics || [];
  let activeGroup = topicGroups.find((g) => g.items.includes(p.topic))?.group ?? topicGroups[0]?.group;

  // ---------- 1. mavzu ----------
  const topicInput = h('input', {
    type: 'text',
    id: 'topic',
    value: p.topic || '',
    placeholder: 'Masalan: ' + (topicGroups[0]?.items?.[0] || 'mavzuni yozing'),
    maxlength: '160',
    oninput: (e) => {
      p.topic = e.target.value;
      drawTopics();
      changed('topic');
    },
  });
  const groupChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Mavzu turlari' });
  const topicChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Tayyor mavzular' });

  function drawGroups() {
    clear(groupChips);
    topicGroups.forEach((g) =>
      groupChips.append(
        h('button', { class: 'chip', type: 'button', 'aria-pressed': g.group === activeGroup ? 'true' : 'false', onclick: () => { activeGroup = g.group; drawGroups(); drawTopics(); } }, g.group)
      )
    );
  }
  function drawTopics() {
    clear(topicChips);
    const g = topicGroups.find((x) => x.group === activeGroup);
    (g?.items || []).forEach((t) =>
      topicChips.append(
        h('button', { class: 'chip', type: 'button', 'aria-pressed': p.topic === t ? 'true' : 'false', onclick: () => { p.topic = t; topicInput.value = t; drawTopics(); changed('topic'); } }, t)
      )
    );
  }

  const step1 = stepCard(
    1,
    'Mavzu',
    'Tayyor mavzudan tanlang yoki o\'zingiznikini yozing',
    h('div', { class: 'stack' }, topicGroups.length ? [groupChips, topicChips] : null, h('div', { class: 'field' }, h('label', { for: 'topic' }, 'Mavzu'), topicInput))
  );

  // ---------- 2. sozlamalar ----------
  const formatBox = h('div', { class: 'field' });
  const durationBox = h('div', { class: 'field' });
  const minutesInput = h('input', {
    type: 'number',
    id: 'minutes',
    step: '0.5',
    value: String(p.minutes),
    oninput: (e) => {
      const v = Number(e.target.value);
      const { min, max } = durationLimits(m, p.format);
      if (v >= min && v <= max) {
        p.minutes = v;
        drawDuration(true);
        changed('settings');
      }
    },
  });
  const durationChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Davomiylik' });

  function drawFormat() {
    clear(formatBox);
    if (formats.length < 2) return;
    formatBox.append(
      h('span', { class: 'label' }, 'Format'),
      h(
        'div',
        { class: 'seg', role: 'group', 'aria-label': 'Video formati' },
        formats.map((f) =>
          h('button', {
            type: 'button',
            'aria-pressed': p.format === f ? 'true' : 'false',
            onclick: () => {
              p.format = f;
              const choices = durationChoices(m, f);
              if (!choices.includes(p.minutes)) p.minutes = defaultMinutes(m, f);
              minutesInput.value = String(p.minutes);
              drawFormat();
              drawDuration();
              changed('settings');
            },
          }, f === 'short' ? 'Shorts (vertikal)' : 'Long (gorizontal)')
        )
      )
    );
  }
  function drawDuration(onlyPressed = false) {
    const choices = durationChoices(m, p.format);
    if (onlyPressed) {
      [...durationChips.children].forEach((b, i) => b.setAttribute('aria-pressed', choices[i] === p.minutes ? 'true' : 'false'));
      return;
    }
    clear(durationChips);
    choices.forEach((c) =>
      durationChips.append(
        h('button', { class: 'chip', type: 'button', 'aria-pressed': c === p.minutes ? 'true' : 'false', onclick: () => { p.minutes = c; minutesInput.value = String(c); drawDuration(true); changed('settings'); } }, fmtDuration(c))
      )
    );
  }
  durationBox.append(h('span', { class: 'label' }, 'Davomiyligi'), durationChips);

  const langSelect = h(
    'select',
    { id: 'lang', onchange: (e) => { p.language = e.target.value; changed('settings'); } },
    Object.entries(LANGUAGES).map(([k, v]) => h('option', { value: k, selected: p.language === k }, v.label))
  );

  const optionBoxes = (m.options || []).map((o) => {
    if (o.type === 'toggle') {
      const cb = h('input', { type: 'checkbox', checked: resolveOptions(m, p.options).ids[o.id], onchange: (e) => { p.options[o.id] = e.target.checked; changed('settings'); } });
      return h('label', { class: 'switch' }, cb, h('span', { class: 'track' }), h('span', {}, o.label));
    }
    const box = h('div', { class: 'field' });
    const hint = h('span', { class: 'muted small' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': o.label });
    const draw = () => {
      clear(chips);
      const cur = resolveOptions(m, p.options).ids[o.id];
      o.choices.forEach((c) =>
        chips.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': c.id === cur ? 'true' : 'false', onclick: () => { p.options[o.id] = c.id; draw(); changed('settings'); } }, c.label))
      );
      hint.textContent = o.choices.find((c) => c.id === cur)?.hint || '';
    };
    draw();
    box.append(h('span', { class: 'label' }, o.label), chips, hint);
    return box;
  });

  const planBox = h('div', { class: 'stack' });
  const step2 = stepCard(
    2,
    'Sozlamalar',
    'Davomiylikka qarab nechta element kerakligini dastur o\'zi hisoblaydi',
    h(
      'div',
      { class: 'stack' },
      formatBox,
      durationBox,
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { for: 'minutes' }, 'Aniq davomiylik (daqiqa)'), minutesInput), h('div', { class: 'field' }, h('label', { for: 'lang' }, 'Matn tili'), langSelect)),
      optionBoxes,
      planBox
    )
  );

  function drawPlan() {
    clear(planBox);
    try {
      const plan = computePlan(m, { minutes: p.minutes, format: p.format });
      const imgs = estimateImages(m, plan, p.options);
      const parts = [h('span', {}, `${plan.items} ta ${plan.itemName}`)];
      if (imgs) parts.push(h('span', {}, `${imgs} ta rasm prompti`));
      if (plan.words) parts.push(h('span', {}, `taxminan ${plan.words} so'z ovoz matni`));
      parts.push(h('span', { class: 'muted' }, `${plan.durationText}, ${p.format === 'short' ? 'vertikal' : 'gorizontal'}`));
      planBox.append(h('div', { class: 'plan-line' }, parts));
      plan.warnings.forEach((w) => planBox.append(msg('warn', w)));
    } catch (e) {
      planBox.append(msg('err', e.message));
    }
  }

  // ---------- 3. AIga yuborish ----------
  const cmdArea = h('textarea', { class: 'cmd mono', readOnly: true, rows: '8', 'aria-label': 'AI uchun buyruq' });
  const cmdInfo = h('span', { class: 'muted small' });
  refs.sendBtns = {};
  const siteOrder = [app.settings.ai, ...Object.keys(AI_SITES).filter((k) => k !== app.settings.ai)];
  const sendRow = h(
    'div',
    { class: 'send-row' },
    siteOrder.map((id) => {
      const b = h('a', { class: `btn${id === app.settings.ai ? ' primary' : ''}`, href: AI_SITES[id].url }, icon('send', 18), `${AI_SITES[id].label} bilan yozdirish`);
      prepareLink(b, id, currentCommand, { prefill: app.settings.prefill });
      b.addEventListener('handoff', (e) => toast(e.detail.prefilled ? `${e.detail.label} ochildi. Buyruq tushmasa, nusxalangan matnni qo'ying.` : `Buyruq nusxalandi. ${e.detail.label}da yozish maydoniga qo'ying.`));
      refs.sendBtns[id] = b;
      return b;
    }),
    h('button', { class: 'btn ghost', type: 'button', onclick: () => currentCommand() && copy(currentCommand(), 'Buyruq nusxalandi') }, icon('copy', 18), 'Faqat nusxalash')
  );
  const step3 = stepCard(
    3,
    'AIga yuborish',
    'Bitta buyruq: mavzu, davomiylik va tuzilish talablari hammasi ichida',
    h(
      'div',
      { class: 'stack' },
      cmdArea,
      cmdInfo,
      sendRow,
      h('div', { class: 'hint' }, icon('info', 16), h('span', {}, 'Buyruq avtomatik nusxalanadi. Sayt ochilganda yozish maydoni bo\'sh bo\'lsa, shu yerga qo\'yish yetarli. Javob uzoq bo\'lsa, AI to\'xtab qolishi mumkin: unda "davom et" deb yozing.'))
    )
  );

  function currentCommand() {
    if (!(p.topic || '').trim()) {
      toast('Avval mavzuni yozing', 'err');
      topicInput.focus();
      return '';
    }
    try {
      return buildCommand(m, p).text;
    } catch (e) {
      toast(e.message, 'err');
      return '';
    }
  }

  function drawCommand() {
    const has = (p.topic || '').trim().length > 0;
    let text = '';
    try {
      text = has ? buildCommand(m, p).text : 'Mavzuni yozing, buyruq shu yerda paydo bo\'ladi.';
    } catch (e) {
      text = e.message;
    }
    cmdArea.value = text;
    cmdInfo.textContent = has ? `${text.length} belgi` : '';
    Object.values(refs.sendBtns).forEach((b) => b.classList.toggle('is-off', !has));
    step3.classList.toggle('dim', !has);
  }

  // ---------- 4. javobni qo'yish ----------
  const pasteArea = h('textarea', {
    class: 'mono',
    rows: '9',
    id: 'paste',
    placeholder: 'AI javobini shu yerga qo\'ying. Kod bloki yoki oddiy matn ichidagi JSON ham bo\'ladi.',
    'aria-label': 'AI javobi',
    oninput: (e) => {
      p.raw = e.target.value;
      runSoon();
    },
    onpaste: () => setTimeout(() => runValidate(), 60),
  });
  pasteArea.value = p.raw || '';
  const msgBox = h('div', { class: 'msgs', 'aria-live': 'polite' });
  const step4 = stepCard(
    4,
    'Javobni qo\'yish',
    'Dastur javobni tekshiradi va xatoni aniq joyigacha ko\'rsatadi',
    h(
      'div',
      { class: 'stack' },
      pasteArea,
      h(
        'div',
        { class: 'send-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => runValidate(true) }, icon('check', 18), 'Tekshirish'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { p.raw = ''; p.data = null; pasteArea.value = ''; clear(msgBox); renderResult(); saveNow(); } }, 'Tozalash')
      ),
      msgBox
    )
  );
  const runSoon = debounce(() => runValidate(), 700);

  function runValidate(manual = false) {
    clear(msgBox);
    if (!(p.raw || '').trim()) {
      p.data = null;
      renderResult();
      if (manual) msgBox.append(msg('err', 'Avval AI javobini qo\'ying.'));
      return;
    }
    const parsed = parseAiResponse(p.raw);
    if (!parsed.ok) {
      p.data = null;
      msgBox.append(msg('err', parsed.error));
      renderResult();
      return;
    }
    let plan;
    let optIds;
    try {
      ({ plan, optIds } = buildContext(m, p));
    } catch (e) {
      msgBox.append(msg('err', e.message));
      return;
    }
    const v = validate(m.schema, parsed.data, { plan, opt: optIds });
    if (!v.ok) {
      p.data = null;
      msgBox.append(msg('err', `Javobda ${v.errors.length > 12 ? 'ko\'p' : v.errors.length} ta muammo bor. Shularni AIga yozib, to'g'rilangan javobni qayta oling:`));
      v.errors.forEach((e) => msgBox.append(msg('err', e)));
      renderResult();
      return;
    }
    p.data = v.data;
    p.stale = false;
    msgBox.append(msg('ok', parsed.repaired ? 'Javob qabul qilindi (JSON kichik xatolari avtomatik tuzatildi).' : 'Javob qabul qilindi.'));
    v.warnings.forEach((w) => msgBox.append(msg('warn', w)));
    renderResult();
    saveNow();
    resultSection.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  // ---------- 5. natija ----------
  const statsBox = h('div');
  const ytBox = h('div');
  const compBox = h('div');
  const tableBox = h('div');
  const imgBox = h('div');
  const voiceBox = h('div');
  const nextBox = h('div');
  const resultSection = h('section', { class: 'step', hidden: true }, h('div', { class: 'step-head' }, h('span', { class: 'step-no' }, '5'), h('div', {}, h('h2', {}, 'Natija'), h('div', { class: 'sub' }, 'Raqamlarni va matnlarni shu yerda tahrirlash mumkin'))), h('div', { class: 'result' }, statsBox, ytBox, compBox, tableBox, imgBox, voiceBox, nextBox));

  let out = null;

  function visibleColumns() {
    const { ids } = resolveOptions(m, p.options);
    return m.table.columns.filter((c) => !c.whenOption || Object.entries(c.whenOption).every(([k, vals]) => vals.includes(ids[k])));
  }

  function drawTable() {
    clear(tableBox);
    const cols = visibleColumns();
    const items = sortedItems(m, p.data);
    const head = h('tr', {}, h('th', {}, '#'), cols.map((c) => h('th', {}, c.label)));
    const rows = items.map((item, i) =>
      h(
        'tr',
        {},
        h('td', { class: 'no' }, String(i + 1)),
        cols.map((c) => {
          const val = getPath(item, c.key);
          let input;
          if (c.type === 'select') {
            input = h('select', { 'aria-label': c.label }, (c.options || []).map((o) => h('option', { value: o, selected: String(val) === o }, o)));
            input.addEventListener('change', (e) => { setPath(item, c.key, e.target.value); afterEdit(c); });
          } else if (c.type === 'bool') {
            input = h('input', { type: 'checkbox', checked: val !== false, 'aria-label': c.label });
            input.addEventListener('change', (e) => { setPath(item, c.key, e.target.checked); afterEdit(c); });
          } else if (c.type === 'number') {
            input = h('input', { type: 'number', step: 'any', value: val ?? '', 'aria-label': c.label });
            input.addEventListener('input', (e) => {
              const n = Number(String(e.target.value).replace(',', '.'));
              if (e.target.value !== '' && Number.isFinite(n)) { setPath(item, c.key, n); afterEdit(c, false); }
            });
            input.addEventListener('change', () => afterEdit(c));
          } else {
            input = h('input', { type: 'text', value: val ?? '', 'aria-label': c.label });
            input.addEventListener('input', (e) => { setPath(item, c.key, e.target.value); afterEdit(c, false); });
          }
          return h('td', { class: c.wide ? 'wide' : '' }, input);
        })
      )
    );
    tableBox.append(
      h('div', { class: 'block' }, h('div', { class: 'block-head' }, h('h3', {}, m.table.title || 'Ma\'lumotlar'), m.sort?.label ? h('span', { class: 'muted small' }, `Tartib: ${m.sort.label}`) : null), h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, head), h('tbody', {}, rows))))
    );
  }

  const outputsSoon = debounce(() => { renderOutputs(); saveNow(); }, 250);
  function afterEdit(col, redrawTable = true) {
    outputsSoon();
    if (redrawTable && m.sort?.key === col.key) drawTable();
    saveSoon();
  }

  function kv(label, value, extra) {
    return h('div', { class: 'kv' }, h('div', { class: 'kv-row' }, h('span', { class: 'k' }, label), extra || null), h('div', { class: 'v' }, value || '—'));
  }

  function renderOutputs() {
    if (!p.data) return;
    out = buildOutputs(m, p.data, p.options, { format: p.format });
    const { ids } = resolveOptions(m, p.options);

    clear(statsBox);
    if (p.stale) statsBox.append(msg('warn', 'Sozlamalar javobdan keyin o\'zgargan. Yangi sozlama uchun buyruqni qayta yuborib, yangi javob qo\'ying.'));
    const stats = h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', {}, String(out.items.length)), m.plan[p.format].itemName || 'element'));
    if (out.images.length) stats.append(h('div', { class: 'stat' }, h('b', {}, String(out.images.length)), 'rasm prompti'));
    if (out.voice) {
      const wpm = m.plan[p.format].wordsPerMinute || 120;
      stats.append(h('div', { class: 'stat' }, h('b', {}, String(out.voiceWords)), `so'z, ovoz ~${fmtDuration(Math.round((out.voiceWords / wpm) * 60) / 60)}`));
    }
    statsBox.append(stats);

    clear(ytBox);
    ytBox.append(
      h(
        'div',
        { class: 'block' },
        h('h3', {}, 'YouTube uchun'),
        kv('Sarlavha', out.youtube.title, copyBtn('Nusxalash', out.youtube.title)),
        kv('Tavsif', out.youtube.description, copyBtn('Nusxalash', out.youtube.description)),
        out.youtube.tags.length ? kv('Teglar', out.youtube.tags.join(', '), copyBtn('Nusxalash', out.youtube.tags.join(', '))) : null
      )
    );

    clear(compBox);
    if (out.computed) {
      compBox.append(h('div', { class: 'block' }, h('h3', {}, out.computed.title), h('div', { class: 'kv' }, out.computed.lines.map((l) => h('div', { class: 'v' }, l)))));
    }

    clear(imgBox);
    if (out.images.length) {
      imgBox.append(
        h(
          'div',
          { class: 'block' },
          h('div', { class: 'block-head' }, h('h3', {}, `Rasm promptlari (${out.images.length})`), h('div', { class: 'send-row' }, copyBtn('Hammasini nusxalash', () => imagesAsText(out.images)), h('button', { class: 'btn small', type: 'button', onclick: () => download(`${m.id}-rasm-promptlari.txt`, imagesAsText(out.images)) }, icon('download', 16), 'TXT'))),
          m.images?.hint ? h('div', { class: 'hint' }, icon('info', 16), h('span', {}, m.images.hint)) : null,
          h('div', { class: 'prompts' }, out.images.map((im) => h('div', { class: 'prompt' }, h('div', { class: 'top' }, h('span', { class: 't' }, im.label), copyBtn('Nusxalash', im.prompt)), im.note ? h('span', { class: 'muted small' }, im.note) : null, h('div', { class: 'txt' }, im.prompt))))
        )
      );
    } else {
      imgBox.append(h('div', { class: 'block' }, h('h3', {}, 'Rasmlar'), msg('info', m.notes || 'Bu bo\'limda AI rasmlari kerak emas.')));
    }

    clear(voiceBox);
    if (m.silent) {
      voiceBox.append(h('div', { class: 'block' }, h('h3', {}, 'Ovoz'), msg('info', 'Bu bo\'lim ovozsiz. Ovozni video tayyor bo\'lgach YouTube Studio\'da qo\'shasiz.')));
    } else if (out.voice) {
      voiceBox.append(
        h(
          'div',
          { class: 'block' },
          h('div', { class: 'block-head' }, h('h3', {}, 'Diktor matni'), copyBtn('Nusxalash', out.voice)),
          h('div', { class: 'hint' }, icon('info', 16), h('span', {}, 'Shu matnni ElevenLabs yoki Google AI ovoz xizmatiga qo\'yib, audio faylni yuklab oling.')),
          h('textarea', { readOnly: true, rows: '8', 'aria-label': 'Diktor matni' }, out.voice)
        )
      );
      const ta = voiceBox.querySelector('textarea');
      ta.value = out.voice;
    }
  }

  function renderNext() {
    clear(nextBox);
    nextBox.append(
      h(
        'div',
        { class: 'next-box' },
        h('h3', {}, 'Keyingi bosqich: rasmlarni yuklash va video yig\'ish'),
        h('span', { class: 'muted' }, 'Bu qism hali qurilmagan, keyingi bosqichda shu yerga qo\'shiladi. Hozircha rasmlarni yaratib, loyihani saqlab qo\'yishingiz mumkin.'),
        h(
          'div',
          { class: 'send-row' },
          h('button', { class: 'btn', type: 'button', disabled: true }, 'Rasmlarni yuklash'),
          h('button', { class: 'btn', type: 'button', onclick: () => download(`${m.id}-loyiha.json`, JSON.stringify(p, null, 2), 'application/json') }, icon('download', 16), 'Loyihani yuklab olish')
        )
      )
    );
  }

  function renderResult() {
    resultSection.hidden = !p.data;
    if (!p.data) return;
    drawTable();
    renderOutputs();
    renderNext();
  }

  // ---------- umumiy o'zgarish ----------
  function changed(kind) {
    if (kind === 'settings' && p.data) p.stale = true;
    drawPlan();
    drawCommand();
    if (p.data) renderOutputs();
    saveSoon();
  }

  // ---------- yig'ish ----------
  drawGroups();
  drawTopics();
  drawFormat();
  drawDuration();
  drawPlan();
  drawCommand();
  if (p.data) renderResult();

  return h(
    'div',
    {},
    h('div', { class: 'crumbs' }, h('a', { class: 'btn small ghost', href: '#home' }, icon('back', 16), 'Bosh sahifa')),
    h('div', { class: 'wiz-head' }, h('div', { class: 'thumb', html: coverHtml(m, getCovers()) }), h('div', {}, h('h1', {}, m.title), h('p', {}, m.subtitle))),
    h('div', { class: 'wiz' }, step1, step2, step3, step4, resultSection)
  );
}
