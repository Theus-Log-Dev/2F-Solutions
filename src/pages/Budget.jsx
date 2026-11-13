import { useStore } from '../context/Store.jsx';
import { personBudget, byCategory, settlement } from '../utils/finance.js';
import { fmt } from '../utils/money.js';
import { Kpi, Empty } from '../components/ui.jsx';

const ROWS = [['expense', 'Despesas'], ['invest', 'Investimentos'], ['reserve', 'Reserva']];

function Bar({ planned, actual }) {
  const over = planned > 0 && actual > planned;
  return (
    <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--surface)' }}>
      <div className={`h-2 rounded-full transition-all ${over ? 'bg-red-400' : 'bg-[#3985CC]'}`} style={{ width: `${planned > 0 ? Math.min((actual / planned) * 100, 100) : 0}%` }} />
    </div>
  );
}

export default function Budget({ month }) {
  const { state } = useStore();
  const people = personBudget(state, month);
  const cats = byCategory(state, month);
  const settle = settlement(state, month);
  const sum = (f) => people.reduce((s, p) => s + f(p), 0);
  const income = sum((p) => p.income);
  const unallocated = sum((p) => p.unallocated);

  return (
    <div className="space-y-6">
      {income === 0 && <Empty title="Defina as rendas" text="Cadastre salários e destinações de cada pessoa em Configurações para montar o orçamento." />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Renda total do casal" value={fmt(income)} />
        <Kpi label="Planejado em despesas" value={fmt(sum((p) => p.planned.expense))} />
        <Kpi label="Planejado em investimentos e reserva" value={fmt(sum((p) => p.planned.invest + p.planned.reserve))} />
        <Kpi label="Não alocado" value={fmt(unallocated)} tone={unallocated < 0 ? 'neg' : 'pos'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {people.map((p) => (
          <div key={p.id} className="card space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              <span className="muted text-sm">Renda {fmt(p.income)}</span>
            </div>
            {ROWS.map(([k, label]) => (
              <div key={k} className="text-sm">
                <div className="flex justify-between"><span>{label}</span><span className="muted">{fmt(p.actual[k])} de {fmt(p.planned[k])}</span></div>
                <Bar planned={p.planned[k]} actual={p.actual[k]} />
              </div>
            ))}
            <p className={`text-sm ${p.unallocated < 0 ? 'text-red-400' : 'muted'}`}>
              {p.unallocated < 0 ? `As destinações excedem a renda em ${fmt(-p.unallocated)}` : `Não alocado: ${fmt(p.unallocated)}`}
            </p>
          </div>
        ))}
      </div>
      {settle.some((p) => p.paid || p.share) && (
        <div className="card space-y-2 text-sm">
          <h3 className="font-semibold">Divisão das despesas compartilhadas</h3>
          {settle.map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2">
              <span>{p.name}</span>
              <span className="muted">
                pagou {fmt(p.paid)} · parte {fmt(p.share)} ·{' '}
                <b className={p.balance < 0 ? 'text-red-400' : 'text-emerald-400'}>{p.balance < 0 ? `deve ${fmt(-p.balance)}` : p.balance > 0 ? `recebe ${fmt(p.balance)}` : 'quite'}</b>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <h3 className="mb-3 font-semibold">Categorias: planejado × utilizado</h3>
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{c.name}</span>
                <span className="muted">
                  {c.limit > 0 ? `${fmt(c.used)} de ${fmt(c.limit)} · restante ${fmt(c.remaining)} · ${c.pct.toFixed(0)}%` : `${fmt(c.used)} (sem limite)`}
                  {c.over && <b className="ml-2 text-red-400">Excedido</b>}
                </span>
              </div>
              {c.limit > 0 && <Bar planned={c.limit} actual={c.used} />}
            </div>
          ))}
          {cats.length === 0 && <p className="muted text-sm">Nenhuma categoria. Crie em Configurações.</p>}
        </div>
      </div>
    </div>
  );
}
