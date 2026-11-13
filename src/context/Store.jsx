import { createContext, useContext, useEffect, useReducer } from 'react';
import { load, save } from '../services/storage.js';

const Ctx = createContext(null);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function reducer(s, a) {
  switch (a.type) {
    case 'replace': return a.state;
    case 'patch': return { ...s, ...a.patch };
    case 'tx:save': {
      const t = a.tx;
      if (!t.id) return { ...s, transactions: [...s.transactions, { ...t, id: uid() }] };
      return { ...s, transactions: s.transactions.map((x) => (x.id === t.id ? t : x)) };
    }
    case 'list:save': { // metas, desejos e itens de planejamento (só previsão, nunca movimentação real)
      const list = s[a.key] || [];
      const it = a.item;
      if (it.id && list.some((x) => x.id === it.id)) return { ...s, [a.key]: list.map((x) => (x.id === it.id ? it : x)) };
      return { ...s, [a.key]: [...list, { ...it, id: uid() }] };
    }
    case 'list:delete':
      return { ...s, [a.key]: s[a.key].filter((x) => x.id !== a.id), transactions: a.key === 'goals' ? s.transactions.map((t) => (t.goalId === a.id ? { ...t, goalId: '' } : t)) : s.transactions };
    case 'list:move': {
      const l = [...s[a.key]];
      const i = l.findIndex((x) => x.id === a.id);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= l.length) return s;
      [l[i], l[j]] = [l[j], l[i]];
      return { ...s, [a.key]: l };
    }
    case 'inv:save': {
      const v = a.inv;
      const list = s.investments || [];
      if (v.id && list.some((x) => x.id === v.id)) return { ...s, investments: list.map((x) => (x.id === v.id ? v : x)) };
      return { ...s, investments: [...list, { ...v, id: uid() }] };
    }
    case 'inv:delete': // desvincula os aportes, mantendo as movimentações reais
      return { ...s, investments: s.investments.filter((x) => x.id !== a.id), transactions: s.transactions.map((t) => (t.investmentId === a.id ? { ...t, investmentId: '' } : t)) };
    case 'tx:addMany': return { ...s, transactions: [...s.transactions, ...a.txs.map((t) => ({ ...t, id: uid() }))] };
    case 'tx:deleteMany': return { ...s, transactions: s.transactions.filter((x) => !a.ids.includes(x.id)) };
    case 'tx:delete': return { ...s, transactions: s.transactions.filter((x) => x.id !== a.id) };
    default: return s;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load);
  useEffect(() => {
    save(state); // salvamento automático a cada mudança
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch, uid }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
