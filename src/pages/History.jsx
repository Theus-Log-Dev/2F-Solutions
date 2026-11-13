import { useState } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useStore } from '../context/Store.jsx';
import { Empty } from '../components/ui.jsx';
import { monthSeries, byCategory, deltaPct } from '../utils/finance.js';
import { fmt } from '../utils/money.js';

const pct = (v) => (v === null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')}%`);

export default function HistoryReport({ month }) {
  const { state } = useStore();
  const [year, setYear] = useState(month.slice(0, 4));
  const years = [...new Set([...state.transactions.map((t) => t.date.slice(0, 4)), month.slice(0, 4), format(new Date(), 'yyyy')])].sort();
  const rows = monthSeries(state, year);
  const prevOfJan = monthSeries(state, String(Number(year) - 1))[11];
  const total = (k) => rows.reduce((s, r) => s + r[k], 0);
  const out = total('expense') + total('invest') + total('saved');
  const share = (v) => (out > 0 ? ((v / out) * 100).toFixed(1).replace('.', ',') : '0,0');
  const money = (v) => fmt(Math.round(v * 100));
  const chart = rows.map((r) => ({ m: r.m.slice(5), Receitas: r.income / 100, Despesas: r.expense / 100, Investido: r.invest / 100, Guardado: r.saved / 100 }));
  const wealth = rows.map((r) => ({ m: r.m.slice(5), 'Reserva acumulada': r.reserve / 100, 'Patrimônio investido': r.patrimonio / 100 }));
  const cats = byCategory(state, month);
  const prevCats = byCategory(state, format(subMonths(parseISO(month + '-01'), 1), 'yyyy-MM'));
  const catRows = cats.map((c, i) => ({ ...c, prev: prevCats[i].used })).filter((c) => c.used || c.prev);

  if (state.transactions.length === 0 && state.investments.length === 0) {
    return <Empty title="Sem histórico ainda" text="Registre movimentações para acompanhar a evolução mês a mês. Meses passados ficam sempre preservados." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Ano">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <p className="muted text-sm">Somente leitura. Receitas = receitas registradas em Movimentações.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Comparativo mensal — {year}</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <XAxis dataKey="m" stroke="#8fa3bd" fontSize={12} />
                <YAxis stroke="#8fa3bd" fontSize={12} width={54} />
                <Tooltip formatter={money} />
                <Legend />
                <Bar dataKey="Receitas" fill="#34d399" />
                <Bar dataKey="Despesas" fill="#f87171" />
                <Bar dataKey="Investido" fill="#70B7FF" />
                <Bar dataKey="Guardado" fill="#3985CC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Evolução patrimonial</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={wealth}>
                <XAxis dataKey="m" stroke="#8fa3bd" fontSize={12} />
                <YAxis stroke="#8fa3bd" fontSize={12} width={54} />
                <Tooltip formatter={money} />
                <Legend />
                <Line type="monotone" dataKey="Reserva acumulada" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Patrimônio investido" stroke="#70B7FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="muted text-left text-xs">
              <th className="py-2">Mês</th><th>Receitas</th><th>Despesas</th><th>Investido</th><th>Guardado</th><th>Resultado</th><th>Δ despesas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.m} className="border-t border-white/5">
                <td className="py-2 capitalize">{format(parseISO(r.m + '-01'), 'MMM', { locale: ptBR })}</td>
                <td>{fmt(r.income)}</td><td>{fmt(r.expense)}</td><td>{fmt(r.invest)}</td><td>{fmt(r.saved)}</td>
                <td className={r.result < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(r.result)}</td>
                <td className="muted">{pct(deltaPct(r.expense, (i === 0 ? prevOfJan : rows[i - 1]).expense))}</td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-semibold">
              <td className="py-2">Ano</td><td>{fmt(total('income'))}</td><td>{fmt(total('expense'))}</td><td>{fmt(total('invest'))}</td><td>{fmt(total('saved'))}</td>
              <td>{fmt(total('result'))}</td><td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <h3 className="font-semibold">Distribuição percentual — {year}</h3>
          <p className="muted text-xs">Parte de cada tipo no total saído (despesas + investido + guardado).</p>
          <p>Despesas: <b>{share(total('expense'))}%</b></p>
          <p>Investido: <b>{share(total('invest'))}%</b></p>
          <p>Guardado: <b>{share(total('saved'))}%</b></p>
        </div>
        <div className="card text-sm">
          <h3 className="mb-2 font-semibold">Categorias: {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: ptBR })} × mês anterior</h3>
          {catRows.length === 0 && <p className="muted">Sem despesas por categoria nesses dois meses.</p>}
          {catRows.map((c) => (
            <div key={c.id} className="flex justify-between border-b border-white/5 py-1.5">
              <span>{c.name}</span>
              <span className="muted">{fmt(c.prev)} → {fmt(c.used)} ({pct(deltaPct(c.used, c.prev))})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
