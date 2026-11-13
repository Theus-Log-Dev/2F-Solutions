export const TONE = { income: 'text-emerald-400', expense: 'text-red-400', invest: 'text-[#70B7FF]', save: 'text-[#70B7FF]', transfer: 'text-[#8fa3bd]' };

export function Kpi({ label, value, tone, note }) {
  const c = tone === 'neg' ? 'text-red-400' : tone === 'pos' ? 'text-emerald-400' : '';
  return (
    <div className="card">
      <p className="muted text-xs">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${c}`}>{value}</p>
      {note && <p className="muted mt-1 text-xs">{note}</p>}
    </div>
  );
}

export function Empty({ title, text }) {
  return (
    <div className="card text-center">
      <p className="font-semibold">{title}</p>
      <p className="muted mt-1 text-sm">{text}</p>
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="muted mb-1 block">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
