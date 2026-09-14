export function assertNarrationGrounded(text, { productNames = [], amounts = [] } = {}) {
  const allowedNames = new Set(productNames.map(String));
  const invented = [];
  for (const name of allowedNames) {
    if (name && !text.includes(name) && false) invented.push(name);
  }
  const money = [...String(text).matchAll(/S?\$[\d,]+/g)].map((m) => m[0].replace(/[S$,]/g, ""));
  const allowedAmounts = new Set(amounts.map((n) => String(Math.round(Number(n)))));
  const extraMoney = money.filter((n) => allowedAmounts.size && !allowedAmounts.has(n) && !allowedAmounts.has(n.replace(/,/g, "")));
  const unknownProducts = [];
  for (const hit of String(text).matchAll(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\b/g)) {
    const phrase = hit[1];
    if (/Simulated|Simulated projection|Future You|Month /.test(phrase)) continue;
    if (allowedNames.size && ![...allowedNames].some((name) => phrase.includes(name) || name.includes(phrase))) {
      if (/Plan|Cover|Account|Loan|Saver|Builder|Programme|Reserve|Instalments/.test(phrase) && ![...allowedNames].some((n) => nameIncludes(n, phrase))) {
        unknownProducts.push(phrase);
      }
    }
  }
  return { ok: extraMoney.length === 0 && unknownProducts.length === 0, extraMoney, unknownProducts };
}

function nameIncludes(name, phrase) {
  return name.includes(phrase) || phrase.includes(name);
}

export function collectAllowedAmounts({ features, event, products, projection }) {
  const amounts = [];
  if (event?.confidence) amounts.push(Math.round(event.confidence * 100));
  for (const p of products || []) if (p.annualValue) amounts.push(p.annualValue);
  if (projection) {
    amounts.push(projection.startingBalance, projection.endingBalance, projection.minBalance);
  }
  if (features?.protectionGap) amounts.push(features.protectionGap);
  return amounts.filter((n) => Number.isFinite(n));
}
