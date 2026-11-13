import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Download, Upload, Trash2, Plus, Save } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { Field } from '../components/ui.jsx';
import { toCents, fromCents, fmt } from '../utils/money.js';
import { validate, emptyState, download, toCSV } from '../services/storage.js';

const draft = (s) => ({
  people: s.people.map((p) => ({ ...p, salary: fromCents(p.salary), extra: fromCents(p.extra), toExpenses: fromCents(p.toExpenses || 0), toInvest: fromCents(p.toInvest || 0), toReserve: fromCents(p.toReserve || 0) })),
  cats: s.categories.map((c) => ({ ...c, limit: fromCents(c.limit) })),
});

export default function SettingsPage() {
  const { state, dispatch, uid } = useStore();
  const [d, setD] = useState(() => draft(state));
  const [msg, setMsg] = useState('');
  const file = useRef();
  const edit = (key, i, k) => (e) => setD({ ...d, [key]: d[key].map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) });
  const stamp = format(new Date(), 'yyyy-MM-dd');

  const saveAll = () => {
    dispatch({
      type: 'patch',
      patch: {
        people: d.people.map((p) => ({ ...p, name: p.name.trim() || 'Pessoa', salary: toCents(p.salary), extra: toCents(p.extra), toExpenses: toCents(p.toExpenses), toInvest: toCents(p.toInvest), toReserve: toCents(p.toReserve) })),
        categories: d.cats.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim(), limit: toCents(c.limit) })),
      },
    });
    setMsg('Configurações salvas.');
  };

  const onImport = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = validate(JSON.parse(await f.text()));
      if (!data) throw new Error('inválido');
      if (!window.confirm('Importar este backup substitui os dados atuais. Continuar?')) return;
      dispatch({ type: 'replace', state: data });
      setD(draft(data));
      setMsg('Backup importado.');
    } catch {
      setMsg('Arquivo inválido. Escolha um backup JSON exportado por este aplicativo.');
    }
  };

  const clear = () => {
    if (window.prompt('Isso apaga TODOS os dados deste navegador. Digite APAGAR para confirmar.') !== 'APAGAR') return;
    const s = emptyState();
    dispatch({ type: 'replace', state: s });
    setD(draft(s));
    setMsg('Todos os dados foram apagados.');
  };

  const total = d.people.reduce((s, p) => s + toCents(p.salary) + toCents(p.extra), 0);

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <h3 className="font-semibold">Pessoas e renda mensal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {d.people.map((p, i) => (
            <div key={p.id} className="space-y-3">
              <Field label={`Nome da pessoa ${i + 1}`}><input className="input" value={p.name} onChange={edit('people', i, 'name')} /></Field>
              <Field label="Salário mensal (R$)"><input className="input" inputMode="decimal" value={p.salary} onChange={edit('people', i, 'salary')} /></Field>
              <Field label="Renda extra (R$)"><input className="input" inputMode="decimal" value={p.extra} onChange={edit('people', i, 'extra')} /></Field>
              <Field label="Destinar a despesas (R$)"><input className="input" inputMode="decimal" value={p.toExpenses} onChange={edit('people', i, 'toExpenses')} /></Field>
              <Field label="Destinar a investimentos (R$)"><input className="input" inputMode="decimal" value={p.toInvest} onChange={edit('people', i, 'toInvest')} /></Field>
              <Field label="Destinar à reserva (R$)"><input className="input" inputMode="decimal" value={p.toReserve} onChange={edit('people', i, 'toReserve')} /></Field>
            </div>
          ))}
        </div>
        <p className="muted text-sm">Renda total do casal: <b className="text-[#70B7FF]">{fmt(total)}</b></p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold">Categorias e limite mensal (0 = sem limite)</h3>
        {d.cats.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <input className="input" placeholder="Nome" value={c.name} onChange={edit('cats', i, 'name')} />
            <input className="input w-32" inputMode="decimal" value={c.limit} onChange={edit('cats', i, 'limit')} aria-label="Limite" />
            <button className="muted hover:text-red-400" aria-label="Remover categoria" onClick={() => setD({ ...d, cats: d.cats.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="btn-ghost btn" onClick={() => setD({ ...d, cats: [...d.cats, { id: uid(), name: '', limit: '0,00' }] })}><Plus size={16} /> Nova categoria</button>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={saveAll}><Save size={16} /> Salvar configurações</button>
        {msg && <span className="muted text-sm" role="status">{msg}</span>}
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold">Seus dados</h3>
        <p className="muted text-sm">Os dados ficam apenas neste navegador. Faça backup com frequência.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn" onClick={() => download(`backup-financas-${stamp}.json`, JSON.stringify(state, null, 2), 'application/json')}><Download size={16} /> Exportar backup (JSON)</button>
          <button className="btn-ghost btn" onClick={() => download(`movimentacoes-${stamp}.csv`, toCSV(state), 'text/csv;charset=utf-8')}><Download size={16} /> Exportar movimentações (CSV)</button>
          <button className="btn-ghost btn" onClick={() => file.current.click()}><Upload size={16} /> Importar backup</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
          <button className="btn bg-red-500" onClick={clear}><Trash2 size={16} /> Apagar tudo</button>
        </div>
      </div>
    </div>
  );
}
