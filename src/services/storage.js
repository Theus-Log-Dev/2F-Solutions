const KEY = 'financas-casal';
export const VERSION = 1;

export const emptyState = () => ({
  version: VERSION,
  theme: 'dark',
  people: [
    { id: 'p1', name: 'Pessoa 1', salary: 0, extra: 0, toExpenses: 0, toInvest: 0, toReserve: 0 },
    { id: 'p2', name: 'Pessoa 2', salary: 0, extra: 0, toExpenses: 0, toInvest: 0, toReserve: 0 },
  ],
  categories: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'].map((name, i) => ({ id: 'c' + (i + 1), name, limit: 0 })),
  investments: [],
  goals: [],
  wishes: [],
  planItems: [],
  transactions: [],
});

const S = (v, d = '') => (typeof v === 'string' ? v : d);
const I = (n) => (Number.isInteger(n) ? n : 0);
const L = (a, fn) => (Array.isArray(a) ? a : []).filter((x) => x && x.id).map(fn);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Valida e normaliza dados vindos do LocalStorage ou de um backup. Retorna null se inválido.
export function validate(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.people) || !Array.isArray(d.categories) || !Array.isArray(d.transactions)) return null;
  const int = (n) => (Number.isInteger(n) ? n : 0);
  return {
    version: VERSION,
    theme: d.theme === 'light' ? 'light' : 'dark',
    people: emptyState().people.map((p, i) => ({
      id: p.id,
      name: String(d.people[i]?.name || p.name),
      salary: int(d.people[i]?.salary),
      extra: int(d.people[i]?.extra),
      toExpenses: int(d.people[i]?.toExpenses),
      toInvest: int(d.people[i]?.toInvest),
      toReserve: int(d.people[i]?.toReserve),
    })),
    categories: d.categories
      .filter((c) => c && c.id && typeof c.name === 'string')
      .map((c) => ({ id: String(c.id), name: c.name, limit: int(c.limit) })),
    goals: L(d.goals, (g) => ({ id: String(g.id), name: S(g.name), description: S(g.description), target: I(g.target), saved: I(g.saved), deadline: DATE.test(g.deadline) ? g.deadline : '', ownerId: S(g.ownerId, 'both'), priority: S(g.priority, 'Média'), category: S(g.category, 'Outro') })),
    wishes: L(d.wishes, (w) => ({ id: String(w.id), name: S(w.name), description: S(w.description), estimated: I(w.estimated), date: DATE.test(w.date) ? w.date : '', priority: S(w.priority, 'Média'), ownerId: S(w.ownerId, 'both'), status: ['desejado', 'planejado', 'comprado', 'cancelado'].includes(w.status) ? w.status : 'desejado' })),
    planItems: L(d.planItems, (p) => ({ id: String(p.id), month: S(p.month), kind: S(p.kind, 'variable'), label: S(p.label), amount: I(p.amount), goalId: S(p.goalId) })),
    investments: (Array.isArray(d.investments) ? d.investments : [])
      .filter((v) => v && v.id && typeof v.name === 'string')
      .map((v) => ({
        id: String(v.id), name: v.name, institution: String(v.institution || ''), kind: String(v.kind || 'Outro'),
        ownerId: String(v.ownerId || 'p1'), initial: int(v.initial), balance: int(v.balance),
        balanceDate: /^\d{4}-\d{2}-\d{2}$/.test(v.balanceDate) ? v.balanceDate : '', returnInfo: String(v.returnInfo || ''),
        history: (Array.isArray(v.history) ? v.history : []).filter((h) => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && Number.isInteger(h.amount)),
      })),
    transactions: d.transactions.filter(
      (t) => t && t.id && Number.isInteger(t.amount) && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && ['income', 'expense', 'invest', 'save', 'transfer'].includes(t.type)
    ),
  };
}

export function load() {
  try {
    return validate(JSON.parse(localStorage.getItem(KEY))) || emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Não foi possível salvar os dados', e);
  }
}

export function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function toCSV(s) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = s.transactions.map((t) =>
    [
      t.date, t.type, t.description,
      s.categories.find((c) => c.id === t.categoryId)?.name,
      t.shared ? 'Compartilhada' : s.people.find((p) => p.id === t.personId)?.name,
      (t.amount / 100).toFixed(2).replace('.', ','),
      t.note,
    ].map(q).join(';')
  );
  return '\ufeff' + ['Data;Tipo;Descrição;Categoria;Responsável;Valor;Observação', ...rows].join('\r\n');
}
