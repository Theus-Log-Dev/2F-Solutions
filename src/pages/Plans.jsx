import { useState } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Empty, Kpi } from '../components/ui.jsx';
import { goalStats, planSummary, plannedPurchase } from '../utils/finance.js';
import { fmt, toCents, fromCents } from '../utils/money.js';

const PRIOS = ['Alta', 'Média', 'Baixa'];
const GOAL_CATS = ['Moto', 'Carro', 'Casa', 'Casamento', 'Viagem', 'Reserva de emergência', 'Mudança de país', 'Outro'];
const STATUS = { desejado: 'Desejado', planejado: 'Planejado', comprado: 'Comprado', cancelado: 'Cancelado' };
const KINDS = { income: 'Renda extra prevista', fixed: 'Despesa fixa', variable: 'Despesa variável', invest: 'Investimento planejado', reserve: 'Reserva', goal: 'Aporte em meta' };
const today = () => format(new Date(), 'yyyy-MM-dd');
const who = (s, id) => s.people.find((p) => p.id === id)?.name || 'Casal';

function Owner({ value, onChange }) {
  const { state } = useStore();
  return (
    <select className="input" value={value} onChange={onChange}>
      <option value="both">Casal</option>
      {state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}
const Actions = ({ onEdit, onDel }) => (
  <>
    <button className="muted hover:text-[#70B7FF]" onClick={onEdit} aria-label="Editar"><Pencil size={16} /></button>
    <button className="muted hover:text-red-400" onClick={onDel} aria-label="Excluir"><Trash2 size={16} /></button>
  </>
);
const Select = ({ value, onChange, options }) => (
  <select className="input" value={value} onChange={onChange}>{options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
);

function Goals() {
  const { state, dispatch } = useStore();
  const goals = goalStats(state);
  const [form, setForm] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [err, setErr] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const open = (g) => {
    setErr({});
    setForm(g ? { ...g, target: fromCents(g.target), saved: fromCents(g.saved) }
      : { id: '', name: '', description: '', target: '', saved: '', deadline: '', ownerId: 'both', priority: 'Média', category: GOAL_CATS[0] });
  };
  const submit = (e) => {
    e.preventDefault();
    const target = toCents(form.target);
    const er = {};
    if (!form.name.trim()) er.name = 'Informe o nome da meta.';
    if (target <= 0) er.target = 'Informe um valor maior que zero.';
    setErr(er);
    if (Object.keys(er).length) return;
    const { contributions, accumulated, remaining, pct, ...item } = form;
    dispatch({ type: 'list:save', key: 'goals', item: { ...item, name: form.name.trim(), target, saved: toCents(form.saved) } });
    setForm(null);
  };
  const saveAporte = (e) => {
    e.preventDefault();
    const amount = toCents(aporte.amount);
    if (amount <= 0 || !aporte.date) return setAporte({ ...aporte, error: 'Informe um valor maior que zero e a data.' });
    const g = aporte.g;
    dispatch({ type: 'tx:save', tx: { id: '', type: 'save', description: `Contribuição — ${g.name}`, amount, date: aporte.date, categoryId: '', personId: g.ownerId !== 'both' ? g.ownerId : state.people[0].id, shared: g.ownerId === 'both', note: '', goalId: g.id } });
    setAporte(null);
  };
  const del = (g) => window.confirm(`Excluir a meta "${g.name}"? As contribuições continuam em Movimentações.`) && dispatch({ type: 'list:delete', key: 'goals', id: g.id });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button className="btn" onClick={() => open()}><Plus size={16} /> Nova meta</button></div>
      {goals.length === 0 && <Empty title="Nenhuma meta" text="Crie uma meta (moto, casa, viagem...) e acompanhe o progresso com suas contribuições." />}
      {goals.map((g, i) => (
        <div key={g.id} className="card space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{g.name} <span className="muted text-xs">{g.category} · prioridade {g.priority}</span></p>
              <p className="muted text-xs">{who(state, g.ownerId)}{g.deadline && ` · prazo ${format(parseISO(g.deadline), 'dd/MM/yyyy')}`}</p>
              {g.description && <p className="muted text-xs">{g.description}</p>}
            </div>
            <button className="btn-ghost btn" onClick={() => setAporte({ g, amount: '', date: today() })}><Plus size={14} /> Contribuir</button>
            <button className="muted disabled:opacity-30" disabled={i === 0} aria-label="Subir" onClick={() => dispatch({ type: 'list:move', key: 'goals', id: g.id, dir: -1 })}><ChevronUp size={16} /></button>
            <button className="muted disabled:opacity-30" disabled={i === goals.length - 1} aria-label="Descer" onClick={() => dispatch({ type: 'list:move', key: 'goals', id: g.id, dir: 1 })}><ChevronDown size={16} /></button>
            <Actions onEdit={() => open(g)} onDel={() => del(g)} />
          </div>
          <div className="flex justify-between text-sm"><span>{fmt(g.accumulated)} de {fmt(g.target)}</span><span className="muted">{g.pct.toFixed(0)}% · faltam {fmt(g.remaining)}</span></div>
          <div className="h-2 rounded-full" style={{ background: 'var(--surface)' }}><div className="h-2 rounded-full bg-[#3985CC] transition-all" style={{ width: `${g.pct}%` }} /></div>
          <details className="text-sm">
            <summary className="muted cursor-pointer">Histórico de contribuições ({g.contributions.length})</summary>
            {g.saved > 0 && <p className="muted py-1 text-xs">Valor inicial informado: {fmt(g.saved)}</p>}
            {g.contributions.map((t) => <div key={t.id} className="flex justify-between py-1"><span>{format(parseISO(t.date), 'dd/MM/yyyy')}</span><span>{fmt(t.amount)}</span></div>)}
          </details>
        </div>
      ))}
      {form && (
        <Modal title={form.id ? 'Editar meta' : 'Nova meta'} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Nome" error={err.name}><input className="input" value={form.name} onChange={set('name')} /></Field>
            <Field label="Descrição"><input className="input" value={form.description} onChange={set('description')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor desejado (R$)" error={err.target}><input className="input" inputMode="decimal" value={form.target} onChange={set('target')} /></Field>
              <Field label="Já acumulado (R$)"><input className="input" inputMode="decimal" placeholder="0,00" value={form.saved} onChange={set('saved')} /></Field>
              <Field label="Prazo"><input type="date" className="input" value={form.deadline} onChange={set('deadline')} /></Field>
              <Field label="Responsável"><Owner value={form.ownerId} onChange={set('ownerId')} /></Field>
              <Field label="Prioridade"><Select value={form.priority} onChange={set('priority')} options={PRIOS.map((p) => [p, p])} /></Field>
              <Field label="Categoria"><Select value={form.category} onChange={set('category')} options={GOAL_CATS.map((p) => [p, p])} /></Field>
            </div>
            <button className="btn w-full" type="submit">Salvar meta</button>
          </form>
        </Modal>
      )}
      {aporte && (
        <Modal title={`Contribuir — ${aporte.g.name}`} onClose={() => setAporte(null)}>
          <form onSubmit={saveAporte} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><input className="input" inputMode="decimal" placeholder="0,00" value={aporte.amount} onChange={(e) => setAporte({ ...aporte, amount: e.target.value })} /></Field>
              <Field label="Data"><input type="date" className="input" value={aporte.date} onChange={(e) => setAporte({ ...aporte, date: e.target.value })} /></Field>
            </div>
            {aporte.error && <p className="text-xs text-red-400">{aporte.error}</p>}
            <p className="muted text-xs">A contribuição é registrada uma única vez, como dinheiro guardado.</p>
            <button className="btn w-full" type="submit">Registrar contribuição</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Wishes() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(null);
  const [buy, setBuy] = useState(null);
  const [err, setErr] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const open = (w) => {
    setErr({});
    setForm(w ? { ...w, estimated: fromCents(w.estimated) } : { id: '', name: '', description: '', estimated: '', date: '', priority: 'Média', ownerId: 'both', status: 'desejado' });
  };
  const submit = (e) => {
    e.preventDefault();
    const estimated = toCents(form.estimated);
    const er = {};
    if (!form.name.trim()) er.name = 'Informe o nome do item.';
    if (estimated <= 0) er.estimated = 'Informe o valor estimado.';
    setErr(er);
    if (Object.keys(er).length) return;
    dispatch({ type: 'list:save', key: 'wishes', item: { ...form, name: form.name.trim(), estimated } });
    setForm(null);
  };
  const confirmBuy = (e) => {
    e.preventDefault();
    const amount = toCents(buy.amount);
    if (amount <= 0 || !buy.date) return setBuy({ ...buy, error: 'Informe o valor pago e a data.' });
    const w = buy.w;
    dispatch({ type: 'tx:save', tx: { id: '', type: 'expense', description: `Compra — ${w.name}`, amount, date: buy.date, categoryId: buy.categoryId, personId: w.ownerId !== 'both' ? w.ownerId : state.people[0].id, shared: w.ownerId === 'both', note: '', wishId: w.id } });
    dispatch({ type: 'list:save', key: 'wishes', item: { ...w, status: 'comprado' } });
    setBuy(null);
  };
  const groups = state.wishes.reduce((m, w) => { const k = w.date ? w.date.slice(0, 7) : 'sem'; (m[k] = m[k] || []).push(w); return m; }, {});
  const open_ = state.wishes.filter((w) => ['desejado', 'planejado'].includes(w.status)).reduce((s, w) => s + w.estimated, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="muted text-sm">Em aberto (desejado + planejado): <b className="text-[#70B7FF]">{fmt(open_)}</b></p>
        <button className="btn" onClick={() => open()}><Plus size={16} /> Novo item</button>
      </div>
      {state.wishes.length === 0 && <Empty title="Lista vazia" text="Cadastre compras futuras e organize por mês previsto. Só entram nos resultados quando você confirmar a compra." />}
      {Object.keys(groups).sort().map((k) => (
        <div key={k} className="card p-0">
          <p className="px-4 pt-3 text-sm font-semibold capitalize">{k === 'sem' ? 'Sem data prevista' : format(parseISO(k + '-01'), 'MMMM yyyy', { locale: ptBR })}</p>
          <div className="divide-y divide-white/5">
            {groups[k].map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${w.status === 'cancelado' ? 'line-through opacity-60' : ''}`}>{w.name}</p>
                  <p className="muted text-xs">{STATUS[w.status]} · prioridade {w.priority} · {who(state, w.ownerId)}{w.date && ` · ${format(parseISO(w.date), 'dd/MM/yyyy')}`}</p>
                  {w.description && <p className="muted text-xs">{w.description}</p>}
                </div>
                <span className="font-semibold">{fmt(w.estimated)}</span>
                {['desejado', 'planejado'].includes(w.status) && (
                  <button className="btn-ghost btn" onClick={() => setBuy({ w, amount: fromCents(w.estimated), date: today(), categoryId: state.categories[0]?.id || '' })}>Confirmar compra</button>
                )}
                <Actions onEdit={() => open(w)} onDel={() => window.confirm(`Excluir "${w.name}"?`) && dispatch({ type: 'list:delete', key: 'wishes', id: w.id })} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {form && (
        <Modal title={form.id ? 'Editar item' : 'Novo item'} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Produto ou objetivo" error={err.name}><input className="input" value={form.name} onChange={set('name')} /></Field>
            <Field label="Descrição"><input className="input" value={form.description} onChange={set('description')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor estimado (R$)" error={err.estimated}><input className="input" inputMode="decimal" value={form.estimated} onChange={set('estimated')} /></Field>
              <Field label="Data prevista"><input type="date" className="input" value={form.date} onChange={set('date')} /></Field>
              <Field label="Prioridade"><Select value={form.priority} onChange={set('priority')} options={PRIOS.map((p) => [p, p])} /></Field>
              <Field label="Responsável"><Owner value={form.ownerId} onChange={set('ownerId')} /></Field>
              <Field label="Status"><Select value={form.status} onChange={set('status')} options={Object.entries(STATUS)} /></Field>
            </div>
            <p className="muted text-xs">Para marcar como comprado, use “Confirmar compra” na lista: assim a despesa real é registrada.</p>
            <button className="btn w-full" type="submit">Salvar item</button>
          </form>
        </Modal>
      )}
      {buy && (
        <Modal title={`Confirmar compra — ${buy.w.name}`} onClose={() => setBuy(null)}>
          <form onSubmit={confirmBuy} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor pago (R$)"><input className="input" inputMode="decimal" value={buy.amount} onChange={(e) => setBuy({ ...buy, amount: e.target.value })} /></Field>
              <Field label="Data"><input type="date" className="input" value={buy.date} onChange={(e) => setBuy({ ...buy, date: e.target.value })} /></Field>
            </div>
            <Field label="Categoria"><Select value={buy.categoryId} onChange={(e) => setBuy({ ...buy, categoryId: e.target.value })} options={state.categories.map((c) => [c.id, c.name])} /></Field>
            {buy.error && <p className="text-xs text-red-400">{buy.error}</p>}
            <p className="muted text-xs">Isso cria uma despesa real e remove o item do planejado.</p>
            <button className="btn w-full" type="submit">Confirmar e registrar despesa</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function NextMonth({ month }) {
  const { state, dispatch } = useStore();
  const next = format(addMonths(parseISO(month + '-01'), 1), 'yyyy-MM');
  const s = planSummary(state, next);
  const items = state.planItems.filter((p) => p.month === next);
  const buys = state.wishes.filter((w) => plannedPurchase(w, next));
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const open = (p) => { setErr({}); setForm(p ? { ...p, amount: fromCents(p.amount) } : { id: '', month: next, kind: 'fixed', label: '', amount: '', goalId: state.goals[0]?.id || '' }); };
  const submit = (e) => {
    e.preventDefault();
    const amount = toCents(form.amount);
    const goal = state.goals.find((g) => g.id === form.goalId);
    const label = form.kind === 'goal' ? goal?.name || '' : form.label.trim();
    const er = {};
    if (!label) er.label = form.kind === 'goal' ? 'Crie uma meta primeiro.' : 'Informe uma descrição.';
    if (amount <= 0) er.amount = 'Informe um valor maior que zero.';
    setErr(er);
    if (Object.keys(er).length) return;
    dispatch({ type: 'list:save', key: 'planItems', item: { ...form, label, amount, goalId: form.kind === 'goal' ? form.goalId : '' } });
    setForm(null);
  };

  return (
    <div className="space-y-4">
      <p className="muted text-sm">Previsão de <b className="capitalize">{format(parseISO(next + '-01'), 'MMMM yyyy', { locale: ptBR })}</b>. Estes valores são apenas planejados e não entram nas movimentações reais.</p>
      {s.balance < 0 && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">Os planos passam da renda prevista em {fmt(-s.balance)}.</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Renda prevista" value={fmt(s.income)} note="Salários e extras cadastrados + extras previstas" />
        <Kpi label="Despesas planejadas" value={fmt(s.fixed + s.variable)} note={`Fixas ${fmt(s.fixed)} · variáveis ${fmt(s.variable)}`} />
        <Kpi label="Investimentos previstos" value={fmt(s.invest)} />
        <Kpi label="Reserva" value={fmt(s.reserve)} />
        <Kpi label="Aportes em metas" value={fmt(s.goals)} />
        <Kpi label="Compras planejadas" value={fmt(s.purchases)} />
        <Kpi label="Saldo previsto" value={fmt(s.balance)} tone={s.balance < 0 ? 'neg' : 'pos'} />
        <Kpi label="Renda comprometida" value={`${s.pct.toFixed(1).replace('.', ',')}%`} />
      </div>
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Itens do planejamento</h3>
          <button className="btn" onClick={() => open()}><Plus size={16} /> Novo item</button>
        </div>
        {items.length === 0 && <p className="muted text-sm">Nenhum item. Adicione despesas fixas e variáveis, investimentos, reserva e aportes em metas.</p>}
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-white/5 py-2 text-sm">
            <span className="min-w-0 flex-1">{p.label} <span className="muted text-xs">{KINDS[p.kind]}</span></span>
            <span className="font-semibold">{fmt(p.amount)}</span>
            <Actions onEdit={() => open(p)} onDel={() => dispatch({ type: 'list:delete', key: 'planItems', id: p.id })} />
          </div>
        ))}
        {buys.length > 0 && <p className="muted mt-3 text-xs">Compras do mês (da Lista de desejos): {buys.map((w) => `${w.name} ${fmt(w.estimated)}`).join(' · ')}</p>}
      </div>
      {form && (
        <Modal title={form.id ? 'Editar item' : 'Novo item do planejamento'} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Tipo"><Select value={form.kind} onChange={set('kind')} options={Object.entries(KINDS)} /></Field>
            {form.kind === 'goal'
              ? <Field label="Meta" error={err.label}><Select value={form.goalId} onChange={set('goalId')} options={state.goals.map((g) => [g.id, g.name])} /></Field>
              : <Field label="Descrição" error={err.label}><input className="input" value={form.label} onChange={set('label')} /></Field>}
            <Field label="Valor (R$)" error={err.amount}><input className="input" inputMode="decimal" placeholder="0,00" value={form.amount} onChange={set('amount')} /></Field>
            <button className="btn w-full" type="submit">Salvar item</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Plans({ month }) {
  const [tab, setTab] = useState('goals');
  const tabs = [['goals', 'Metas'], ['wishes', 'Lista de desejos'], ['next', 'Próximo mês']];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} className={`shrink-0 rounded-xl px-4 py-2 text-sm ${tab === id ? 'bg-[#3985CC] text-white' : 'muted'}`} style={tab === id ? undefined : { background: 'var(--surface)' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'goals' && <Goals />}
      {tab === 'wishes' && <Wishes />}
      {tab === 'next' && <NextMonth month={month} />}
    </div>
  );
}
