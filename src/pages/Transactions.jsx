import { useState } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import Modal from '../components/Modal.jsx';
import { Field, Empty, TONE } from '../components/ui.jsx';
import { TYPES, monthOf, goalStats } from '../utils/finance.js';
import { fmt, toCents, fromCents } from '../utils/money.js';

const blank = (s) => ({
  id: '', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'expense',
  categoryId: s.categories[0]?.id || '', personId: s.people[0].id, shared: false, note: '', investmentId: '', repeat: 'none', count: '2', splitMode: 'equal', splitCustom: {},
});

export default function Transactions({ month }) {
  const { state, dispatch, uid } = useStore();
  const [f, setF] = useState({ type: '', categoryId: '', personId: '' });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [tf, setTf] = useState(null);
  const opts = (k) => (k === 'goal' ? state.goals : state.categories);
  const openTransfer = (t) => {
    setErrors({});
    setTf(t
      ? { id: t.id, kind: t.tKind, fromId: t.fromId, toId: t.toId, amount: fromCents(t.amount), date: t.date, note: t.note || '' }
      : { id: '', kind: 'category', fromId: state.categories[0]?.id || '', toId: state.categories[1]?.id || '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
  };
  const saveTransfer = (e) => {
    e.preventDefault();
    const amount = toCents(tf.amount);
    const err = {};
    if (!tf.fromId || !tf.toId || tf.fromId === tf.toId) err.to = 'Escolha origem e destino diferentes.';
    if (amount <= 0) err.amount = 'Informe um valor maior que zero.';
    if (!tf.date) err.date = 'Informe a data.';
    if (!tf.id && tf.kind === 'goal' && !err.to) {
      const g = goalStats(state).find((x) => x.id === tf.fromId);
      if (g && amount > g.accumulated) err.amount = 'Valor maior que o acumulado na meta de origem.';
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    const name = (id) => opts(tf.kind).find((x) => x.id === id)?.name || '?';
    dispatch({ type: 'tx:save', tx: { id: tf.id, type: 'transfer', tKind: tf.kind, fromId: tf.fromId, toId: tf.toId, description: `Transferência: ${name(tf.fromId)} → ${name(tf.toId)}`, amount, date: tf.date, categoryId: '', personId: state.people[0].id, shared: true, note: tf.note } });
    setTf(null);
  };

  const list = state.transactions
    .filter((t) => monthOf(t.date) === month && (!f.type || t.type === f.type) && (!f.categoryId || t.categoryId === f.categoryId) && (!f.personId || t.personId === f.personId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const nameOf = (arr, id, d) => arr.find((x) => x.id === id)?.name || d;
  const open = (t) => {
    if (t && t.type === 'transfer') return openTransfer(t);
    setErrors({});
    setForm(t ? { ...blank(state), ...t, amount: fromCents(t.amount), splitMode: t.splitMode || 'equal', splitCustom: Object.fromEntries(Object.entries(t.split || {}).map(([k, v]) => [k, fromCents(v)])), repeat: 'none' } : blank(state));
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const del = (t) => {
    if (!window.confirm(`Excluir "${t.description}"?`)) return;
    const later = t.groupId ? state.transactions.filter((x) => x.groupId === t.groupId && x.date > t.date).map((x) => x.id) : [];
    const all = later.length > 0 && window.confirm(`Esta movimentação faz parte de uma série. Excluir também as ${later.length} próximas ocorrências?`);
    dispatch(all ? { type: 'tx:deleteMany', ids: [t.id, ...later] } : { type: 'tx:delete', id: t.id });
  };

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    const amount = toCents(form.amount);
    if (!form.description.trim()) err.description = 'Informe uma descrição.';
    if (amount <= 0) err.amount = 'Informe um valor maior que zero.';
    if (!form.date) err.date = 'Informe a data.';
    const split = form.type === 'expense' && form.shared && form.splitMode === 'custom' ? Object.fromEntries(state.people.map((p) => [p.id, toCents(form.splitCustom[p.id])])) : undefined;
    if (split && Object.values(split).reduce((a, b) => a + b, 0) !== amount) err.split = 'A soma das partes deve ser igual ao valor.';
    if (split && !form.id && form.repeat !== 'none') err.split = 'Divisão personalizada não vale para séries; use igualitária ou proporcional.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const { repeat, count, splitCustom, ...base } = form;
    const tx = { ...base, description: form.description.trim(), amount, investmentId: form.type === 'invest' ? form.investmentId || '' : '', splitMode: form.type === 'expense' && form.shared ? form.splitMode : 'equal', split };
    const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), 60);
    if (!form.id && repeat !== 'none' && n > 1) {
      const gid = uid();
      const now = format(new Date(), 'yyyy-MM-dd');
      const each = Math.floor(amount / n);
      const txs = Array.from({ length: n }, (_, i) => {
        const date = format(addMonths(parseISO(form.date), i), 'yyyy-MM-dd');
        const inst = repeat === 'installments';
        return { ...tx, id: '', date, groupId: gid, scheduled: date > now, amount: inst ? (i === 0 ? amount - each * (n - 1) : each) : amount, description: inst ? `${tx.description} (${i + 1}/${n})` : tx.description };
      });
      dispatch({ type: 'tx:addMany', txs });
    } else dispatch({ type: 'tx:save', tx });
    setForm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="">Todos os tipos</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-auto" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
          <option value="">Todas as categorias</option>
          {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={f.personId} onChange={(e) => setF({ ...f, personId: e.target.value })}>
          <option value="">Todos os responsáveis</option>
          {state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn-ghost btn ml-auto" onClick={() => openTransfer()}>Nova transferência</button>
        <button className="btn" onClick={() => open()}><Plus size={16} /> Nova movimentação</button>
      </div>

      {list.length === 0 ? (
        <Empty title="Nenhuma movimentação" text="Nada registrado neste mês com esses filtros. Use “Nova movimentação” para começar." />
      ) : (
        <div className="card divide-y divide-white/5 p-0">
          {list.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.description}</p>
                <p className="muted text-xs">
                  {format(parseISO(t.date), 'dd/MM/yyyy')} · {t.scheduled && t.date > format(new Date(), 'yyyy-MM-dd') ? 'Agendada · ' : ''}{TYPES[t.type]} · {t.type === 'transfer' ? (t.tKind === 'goal' ? 'entre metas' : 'entre categorias') : `${nameOf(state.categories, t.categoryId, 'Sem categoria')} · ${t.shared ? 'Compartilhada' : nameOf(state.people, t.personId, '—')}`}
                </p>
              </div>
              <span className={`font-semibold ${TONE[t.type]}`}>{fmt(t.amount)}</span>
              <button className="muted hover:text-[#70B7FF]" onClick={() => open(t)} aria-label="Editar"><Pencil size={16} /></button>
              <button className="muted hover:text-red-400" onClick={() => del(t)} aria-label="Excluir"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tf && (
        <Modal title={tf.id ? 'Editar transferência' : 'Nova transferência'} onClose={() => setTf(null)}>
          <form onSubmit={saveTransfer} className="space-y-3" noValidate>
            <Field label="Transferir entre">
              <select className="input" value={tf.kind} onChange={(e) => setTf({ ...tf, kind: e.target.value, fromId: '', toId: '' })}>
                <option value="category">Categorias (orçamento do mês)</option>
                <option value="goal">Metas / reservas</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origem">
                <select className="input" value={tf.fromId} onChange={(e) => setTf({ ...tf, fromId: e.target.value })}>
                  <option value="">Escolha</option>
                  {opts(tf.kind).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Destino" error={errors.to}>
                <select className="input" value={tf.toId} onChange={(e) => setTf({ ...tf, toId: e.target.value })}>
                  <option value="">Escolha</option>
                  {opts(tf.kind).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Valor (R$)" error={errors.amount}><input className="input" inputMode="decimal" placeholder="0,00" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} /></Field>
              <Field label="Data" error={errors.date}><input type="date" className="input" value={tf.date} onChange={(e) => setTf({ ...tf, date: e.target.value })} /></Field>
            </div>
            <Field label="Observação (opcional)"><input className="input" value={tf.note} onChange={(e) => setTf({ ...tf, note: e.target.value })} /></Field>
            <p className="muted text-xs">Transferências não são receita nem despesa: só movem orçamento do mês ou valor acumulado entre metas.</p>
            <button className="btn w-full" type="submit">Salvar transferência</button>
          </form>
        </Modal>
      )}
      {form && (
        <Modal title={form.id ? 'Editar movimentação' : 'Nova movimentação'} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Descrição" error={errors.description}>
              <input className="input" value={form.description} onChange={set('description')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)" error={errors.amount}>
                <input className="input" inputMode="decimal" placeholder="0,00" value={form.amount} onChange={set('amount')} />
              </Field>
              <Field label="Data" error={errors.date}>
                <input type="date" className="input" value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Tipo">
                <select className="input" value={form.type} onChange={set('type')}>
                  {Object.entries(TYPES).filter(([k]) => k !== 'transfer').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Categoria">
                <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                  {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Responsável">
                <select className="input" value={form.personId} onChange={set('personId')}>
                  {state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={form.shared} onChange={set('shared')} /> Compartilhada
              </label>
            </div>
            {form.type === 'expense' && form.shared && (
              <div className="space-y-2">
                <Field label="Divisão da despesa" error={errors.split}>
                  <select className="input" value={form.splitMode} onChange={set('splitMode')}>
                    <option value="equal">Igualitária</option>
                    <option value="proportional">Proporcional à renda</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </Field>
                {form.splitMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    {state.people.map((p) => (
                      <Field key={p.id} label={`Parte de ${p.name} (R$)`}>
                        <input className="input" inputMode="decimal" value={form.splitCustom[p.id] || ''} onChange={(e) => setForm({ ...form, splitCustom: { ...form.splitCustom, [p.id]: e.target.value } })} />
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!form.id && (form.type === 'expense' || form.type === 'income') && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Repetição">
                  <select className="input" value={form.repeat} onChange={set('repeat')}>
                    <option value="none">Não repete</option>
                    <option value="recurring">Recorrente (mensal)</option>
                    <option value="installments">Parcelada</option>
                  </select>
                </Field>
                {form.repeat !== 'none' && <Field label={form.repeat === 'installments' ? 'Nº de parcelas' : 'Nº de meses'}><input className="input" inputMode="numeric" value={form.count} onChange={set('count')} /></Field>}
                {form.repeat === 'installments' && <p className="muted col-span-2 text-xs">O valor informado é o total; ele é dividido entre as parcelas.</p>}
                {form.repeat !== 'none' && <p className="muted col-span-2 text-xs">Ocorrências futuras ficam agendadas e só entram nos resultados na data.</p>}
              </div>
            )}
            {form.type === 'invest' && state.investments.length > 0 && (
              <Field label="Aporte no investimento (opcional)">
                <select className="input" value={form.investmentId || ''} onChange={set('investmentId')}>
                  <option value="">Nenhum</option>
                  {state.investments.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Observação (opcional)">
              <input className="input" value={form.note} onChange={set('note')} />
            </Field>
            <button className="btn w-full" type="submit">Salvar movimentação</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
