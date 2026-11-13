export const TYPES = { income: 'Receita', expense: 'Despesa', invest: 'Investimento', save: 'Guardado', transfer: 'Transferência' };
export const monthOf = (date) => date.slice(0, 7);
const todayStr = () => new Date().toLocaleDateString('sv-SE');
// Ocorrências futuras de séries (recorrentes/parceladas) ficam agendadas e só contam como realizadas a partir da data.
export const effective = (t) => !t.scheduled || t.date <= todayStr();
export const txs = (state) => state.transactions.filter(effective);
export const referenceIncome = (people) => people.reduce((s, p) => s + p.salary + p.extra, 0);

// Renda de referência = salários + rendas extras cadastradas (limite de planejamento).
// Saldo = referência + receitas registradas − (despesas + investimentos + guardado) registrados.
export function summarize(state, month) {
  const tx = txs(state).filter((t) => monthOf(t.date) === month);
  const sum = (type) => tx.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const reference = referenceIncome(state.people);
  const income = sum('income');
  const expense = sum('expense');
  const invest = sum('invest');
  const saved = sum('save');
  const committed = expense + invest + saved;
  return {
    reference, income, expense, invest, saved, committed,
    balance: reference + income - committed,
    percentUsed: reference > 0 ? (committed / reference) * 100 : 0,
  };
}

export function byCategory(state, month) {
  return state.categories.map((c) => {
    const used = state.transactions
      .filter((t) => t.type === 'expense' && t.categoryId === c.id && monthOf(t.date) === month)
      .reduce((s, t) => s + t.amount, 0);
    // Transferências entre categorias movem orçamento do mês (não são receita nem despesa).
    const moved = txs(state)
      .filter((t) => t.type === 'transfer' && t.tKind === 'category' && monthOf(t.date) === month)
      .reduce((s, t) => s + (t.toId === c.id ? t.amount : 0) - (t.fromId === c.id ? t.amount : 0), 0);
    const limit = Math.max(c.limit + moved, 0);
    return { ...c, limit, used, remaining: limit - used, pct: limit > 0 ? (used / limit) * 100 : 0, over: limit > 0 && used > limit };
  });
}

// Orçamento por pessoa: destinações planejadas (cadastro) × movimentações realizadas do mês.
export function personBudget(state, month) {
  const tx = txs(state).filter((t) => monthOf(t.date) === month);
  // Despesa compartilhada é dividida conforme a regra escolhida; as demais contam para o responsável.
  const sum = (pid, type) => tx.filter((t) => t.type === type && (t.personId === pid || (type === 'expense' && t.shared)))
    .reduce((s, t) => s + (type === 'expense' && t.shared ? splitOf(state, t)[pid] || 0 : t.amount), 0);
  return state.people.map((p) => {
    const income = p.salary + p.extra;
    const planned = { expense: p.toExpenses || 0, invest: p.toInvest || 0, reserve: p.toReserve || 0 };
    return {
      ...p, income, planned,
      unallocated: income - planned.expense - planned.invest - planned.reserve,
      actual: { expense: sum(p.id, 'expense'), invest: sum(p.id, 'invest'), reserve: sum(p.id, 'save') },
    };
  });
}

// Patrimônio = saldos informados manualmente. Aportes vêm das movimentações vinculadas (sem duplicar).
export function investmentStats(state) {
  const contributed = (id) => txs(state).filter((t) => t.type === 'invest' && t.investmentId === id).reduce((s, t) => s + t.amount, 0);
  const rows = state.investments.map((v) => ({ ...v, contributed: contributed(v.id) }));
  const group = (key) => rows.reduce((m, v) => ({ ...m, [v[key]]: (m[v[key]] || 0) + v.balance }), {});
  return {
    rows,
    total: rows.reduce((s, v) => s + v.balance, 0),
    contributed: rows.reduce((s, v) => s + v.contributed, 0),
    byOwner: group('ownerId'),
    byKind: group('kind'),
  };
}

export function evolution(investments) {
  const dates = [...new Set(investments.flatMap((v) => v.history.map((h) => h.date)))].sort();
  return dates.map((date) => ({
    date,
    total: investments.reduce((s, v) => {
      const last = v.history.filter((h) => h.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop();
      return s + (last ? last.amount : 0);
    }, 0),
  }));
}

export const plannedPurchase = (w, month) => !!w.date && monthOf(w.date) === month && ['desejado', 'planejado'].includes(w.status);

// Metas: acumulado = valor inicial informado + contribuições (movimentações "Guardado" vinculadas à meta).
export function goalStats(state) {
  return state.goals.map((g) => {
    const contributions = txs(state).filter((t) => t.type === 'save' && t.goalId === g.id).sort((a, b) => b.date.localeCompare(a.date));
    const moved = txs(state)
      .filter((t) => t.type === 'transfer' && t.tKind === 'goal')
      .reduce((s, t) => s + (t.toId === g.id ? t.amount : 0) - (t.fromId === g.id ? t.amount : 0), 0);
    const accumulated = g.saved + moved + contributions.reduce((s, t) => s + t.amount, 0);
    return { ...g, contributions, accumulated, remaining: Math.max(g.target - accumulated, 0), pct: g.target > 0 ? Math.min((accumulated / g.target) * 100, 100) : 0 };
  });
}

// Previsão de um mês. Nada aqui vira movimentação real; compras já confirmadas (status "comprado") ficam de fora.
export function planSummary(state, month) {
  const items = state.planItems.filter((p) => p.month === month);
  const sum = (kind) => items.filter((p) => p.kind === kind).reduce((s, p) => s + p.amount, 0);
  const purchases = state.wishes.filter((w) => plannedPurchase(w, month)).reduce((s, w) => s + w.estimated, 0);
  const income = referenceIncome(state.people) + sum('income');
  const fixed = sum('fixed'), variable = sum('variable'), invest = sum('invest'), reserve = sum('reserve'), goals = sum('goal');
  const committed = fixed + variable + invest + reserve + goals + purchases;
  return { income, fixed, variable, invest, reserve, goals, purchases, committed, balance: income - committed, pct: income > 0 ? (committed / income) * 100 : 0 };
}

// Série anual para o Histórico (apenas movimentações registradas).
export function monthSeries(state, year) {
  const evo = evolution(state.investments);
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, '0')}`;
    const tx = txs(state).filter((t) => monthOf(t.date) === m);
    const sum = (type) => tx.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    const income = sum('income'), expense = sum('expense'), invest = sum('invest'), saved = sum('save');
    const snap = evo.filter((d) => monthOf(d.date) <= m).pop();
    return {
      m, income, expense, invest, saved, result: income - expense - invest - saved,
      reserve: txs(state).filter((t) => t.type === 'save' && monthOf(t.date) <= m).reduce((s, t) => s + t.amount, 0),
      patrimonio: snap ? snap.total : 0,
    };
  });
}

export const deltaPct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

// Parte de cada pessoa numa despesa compartilhada (soma sempre = valor; sobra de centavos vai para a primeira pessoa).
export function splitOf(state, t) {
  const ids = state.people.map((p) => p.id);
  const inc = state.people.map((p) => p.salary + p.extra);
  const total = inc.reduce((a, b) => a + b, 0);
  const sh = {};
  if (t.splitMode === 'custom' && t.split) ids.forEach((id) => { sh[id] = Number.isInteger(t.split[id]) ? t.split[id] : 0; });
  else if (t.splitMode === 'proportional' && total > 0) ids.forEach((id, i) => { sh[id] = Math.floor((t.amount * inc[i]) / total); });
  else ids.forEach((id) => { sh[id] = Math.floor(t.amount / ids.length); });
  sh[ids[0]] += t.amount - ids.reduce((s, id) => s + sh[id], 0);
  return sh;
}

// Acerto entre o casal: quem pagou × parte de cada um nas despesas compartilhadas do mês.
export function settlement(state, month) {
  const rows = Object.fromEntries(state.people.map((p) => [p.id, { paid: 0, share: 0 }]));
  txs(state).filter((t) => t.type === 'expense' && t.shared && monthOf(t.date) === month).forEach((t) => {
    if (rows[t.personId]) rows[t.personId].paid += t.amount;
    const sh = splitOf(state, t);
    state.people.forEach((p) => { rows[p.id].share += sh[p.id] || 0; });
  });
  return state.people.map((p) => ({ ...p, ...rows[p.id], balance: rows[p.id].paid - rows[p.id].share }));
}
