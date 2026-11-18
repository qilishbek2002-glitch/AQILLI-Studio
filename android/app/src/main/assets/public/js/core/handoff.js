// Buyruqni AI saytiga uzatish: avval nusxalaydi, so'ng saytni ochadi (iloji bo'lsa buyruq bilan birga).
// Eslatma: ?q= orqali oldindan to'ldirish saytlar tomonidan o'zgartirilishi mumkin, shuning uchun
// buyruq har doim buferga ham nusxalanadi.

export const AI_SITES = {
  gemini: { label: 'Gemini', url: 'https://gemini.google.com/app', prefill: null },
  chatgpt: { label: 'ChatGPT', url: 'https://chatgpt.com/', prefill: (t) => `https://chatgpt.com/?q=${encodeURIComponent(t)}` },
  claude: { label: 'Claude', url: 'https://claude.ai/new', prefill: (t) => `https://claude.ai/new?q=${encodeURIComponent(t)}` },
};

const MAX_URL = 7000;

export function planHandoff(siteId, text, { prefill = true } = {}) {
  const site = AI_SITES[siteId];
  if (!site) throw new Error('Noma\'lum AI sayti');
  if (prefill && site.prefill) {
    const url = site.prefill(text);
    if (url.length <= MAX_URL) return { url, prefilled: true, label: site.label };
  }
  return { url: site.url, prefilled: false, label: site.label };
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* pastga o'tamiz */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// Tugma oddiy <a target="_blank"> havola bo'lib, bosilganda manzil shu yerda hisoblanadi.
// (window.open yopiq muhitda ishlamaydi, havola esa hamma joyda ishlaydi.)
export function prepareLink(anchor, siteId, getText, { prefill = true } = {}) {
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.href = AI_SITES[siteId].url;
  anchor.addEventListener('click', (e) => {
    const text = getText();
    if (!text) {
      e.preventDefault();
      return;
    }
    const plan = planHandoff(siteId, text, { prefill });
    anchor.href = plan.url;
    copyText(text);
    anchor.dispatchEvent(new CustomEvent('handoff', { detail: plan }));
  });
}
