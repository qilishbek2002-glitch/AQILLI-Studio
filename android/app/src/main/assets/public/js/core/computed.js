// Modullar nom bilan chaqira oladigan tayyor hisoblashlar.
// Muhim: masofadan yangilanadigan modullar faqat ma'lumot, bu yerda kod faqat dastur bilan keladi.

function countriesScore(data) {
  const a = data?.tomonlar?.[0]?.nom || 'A';
  const b = data?.tomonlar?.[1]?.nom || 'B';
  let sa = 0;
  let sb = 0;
  const rounds = (data?.kategoriyalar || []).map((k, i) => {
    const good = k.kattasi_yaxshi !== false;
    let winner = null;
    if (typeof k.qiymat_a === 'number' && typeof k.qiymat_b === 'number' && k.qiymat_a !== k.qiymat_b) {
      const aBigger = k.qiymat_a > k.qiymat_b;
      winner = aBigger === good ? 'a' : 'b';
    }
    if (winner === 'a') sa++;
    if (winner === 'b') sb++;
    return { no: i + 1, nom: k.nom, winner };
  });
  const winner = sa === sb ? 'durang' : sa > sb ? 'a' : 'b';
  return {
    title: 'Hisob',
    lines: [
      `${a}: ${sa} ball`,
      `${b}: ${sb} ball`,
      winner === 'durang' ? 'Natija: durang' : `G'olib: ${winner === 'a' ? a : b}`,
    ],
    detail: { a, b, sa, sb, winner, rounds },
  };
}

export const COMPUTED = { countriesScore };
