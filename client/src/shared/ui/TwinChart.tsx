type Branch = { trajectory?: { projectedBalance: number }[] };

const x = (i: number) => 10 + i * (580 / 11);
const y = (v: number, min: number, range: number) => 205 - ((v - min) / range) * 180;

function linePath(values: number[], min: number, range: number) {
  return values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v, min, range)}`).join(" ");
}

export function TwinChart({
  ignored,
  modeled,
  fillId = "fill",
}: {
  ignored?: Branch;
  modeled?: Branch;
  fillId?: string;
}) {
  const base = (ignored?.trajectory || []).map((p) => p.projectedBalance);
  const next = (modeled?.trajectory || []).map((p) => p.projectedBalance);
  if (!base.length || !next.length) return <div className="chart" />;
  const max = Math.max(...next, ...base);
  const min = Math.min(...next, ...base, 0);
  const range = max - min || 1;
  const area = `${linePath(next, min, range)} L${x(Math.min(11, next.length - 1))},215 L${x(0)},215 Z`;
  return (
    <div className="chart">
      <svg viewBox="0 0 600 230" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--sc-brand-blue)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--sc-brand-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" style={{ fill: `url(#${fillId})` }} d={area} />
        <path className="line base" d={linePath(base, min, range)} />
        <path className="line solution" d={linePath(next, min, range)} />
      </svg>
    </div>
  );
}

export function miniSpark(ignored?: Branch, modeled?: Branch, fillId = "s") {
  const base = (ignored?.trajectory || []).map((p) => p.projectedBalance);
  const next = (modeled?.trajectory || []).map((p) => p.projectedBalance);
  if (!base.length) return "";
  const max = Math.max(...next, ...base);
  const min = Math.min(...next, ...base, 0);
  const range = max - min || 1;
  const w = 160;
  const h = 40;
  const pad = 2;
  const sx = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, base.length - 1);
  const sy = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const area = `${path(next)} L${sx(next.length - 1).toFixed(1)},${h - pad} L${sx(0).toFixed(1)},${h - pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".28"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area" style="fill:url(#${fillId})" d="${area}"/><path class="line base" d="${path(base)}"/><path class="line solution" d="${path(next)}"/></svg>`;
}
