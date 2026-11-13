import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { summarize, byCategory, effective } from '../utils/finance.js';
import { fmt } from '../utils/money.js';
import { Kpi, Empty, TONE } from '../components/ui.jsx';

export default function Dashboard({ month }) {
  const { state } = useStore();
  const s = summarize(state, month);
  const base = parseISO(month + '-01');
  const prev = summarize(state, format(subMonths(base, 1), 'yyyy-MM'));
  const cats = byCategory(state, month);
  const shown = cats.filter((c) => c.used || c.limit);
  const recent = state.transactions.filter(effective).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const delta = s.expense - prev.expense;
  const pie = [['Despesas', s.expense, '#f87171'], ['Investido', s.invest, '#70B7FF'], ['Guardado', s.saved, '#3985CC'], ['Saldo', Math.max(s.balance, 0), '#34d399']]
    .filter((p) => p[1] > 0)
    .map(([name, v, fill]) => ({ name, value: v / 100, fill }));
  const bars = [5, 4, 3, 2, 1, 0].map((i) => {
    const d = subMonths(base, i);
    const x = summarize(state, format(d, 'yyyy-MM'));
    return { m: format(d, 'MM/yy'), Receitas: (x.reference + x.income) / 100, Despesas: x.expense / 100 };
  });
  const money = (v) => fmt(Math.round(v * 100));

  return (
    <div className="space-y-6">
      {!s.reference && state.transactions.length === 0 && (
        <Empty title="Comece por aqui" text="Informe as rendas em Configurações e registre a primeira movimentação." />
      )}
      {cats.filter((c) => c.over).map((c) => (
        <div key={c.id} className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} /> Orçamento de {c.name} excedido em {fmt(-c.remaining)}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Renda de referência" value={fmt(s.reference)} />
        <Kpi label="Despesas" value={fmt(s.expense)} tone="neg" note={`${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} vs. mês anterior`} />
        <Kpi label="Investido" value={fmt(s.invest)} />
        <Kpi label="Guardado" value={fmt(s.saved)} />
        <Kpi label="Saldo disponível" value={fmt(s.balance)} tone={s.balance < 0 ? 'neg' : 'pos'} />
        <Kpi label="Renda utilizada" value={`${s.percentUsed.toFixed(1).replace('.', ',')}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Distribuição da renda</h3>
          {pie.length ? (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {pie.map((p) => <Cell key={p.name} fill={p.fill} />)}
                  </Pie>
                  <Tooltip formatter={money} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="muted text-sm">Sem dados neste mês.</p>}
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Receitas e despesas (6 meses)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={bars}>
                <XAxis dataKey="m" stroke="#8fa3bd" fontSize={12} />
                <YAxis stroke="#8fa3bd" fontSize={12} width={54} />
                <Tooltip formatter={money} />
                <Legend />
                <Bar dataKey="Receitas" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Gastos por categoria</h3>
          {shown.length === 0 && <p className="muted text-sm">Nenhum gasto ou limite definido.</p>}
          {shown.map((c) => (
            <div key={c.id} className="mb-3 text-sm">
              <div className="flex justify-between">
                <span>{c.name}</span>
                <span className="muted">{fmt(c.used)}{c.limit > 0 && ` / ${fmt(c.limit)}`}</span>
              </div>
              {c.limit > 0 && (
                <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--surface)' }}>
                  <div className={`h-2 rounded-full transition-all ${c.over ? 'bg-red-400' : 'bg-[#3985CC]'}`} style={{ width: `${Math.min(c.pct, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Últimas movimentações</h3>
          {recent.length === 0 && <p className="muted text-sm">Nenhuma movimentação registrada.</p>}
          {recent.map((t) => (
            <div key={t.id} className="flex justify-between border-b border-white/5 py-2 text-sm">
              <span>{t.description} <span className="muted">{format(parseISO(t.date), 'dd/MM/yyyy')}</span></span>
              <span className={TONE[t.type]}>{t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '−'}{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
