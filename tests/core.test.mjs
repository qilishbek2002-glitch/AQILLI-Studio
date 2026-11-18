import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, checkTemplate } from '../js/core/template.js';
import { computePlan, availableFormats, durationChoices } from '../js/core/plan.js';
import { parseAiResponse } from '../js/core/parse.js';
import { validate } from '../js/core/validate.js';
import { buildCommand, resolveOptions, buildContext } from '../js/core/prompt.js';
import { buildOutputs, sortedItems } from '../js/core/outputs.js';
import { validateManifest } from '../js/core/modules.js';
import { planHandoff } from '../js/core/handoff.js';
import { cmpVer } from '../js/core/version.js';
import { sampleFor } from './samples.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = JSON.parse(readFileSync(join(root, 'modules/index.json'), 'utf8'));
const mods = Object.fromEntries(
  ids.map((id) => {
    const m = JSON.parse(readFileSync(join(root, `modules/${id}/manifest.json`), 'utf8'));
    m.prompt = readFileSync(join(root, `modules/${id}/prompt.txt`), 'utf8');
    return [id, m];
  })
);

// ---------- shablon dvigateli ----------
test('template: o\'zgaruvchi, each, if/else, ==', () => {
  assert.equal(render('Salom {{a.b}}!', { a: { b: 'dunyo' } }), 'Salom dunyo!');
  assert.equal(render('{{#each xs}}[{{@index1}}:{{this}}]{{/each}}', { xs: ['a', 'b'] }), '[1:a][2:b]');
  assert.equal(render('{{#if f}}ha{{else}}yo\'q{{/if}}', { f: false }), "yo'q");
  assert.equal(render('{{#if f == b}}teng{{/if}}', { f: 'b' }), 'teng');
  assert.equal(render('{{#if f != b}}farq{{else}}teng{{/if}}', { f: 'b' }), 'teng');
  assert.equal(render('{{#if xs}}bor{{else}}bo\'sh{{/if}}', { xs: [] }), "bo'sh");
  assert.equal(render('{{yoq}}x', {}), 'x');
});

test('template: alohida qatordagi blok teglari bo\'sh qator qoldirmaydi', () => {
  const out = render('A\n{{#each xs}}\n- {{this}}\n{{/each}}\nB', { xs: [1, 2] });
  assert.equal(out, 'A\n- 1\n- 2\nB');
});

test('template: ichma-ich each va tashqi qiymatlarga kirish', () => {
  const out = render('{{#each g}}{{n}}:{{#each v}}{{this}}{{/each}};{{/each}}', { g: [{ n: 'a', v: [1, 2] }, { n: 'b', v: [3] }] });
  assert.equal(out, 'a:12;b:3;');
  assert.equal(render('{{#each xs}}{{pre}}{{this}} {{/each}}', { pre: '>', xs: ['a', 'b'] }), '>a >b ');
});

test('template: xato sintaksis aniqlanadi', () => {
  assert.ok(checkTemplate('{{#each x}}yopilmagan'));
  assert.ok(checkTemplate('{{/if}}'));
  assert.equal(checkTemplate('{{a}} {{#if b}}x{{/if}}'), null);
});

// ---------- reja ----------
test('plan: 4 daqiqalik hajmlar', () => {
  assert.equal(computePlan(mods.comparison, { minutes: 4, format: 'long' }).items, 23); // (240-10)/10
  assert.equal(computePlan(mods.monster, { minutes: 4, format: 'long' }).items, 28); // (240-14)/8
  assert.equal(computePlan(mods.quiz, { minutes: 4, format: 'long' }).items, 9);
  const st = computePlan(mods.stickman, { minutes: 4, format: 'long' });
  assert.equal(st.items, 30);
  assert.equal(st.words, 480);
});

test('plan: chegaralar va guruhlar', () => {
  const p = computePlan(mods.comparison, { minutes: 0.5, format: 'long' });
  assert.equal(p.items, 4);
  assert.ok(p.warnings.length > 0);
  const big = computePlan(mods.comparison, { minutes: 60, format: 'long' });
  assert.equal(big.items, 60);
  assert.equal(computePlan(mods.comparison, { minutes: 4, format: 'long' }).groups, 6); // 23/4 -> 6
  assert.throws(() => computePlan(mods.quiz, { minutes: 1, format: 'short' }));
});

test('plan: formatlar (Quiz/Monster/Comparison faqat long, Asl topish/Stikman ikkalasi)', () => {
  assert.deepEqual(availableFormats(mods.quiz), ['long']);
  assert.deepEqual(availableFormats(mods.monster), ['long']);
  assert.deepEqual(availableFormats(mods.comparison), ['long']);
  assert.deepEqual(availableFormats(mods['countries-vs']), ['long']);
  assert.deepEqual(availableFormats(mods['find-original']).sort(), ['long', 'short']);
  assert.deepEqual(availableFormats(mods.stickman).sort(), ['long', 'short']);
  assert.ok(durationChoices(mods.stickman, 'short').includes(0.5));
});

// ---------- JSON ajratish ----------
test('parse: kod bloki, ortiqcha matn, egri tirnoq, vergul', () => {
  assert.deepEqual(parseAiResponse('Mana:\n```json\n{"a": 1}\n```\nTayyor').data, { a: 1 });
  assert.deepEqual(parseAiResponse('Javob {"a": {"b": [1,2]}} oxiri').data, { a: { b: [1, 2] } });
  assert.deepEqual(parseAiResponse('{"a": 1,}').data, { a: 1 });
  assert.deepEqual(parseAiResponse('{“a”: “o\'zbek”}').data, { a: "o'zbek" });
  assert.deepEqual(parseAiResponse('{"t": "figurali } qavs"}').data, { t: 'figurali } qavs' });
  assert.deepEqual(parseAiResponse('{"t": "o‘zbek tili"}').data, { t: 'o‘zbek tili' });
});

test('parse: xato xabarlari', () => {
  assert.match(parseAiResponse('').error, /bo'sh/);
  assert.match(parseAiResponse('shunchaki matn').error, /topilmadi/);
  assert.match(parseAiResponse('```json\n{"a": [1, 2, {"b": 3').error, /tugallanmagan/);
  assert.match(parseAiResponse('{"a": 1 "b": 2}').error, /xato/);
});

// ---------- tekshiruv ----------
test('validate: raqam va matn majburlash, enum', () => {
  const schema = {
    type: 'object',
    required: ['n'],
    properties: {
      n: { type: 'number' },
      t: { type: 'string', transform: 'upper', enum: ['A', 'B'] },
    },
  };
  let r = validate(schema, { n: '5,400,000,000', t: 'a' });
  assert.ok(r.ok);
  assert.equal(r.data.n, 5400000000);
  assert.equal(r.data.t, 'A');
  r = validate(schema, { n: '12,5' });
  assert.equal(r.data.n, 12.5);
  r = validate(schema, { n: 'ko\'p' });
  assert.ok(!r.ok);
  assert.match(r.errors[0], /^n: raqam bo'lishi kerak/);
  r = validate(schema, {});
  assert.match(r.errors[0], /n: yetishmayapti/);
  r = validate(schema, { n: 1, t: 'Z' });
  assert.match(r.errors[0], /A \/ B/);
});

test('validate: soni kam bo\'lsa xato, ozgina farq ogohlantirish', () => {
  const schema = { type: 'object', properties: { xs: { type: 'array', planCount: 'items', tolerance: 0.1, items: { type: 'number' } } } };
  const ctx = { plan: { items: 20 } };
  assert.ok(!validate(schema, { xs: Array(15).fill(1) }, ctx).ok);
  const near = validate(schema, { xs: Array(19).fill(1) }, ctx);
  assert.ok(near.ok);
  assert.equal(near.warnings.length, 1);
  assert.equal(validate(schema, { xs: Array(20).fill(1) }, ctx).warnings.length, 0);
});

test('validate: requiredIf va unique, xato yo\'li', () => {
  const schema = {
    type: 'object',
    properties: {
      xs: {
        type: 'array',
        unique: 'k',
        items: { type: 'object', properties: { k: { type: 'integer' }, kod: { type: 'string', requiredIf: { option: 'sh', in: ['p'] } } } },
      },
    },
  };
  let r = validate(schema, { xs: [{ k: 1 }, { k: 1 }] }, { opt: { sh: 'p' } });
  assert.ok(r.errors.some((e) => e.includes('xs[0].kod: yetishmayapti')));
  assert.ok(r.errors.some((e) => e.includes('xs[1].k') && e.includes('takrorlangan')));
  r = validate(schema, { xs: [{ k: 1 }] }, { opt: { sh: 'q' } });
  assert.ok(r.ok);
});

test('validate: xatolar soni cheklanadi', () => {
  const schema = { type: 'object', properties: { xs: { type: 'array', items: { type: 'number' } } } };
  const r = validate(schema, { xs: Array(30).fill('x') });
  assert.equal(r.errors.length, 13);
  assert.match(r.errors[12], /yana 18 ta xato/);
});

// ---------- modullar ----------
test('modullar: manifestlar to\'g\'ri', () => {
  for (const m of Object.values(mods)) assert.deepEqual(validateManifest(m), [], m.id);
});

test('modullar: buzuq manifest ushlanadi', () => {
  const bad = { ...mods.quiz, id: 'Bad ID', version: 'x', prompt: '{{#each a}}' };
  const errs = validateManifest(bad);
  assert.ok(errs.length >= 3);
  assert.ok(validateManifest({ ...mods.quiz, minApp: '9.0.0' }).some((e) => e.includes('versiyasini talab')));
  assert.ok(validateManifest({ ...mods.quiz, voice: { template: '{{#if x}}' } }).some((e) => e.startsWith('voice.template')));
});

test('prompt: har modul uchun buyruq to\'liq yig\'iladi', () => {
  for (const m of Object.values(mods)) {
    const fmt = availableFormats(m)[0];
    const { text, plan } = buildCommand(m, { topic: 'Sinov mavzusi', minutes: 4, format: fmt, language: 'uz', options: {} });
    assert.ok(text.includes('Sinov mavzusi'), m.id);
    assert.ok(text.includes(`${plan.items}`), m.id);
    assert.ok(text.includes('```json'), m.id);
    assert.ok(!/\{\{|\}\}/.test(text), `${m.id}: ishlatilmagan shablon belgisi qoldi`);
    assert.ok(!text.includes('undefined'), m.id);
  }
});

test('prompt: variantga qarab matn o\'zgaradi', () => {
  const cmp = (opt) => buildCommand(mods.comparison, { topic: 'x', minutes: 4, format: 'long', options: { shablon: opt } }).text;
  assert.ok(cmp('pillars').includes('ISO kodi'));
  assert.ok(!cmp('cards').includes('ISO kodi'));
  assert.ok(cmp('pairs').includes('ikkinchi_nom'));
  const mon = (original) => buildCommand(mods.monster, { topic: 'x', minutes: 4, format: 'long', options: { original } }).text;
  assert.ok(mon(true).includes('Godzilla'));
  assert.ok(!mon(false).includes('Godzilla'));
});

test('prompt: tilni almashtirish', () => {
  const t = buildCommand(mods.quiz, { topic: 'x', minutes: 4, format: 'long', language: 'qq' }).text;
  assert.ok(t.includes('qoraqalpoq tili'));
});

test('prompt: variant standarti (tanlanmagan bo\'lsa)', () => {
  const { opt, ids: o } = resolveOptions(mods.comparison, {});
  assert.equal(o.shablon, 'cards');
  assert.ok(opt.shablon.look);
  assert.equal(resolveOptions(mods.monster, {}).ids.original, true);
});

// ---------- to'liq oqim: namuna javob -> tekshiruv -> chiqishlar ----------
for (const id of ['comparison', 'monster', 'countries-vs', 'quiz', 'find-original', 'stickman']) {
  test(`oqim: ${id} (namuna javob tekshiruvdan o'tadi va chiqishlar yasaladi)`, () => {
    const m = mods[id];
    for (const format of availableFormats(m)) {
      const minutes = format === 'short' ? 1 : 4;
      const options = {};
      const { plan, optIds } = buildContext(m, { minutes, format, options });
      const sample = sampleFor(id, plan, optIds);
      const text = '```json\n' + JSON.stringify(sample, null, 2) + '\n```';
      const parsed = parseAiResponse(text);
      assert.ok(parsed.ok, id);
      const v = validate(m.schema, parsed.data, { plan, opt: optIds });
      assert.deepEqual(v.errors, [], `${id}/${format}`);
      const out = buildOutputs(m, v.data, options, { format });
      assert.equal(out.items.length, plan.items);
      for (const p of out.images) {
        assert.ok(p.prompt.length > 20, p.label);
        assert.ok(!/\{\{|undefined/.test(p.prompt), `${id}: ${p.prompt}`);
      }
      if (m.silent) assert.equal(out.voice, null);
      else assert.ok(out.voice && out.voiceWords > 0);
    }
  });
}

test('chiqish: comparison rasm guruhlari (4 tadan) va tartib', () => {
  const m = mods.comparison;
  const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long' });
  const data = validate(m.schema, sampleFor('comparison', plan, optIds), { plan, opt: optIds }).data;
  const out = buildOutputs(m, data, {});
  assert.equal(out.images.length, 6);
  assert.ok(out.images[0].prompt.includes('Panel 4:'));
  assert.ok(!out.images[0].prompt.includes('Panel 5:'));
  const last = out.images[5].prompt; // 23 ta: oxirgisida 3 ta
  assert.ok(last.includes('Panel 3:') && !last.includes('Panel 4:'));
  // qiymat bo'yicha o'sish tartibi
  const vals = out.items.map((o) => o.qiymat);
  assert.deepEqual(vals, [...vals].sort((a, b) => a - b));
});

test('chiqish: comparison shablonlariga qarab rasm turi', () => {
  const m = mods.comparison;
  for (const [sh, needle] of [['bars', 'icon'], ['cards', 'photo'], ['pairs', 'Column 1 bottom:'], ['pillars', 'no flags']]) {
    const options = { shablon: sh };
    const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long', options });
    const data = validate(m.schema, sampleFor('comparison', plan, optIds), { plan, opt: optIds }).data;
    const out = buildOutputs(m, data, options);
    assert.ok(out.images[0].prompt.includes(needle), `${sh}: ${out.images[0].prompt}`);
  }
});

test('chiqish: pillars uchun "kod" majburiy', () => {
  const m = mods.comparison;
  const options = { shablon: 'pillars' };
  const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long', options });
  const sample = sampleFor('comparison', plan, { shablon: 'cards' }); // kodsiz
  const v = validate(m.schema, sample, { plan, opt: optIds });
  assert.ok(!v.ok);
  assert.ok(v.errors[0].includes('.kod: yetishmayapti'));
});

test('chiqish: monster yashil fon va tartib', () => {
  const m = mods.monster;
  const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long' });
  const data = validate(m.schema, sampleFor('monster', plan, optIds), { plan, opt: optIds }).data;
  data.maxluqlar.reverse();
  const out = buildOutputs(m, data, {});
  assert.equal(out.images.length, plan.items);
  assert.ok(out.images[0].prompt.includes('#00FF00'));
  assert.ok(out.images[0].prompt.includes('pure black silhouette'));
  assert.ok(out.items[0].balandlik < out.items[1].balandlik);
  const colored = buildOutputs(m, data, { uslub: 'rangli' });
  assert.ok(colored.images[0].prompt.includes('full-color'));
});

test('chiqish: quiz har savolga 2 ta rasm va diktor matni', () => {
  const m = mods.quiz;
  const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long' });
  const data = validate(m.schema, sampleFor('quiz', plan, optIds), { plan, opt: optIds }).data;
  assert.equal(data.savollar[0].togri, 'B'); // namunada 'b' -> 'B'
  assert.ok(data.savollar.every((q) => /^[A-D]$/.test(q.togri)));
  const out = buildOutputs(m, data, {});
  assert.equal(out.images.length, plan.items * 2);
  assert.ok(out.images[1].prompt.startsWith('Edit the previous image'));
  assert.ok(out.images[1].prompt.includes('muddy footprints'));
  assert.ok(!out.images[0].prompt.includes('muddy footprints'));
  assert.ok(out.voice.startsWith('Salom, boshlaymiz.'));
  assert.ok(out.voice.includes('Savol 1.') && out.voice.includes(`Savol ${plan.items}.`));
  assert.ok(out.voice.includes('To\'g\'ri javob: B.'));
  assert.ok(out.voice.trim().endsWith('uchun.'));
});

test('chiqish: find-original — AI variantida qo\'shimcha prompt, dasturda yo\'q', () => {
  const m = mods['find-original'];
  const { plan, optIds } = buildContext(m, { minutes: 4, format: 'long' });
  const data = validate(m.schema, sampleFor('find-original', plan, optIds), { plan, opt: optIds }).data;
  assert.equal(buildOutputs(m, data, {}).images.length, plan.items);
  const ai = buildOutputs(m, data, { variantlar: 'ai', tor: '4x4' });
  assert.equal(ai.images.length, plan.items * 2);
  assert.ok(ai.images[1].prompt.includes('4x4'));
  assert.ok(ai.images[1].prompt.includes('other 15 cells'));
});

test('chiqish: stikman effekt kichik harfga o\'tadi, Shorts vertikal', () => {
  const m = mods.stickman;
  const { plan, optIds } = buildContext(m, { minutes: 1, format: 'short' });
  const data = validate(m.schema, sampleFor('stickman', plan, optIds), { plan, opt: optIds }).data;
  assert.ok(data.sahnalar.every((s) => s.effekt === s.effekt.toLowerCase()));
  const sh = buildOutputs(m, data, {}, { format: 'short' });
  assert.ok(sh.images[0].prompt.includes('vertical 9:16'));
  const lg = buildOutputs(m, data, {}, { format: 'long' });
  assert.ok(lg.images[0].prompt.includes('wide 16:9'));
  assert.equal(plan.items, 15);
});

test('chiqish: Davlatlar VS hisobi', () => {
  const m = mods['countries-vs'];
  const data = {
    tomonlar: [{ nom: 'A-davlat' }, { nom: 'B-davlat' }],
    kategoriyalar: [
      { nom: 'x', qiymat_a: 10, qiymat_b: 5 }, // A
      { nom: 'y', qiymat_a: 10, qiymat_b: 5, kattasi_yaxshi: false }, // B (kichigi yaxshi)
      { nom: 'z', qiymat_a: 7, qiymat_b: 7 }, // durang raund
      { nom: 'w', qiymat_a: 1, qiymat_b: 9 }, // B
    ],
  };
  const out = buildOutputs(m, data, {});
  assert.equal(out.computed.detail.sa, 1);
  assert.equal(out.computed.detail.sb, 2);
  assert.equal(out.computed.detail.winner, 'b');
  assert.deepEqual(out.computed.detail.rounds.map((r) => r.winner), ['a', 'b', null, 'b']);
  assert.equal(out.images.length, 0);
});

// ---------- AI saytiga uzatish ----------
test('handoff: ChatGPT/Claude oldindan to\'ldiriladi, Gemini yo\'q, uzun matnda o\'chadi', () => {
  assert.ok(planHandoff('chatgpt', 'salom dunyo').url.includes('?q=salom%20dunyo'));
  assert.ok(planHandoff('claude', 'x').prefilled);
  assert.equal(planHandoff('gemini', 'x').prefilled, false);
  assert.equal(planHandoff('chatgpt', 'x'.repeat(9000)).prefilled, false);
  assert.equal(planHandoff('chatgpt', 'x', { prefill: false }).prefilled, false);
  assert.throws(() => planHandoff('boshqa', 'x'));
});

test('versiya taqqoslash', () => {
  assert.equal(cmpVer('1.2.0', '1.10.0'), -1);
  assert.equal(cmpVer('2.0.0', '1.9.9'), 1);
  assert.equal(cmpVer('1.0.0', '1.0.0'), 0);
});

test('sortedItems asl obyektlarni qaytaradi (jadval tahriri uchun)', () => {
  const data = { obyektlar: [{ nom: 'a', qiymat: 5 }, { nom: 'b', qiymat: 1 }] };
  const items = sortedItems(mods.comparison, data);
  assert.equal(items[0].nom, 'b');
  assert.strictEqual(items[0], data.obyektlar[1]);
});
