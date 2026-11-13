import { useState } from 'react';
import { format } from 'date-fns';
import { LayoutDashboard, ArrowLeftRight, Settings, Sun, Moon, Wallet, TrendingUp, Target, History as HistoryIcon } from 'lucide-react';
import { useStore } from './context/Store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import SettingsPage from './pages/Settings.jsx';
import Budget from './pages/Budget.jsx';
import Investments from './pages/Investments.jsx';
import Plans from './pages/Plans.jsx';
import HistoryPage from './pages/History.jsx';

const NAV = [
  ['dash', 'Visão geral', LayoutDashboard, Dashboard],
  ['orc', 'Meu orçamento', Wallet, Budget],
  ['tx', 'Movimentações', ArrowLeftRight, Transactions],
  ['inv', 'Investimentos', TrendingUp, Investments],
  ['plan', 'Planos', Target, Plans],
  ['hist', 'Histórico', HistoryIcon, HistoryPage],
  ['cfg', 'Configurações', Settings, SettingsPage],
];

export default function App() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState('dash');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [, label, , Page] = NAV.find((n) => n[0] === page);
  const link = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? 'bg-[#3985CC] text-white' : 'muted hover:bg-white/5'}`;

  return (
    <div className="min-h-screen md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r border-white/5 p-4 md:flex" style={{ background: 'var(--card)' }}>
        <p className="mb-6 px-3 text-lg font-bold text-[#70B7FF]">Finanças do Casal</p>
        {NAV.map(([id, text, Icon]) => (
          <button key={id} className={link(page === id)} onClick={() => setPage(id)}><Icon size={18} />{text}</button>
        ))}
      </aside>
      <main className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{label}</h1>
          <div className="flex items-center gap-2">
            <input type="month" className="input w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            <button className="btn-ghost btn" aria-label="Alternar tema" onClick={() => dispatch({ type: 'patch', patch: { theme: state.theme === 'dark' ? 'light' : 'dark' } })}>
              {state.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <Page key={page} month={month} />
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around overflow-x-auto border-t border-white/5 p-2 md:hidden" style={{ background: 'var(--card)' }}>
        {NAV.map(([id, text, Icon]) => (
          <button key={id} className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] ${page === id ? 'text-[#70B7FF]' : 'muted'}`} onClick={() => setPage(id)}>
            <Icon size={20} />{text}
          </button>
        ))}
      </nav>
    </div>
  );
}
