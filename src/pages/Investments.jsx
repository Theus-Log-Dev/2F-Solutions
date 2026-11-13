import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Empty, Kpi } from '../components/ui.jsx';
import { investmentStats, evolution } from '../utils/finance.js';
import { fmt, toCents, fromCents } from '../utils/money.js';

const KINDS = ['Renda fixa', 'Ações', 'Fundos', 'FIIs', 'Cripto', 'Previdência', 'Outro'];
const COLORS = ['#3985CC', '#70B7FF', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#8fa3bd'];
const today = () => format(new Date(), 'yyyy-MM-dd');
const blank = (s) => ({ id: '', name: '', institution: '', kind: KINDS[0], ownerId: s.people[0].id, initial: '', balance: '', balanceDate: today(), returnInfo: '', history: [] });

export default function Investments() {
  const { state, dispatch } = useStore();
  const st = investmentStats(state);
  const [form, setForm] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const money = (v) => fmt(Math.round(v * 100));
  const person = (id) => state.people.find((p) => p.id === id)?.name || '—';
  const kinds = Object.entries(st.byKind).filter(([, v]) => v > 0).map(([name, v], i) => ({ name, value: v / 100, fill: COLORS[i % COLORS.length] }));
  const evo = evolution(state.investments).map((d) => ({ m: format(parseISO(d.date), 'dd/MM/yy'), Patrimônio: d.total / 100 }));
  const aportes = state.transactions.filter((t) => t.type === 'invest' && t.investmentId).sort((a, b) => b.date.localeCompare(a.date));

  const open = (v) => {
    setErrors({});
    if (!v) return setForm(blank(state));
    const { contributed, ...rest } = v;
    setForm({ ...rest, initial: fromCents(v.initial), balance: fromCents(v.balance) });
  };
  const del = (v) => window.confirm(`Excluir "${v.name}"? Os aportes continuam nas movimentações, sem vínculo.`) && dispatch({ type: 'inv:delete', id: v.id });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Informe o nome do investimento.';
    if (!form.balanceDate) err.balanceDate = 'Informe a data do saldo.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const initial = toCents(form.initial);
    const balance = form.balance === '' ? initial : toCents(form.balance);
    const history = [...form.history.filter((h) => h.date !== form.balanceDate), { date: form.balanceDate, amount: balance }].sort((a, b) => a.date.localeCompare(b.date));
    dispatch({ type: 'inv:save', inv: { ...form, name: form.name.trim(), initial, balance, history } });
    setForm(null);
  };

  const saveAporte = (e) => {
    e.preventDefault();
    const amount = toCents(aporte.amount);
    if (amount <= 0 || !aporte.date) return setAporte({ ...aporte, error: 'Informe um valor maior que zero e a data.' });
    dispatch({ type: 'tx:save', tx: { id: '', type: 'invest', description: `Aporte — ${aporte.inv.name}`, amount, date: aporte.date, categoryId: '', personId: aporte.inv.ownerId, shared: false, note: aporte.note, investmentId: aporte.inv.id } });
    setAporte(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn" onClick={() => open()}><Plus size={16} /> Novo investimento</button>
      </div>
      {st.rows.length === 0 ? (
        <Empty title="Nenhum investimento" text="Cadastre uma aplicação e informe o saldo atual. Aportes entram nas movimentações como investimento, sem contar como despesa." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Patrimônio investido" value={fmt(st.total)} />
            <Kpi label="Total aportado" value={fmt(st.contributed)} />
            {Object.entries(st.byOwner).map(([id, v]) => <Kpi key={id} label={`Investido por ${person(id)}`} value={fmt(v)} />)}
          </div>
          <div className="space-y-3">
            {st.rows.map((v) => (
              <div key={v.id} className="card flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{v.name}</p>
                  <p className="muted text-xs">{v.kind} · {v.institution || 'Sem instituição'} · {person(v.ownerId)}</p>
                  {v.returnInfo && <p className="muted text-xs">Rentabilidade informada: {v.returnInfo}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmt(v.balance)}</p>
                  <p className="muted text-xs">Aportado {fmt(v.contributed)}{v.balanceDate && ` · saldo de ${format(parseISO(v.balanceDate), 'dd/MM/yyyy')}`}</p>
                </div>
                <button className="btn-ghost btn" onClick={() => setAporte({ inv: v, amount: '', date: today(), note: '' })}><Plus size={14} /> Aporte</button>
                <button className="muted hover:text-[#70B7FF]" onClick={() => open(v)} aria-label="Editar"><Pencil size={16} /></button>
                <button className="muted hover:text-red-400" onClick={() => del(v)} aria-label="Excluir"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-semibold">Evolução do patrimônio</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={evo}>
                    <XAxis dataKey="m" stroke="#8fa3bd" fontSize={12} />
                    <YAxis stroke="#8fa3bd" fontSize={12} width={54} />
                    <Tooltip formatter={money} />
                    <Line type="monotone" dataKey="Patrimônio" stroke="#70B7FF" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">Distribuição por modalidade</h3>
              {kinds.length ? (
                <div className="h-56">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={kinds} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {kinds.map((k) => <Cell key={k.name} fill={k.fill} />)}
                      </Pie>
                      <Tooltip formatter={money} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="muted text-sm">Informe o saldo atual para ver a distribuição.</p>}
            </div>
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Histórico de aportes</h3>
            {aportes.length === 0 && <p className="muted text-sm">Nenhum aporte registrado. Use o botão “Aporte” em um investimento.</p>}
            {aportes.map((t) => (
              <div key={t.id} className="flex justify-between border-b border-white/5 py-2 text-sm">
                <span>{t.description} <span className="muted">{format(parseISO(t.date), 'dd/MM/yyyy')}</span></span>
                <span className="text-[#70B7FF]">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {form && (
        <Modal title={form.id ? 'Editar investimento' : 'Novo investimento'} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Nome" error={errors.name}><input className="input" value={form.name} onChange={set('name')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Instituição"><input className="input" value={form.institution} onChange={set('institution')} /></Field>
              <Field label="Tipo de aplicação">
                <select className="input" value={form.kind} onChange={set('kind')}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
              </Field>
              <Field label="Titular">
                <select className="input" value={form.ownerId} onChange={set('ownerId')}>{state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </Field>
              <Field label="Valor inicial (R$)"><input className="input" inputMode="decimal" placeholder="0,00" value={form.initial} onChange={set('initial')} /></Field>
              <Field label="Saldo atual (R$)"><input className="input" inputMode="decimal" placeholder="0,00" value={form.balance} onChange={set('balance')} /></Field>
              <Field label="Data do saldo" error={errors.balanceDate}><input type="date" className="input" value={form.balanceDate} onChange={set('balanceDate')} /></Field>
            </div>
            <Field label="Rentabilidade informada (opcional)"><input className="input" placeholder="ex.: 100% do CDI" value={form.returnInfo} onChange={set('returnInfo')} /></Field>
            <button className="btn w-full" type="submit">Salvar investimento</button>
          </form>
        </Modal>
      )}

      {aporte && (
        <Modal title={`Novo aporte — ${aporte.inv.name}`} onClose={() => setAporte(null)}>
          <form onSubmit={saveAporte} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><input className="input" inputMode="decimal" placeholder="0,00" value={aporte.amount} onChange={(e) => setAporte({ ...aporte, amount: e.target.value })} /></Field>
              <Field label="Data"><input type="date" className="input" value={aporte.date} onChange={(e) => setAporte({ ...aporte, date: e.target.value })} /></Field>
            </div>
            <Field label="Observação (opcional)"><input className="input" value={aporte.note} onChange={(e) => setAporte({ ...aporte, note: e.target.value })} /></Field>
            {aporte.error && <p className="text-xs text-red-400">{aporte.error}</p>}
            <p className="muted text-xs">O saldo atual não muda sozinho: atualize-o em “Editar” quando consultar sua corretora.</p>
            <button className="btn w-full" type="submit">Registrar aporte</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
