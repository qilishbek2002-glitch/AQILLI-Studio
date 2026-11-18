// Bo'lim muqovalari: yorqin, qalin konturli "stiker" uslubidagi SVG rasmlar.
const INK = '#14163a';
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

const wrap = (bg, body) =>
  `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
  <rect width="320" height="200" fill="${bg}"/>${body}</svg>`;

function comparison() {
  const colors = ['#ffd23f', '#ff7a59', '#ff4fa3', '#9a6bff', '#3b8cff'];
  const bars = colors
    .map((c, i) => {
      const h = 38 + i * 26;
      const x = 28 + i * 54;
      const y = 172 - h;
      return `<rect x="${x}" y="${y}" width="44" height="${h}" rx="9" fill="${c}" ${S}/>
      <circle cx="${x + 22}" cy="${y - 13}" r="10" fill="#fff" ${S}/>
      <path d="M${x + 7} ${y + 16}h30" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>`;
    })
    .join('');
  return wrap(
    '#1ec9f2',
    `<circle cx="285" cy="35" r="55" fill="#7be4ff" opacity=".5"/><circle cx="30" cy="175" r="40" fill="#7be4ff" opacity=".4"/>
    <path d="M14 172h292" ${S}/>${bars}
    <path d="M268 20l5 11 12 1.5-9 8 2.5 12-10.5-6-10.5 6 2.5-12-9-8 12-1.5z" fill="#ffd23f" ${S} transform="translate(-4 -2)"/>`
  );
}

function monster() {
  const legs = [70, 100, 140, 170]
    .map((x, i) => `<path d="M${x} 118 L${x + (i < 2 ? -16 : 16)} 150 L${x + (i < 2 ? -10 : 10)} 176" fill="none" stroke="#0c0e22" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return wrap(
    '#5a5f86',
    `<ellipse cx="80" cy="40" rx="60" ry="14" fill="#fff" opacity=".18"/><ellipse cx="250" cy="28" rx="52" ry="12" fill="#fff" opacity=".16"/>
    <path d="M10 60h300M10 100h300M10 140h300" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-dasharray="3 6"/>
    <rect y="176" width="320" height="24" fill="#2a2d49"/>
    ${legs}
    <ellipse cx="120" cy="100" rx="64" ry="40" fill="#0c0e22"/>
    <circle cx="98" cy="92" r="11" fill="#ff3b4a" stroke="#fff" stroke-width="2"/><circle cx="142" cy="92" r="11" fill="#ff3b4a" stroke="#fff" stroke-width="2"/>
    <circle cx="101" cy="89" r="3.5" fill="#fff"/><circle cx="145" cy="89" r="3.5" fill="#fff"/>
    <path d="M92 114l8 10 8-10 8 10 8-10 8 10 8-10 8 10 8-10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M228 176v-46l16-18 16 18v46" fill="#0c0e22"/><circle cx="238" cy="128" r="4" fill="#ff3b4a"/><circle cx="250" cy="128" r="4" fill="#ff3b4a"/>
    <ellipse cx="296" cy="162" rx="12" ry="14" fill="#0c0e22"/><circle cx="292" cy="158" r="2.6" fill="#ff3b4a"/><circle cx="300" cy="158" r="2.6" fill="#ff3b4a"/>`
  );
}

function countries() {
  return wrap(
    '#ff4d5e',
    `<path d="M0 0h190l-70 200H0z" fill="#2f6bff"/>
    <rect x="24" y="54" width="96" height="66" rx="8" fill="#fff" ${S}/>
    <rect x="24" y="54" width="96" height="22" rx="8" fill="#2f6bff"/><rect x="24" y="98" width="96" height="22" rx="8" fill="#ffd23f" opacity="0"/>
    <path d="M24 98h96" stroke="#ff4d5e" stroke-width="22"/><rect x="24" y="54" width="96" height="66" rx="8" fill="none" ${S}/>
    <rect x="200" y="80" width="96" height="66" rx="8" fill="#fff" ${S}/>
    <path d="M232 80v66M264 80v66" stroke="${INK}" stroke-width="3"/><rect x="200" y="80" width="32" height="66" rx="8" fill="#19d96b"/>
    <rect x="264" y="80" width="32" height="66" rx="8" fill="#ffd23f"/><rect x="200" y="80" width="96" height="66" rx="8" fill="none" ${S}/>
    <circle cx="112" cy="54" r="16" fill="#19d96b" ${S}/><path d="m104 54 6 6 10-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="288" cy="80" r="16" fill="#19d96b" ${S}/><path d="m280 80 6 6 10-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="160" cy="112" r="34" fill="#ffd23f" ${S}/><text x="160" y="124" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-weight="900" font-size="32" fill="${INK}">VS</text>`
  );
}

function quiz() {
  const chips = ['A', 'B', 'C', 'D']
    .map((c, i) => `<rect x="${178 + i * 33}" y="160" width="28" height="26" rx="9" fill="${i === 2 ? '#19d96b' : '#fff'}" ${S}/><text x="${192 + i * 33}" y="179" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15" fill="${INK}">${c}</text>`)
    .join('');
  return wrap(
    '#7a4dff',
    `<circle cx="40" cy="30" r="50" fill="#a182ff" opacity=".5"/>
    <path d="M168 150 220 188" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M168 150 220 188" stroke="#ffd23f" stroke-width="8" stroke-linecap="round"/>
    <circle cx="120" cy="92" r="64" fill="#e9fbff" ${S} stroke-width="5"/>
    <path d="M70 118 100 82l22 20 28-34" fill="none" stroke="#9fb4d6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
    <circle cx="132" cy="96" r="24" fill="none" stroke="#ff4d5e" stroke-width="6"/><circle cx="132" cy="96" r="7" fill="#ff4d5e"/>
    <text x="250" y="86" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="78" fill="#ffd23f" stroke="${INK}" stroke-width="3" paint-order="stroke">?</text>
    <text x="292" y="130" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="#fff" stroke="${INK}" stroke-width="3" paint-order="stroke">?</text>
    ${chips}`
  );
}

function find() {
  const tiles = [];
  const palette = ['#ff4d5e', '#ffd23f', '#3b8cff', '#ff7a59', '#9a6bff', '#fff'];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 28 + c * 66;
      const y = 26 + r * 52;
      const hit = r === 1 && c === 2;
      const col = palette[(r * 4 + c) % palette.length];
      tiles.push(`<rect x="${x}" y="${y}" width="58" height="44" rx="10" fill="#fff" ${S} ${hit ? 'stroke-width="5"' : ''}/>
      <circle cx="${x + 29}" cy="${y + 22}" r="${hit ? 13 : 11 + ((r + c) % 3)}" fill="${col}" stroke="${INK}" stroke-width="2.5"/>`);
      if (hit) tiles.push(`<rect x="${x - 5}" y="${y - 5}" width="68" height="54" rx="13" fill="none" stroke="#ffd23f" stroke-width="5"/><circle cx="${x + 56}" cy="${y + 2}" r="13" fill="#19d96b" ${S}/><path d="m${x + 50} ${y + 2} 5 5 8-10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  return wrap(
    '#19d96b',
    `<circle cx="300" cy="190" r="60" fill="#7ff0ab" opacity=".55"/>${tiles.join('')}
    <rect x="28" y="178" width="264" height="12" rx="6" fill="#fff" ${S} stroke-width="2.5"/><rect x="28" y="178" width="150" height="12" rx="6" fill="#ff4d5e" ${S} stroke-width="2.5"/>`
  );
}

function stickman() {
  return wrap(
    '#ff9a2e',
    `<circle cx="40" cy="170" r="60" fill="#ffc46b" opacity=".6"/>
    <path d="M0 176h320v24H0z" fill="#e8781a"/>
    <circle cx="96" cy="68" r="24" fill="#fff" ${S} stroke-width="4"/>
    <circle cx="88" cy="64" r="3" fill="${INK}"/><circle cx="104" cy="64" r="3" fill="${INK}"/><path d="M87 76q9 8 18 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M96 92v50M96 104l-28 20M96 104l30-14M96 142l-22 36M96 142l22 36" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="168" cy="118" r="6" fill="#fff" ${S} stroke-width="2.5"/><circle cx="182" cy="102" r="9" fill="#fff" ${S} stroke-width="2.5"/>
    <ellipse cx="236" cy="62" rx="62" ry="42" fill="#fff" ${S}/>
    <circle cx="236" cy="56" r="19" fill="#ffd23f" ${S}/><path d="M228 78h16v10h-16z" fill="#c9cde6" ${S} stroke-width="2.5"/>
    <path d="M236 28v-9M212 38l-6-6M260 38l6-6M200 58h-9M272 58h9" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
  );
}

function generic(accent = '#3b8cff') {
  return wrap(
    accent,
    `<circle cx="80" cy="60" r="70" fill="#fff" opacity=".18"/><circle cx="260" cy="160" r="80" fill="#000" opacity=".12"/>
    <rect x="100" y="56" width="120" height="88" rx="16" fill="#fff" ${S}/><path d="M150 84 186 100 150 116z" fill="${accent}" ${S}/>`
  );
}

const MAP = { comparison, monster, countries, quiz, find, stickman };

function coverSvg(manifest) {
  const fn = MAP[manifest.cover];
  return fn ? fn() : generic(manifest.accent);
}

const esc = (v) => String(v).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);

// Ustuvorlik: foydalanuvchi tanlagan rasm, keyin modul faylidagi "coverImage", keyin chizilgan muqova
export function coverHtml(manifest, custom = {}) {
  const src = custom[manifest.id] || manifest.coverImage;
  if (src) return `<img src="${esc(src)}" alt="" class="cover-img" draggable="false">`;
  return coverSvg(manifest);
}

// Tanlangan rasmni 640x384 ga moslab kesadi va JPEG qiladi (xotirani tejash uchun)
export function fitImage(file, w = 640, h = 384) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Faqat rasm fayli tanlang (JPG, PNG, WebP).'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Rasm juda katta (12 MB dan oshmasin).'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bu rasmni ochib bo\'lmadi. Boshqa fayl tanlang.'));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        const k = Math.max(w / img.width, h / img.height); // "cover": butun maydonni to'ldiradi
        const dw = img.width * k;
        const dh = img.height * k;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
