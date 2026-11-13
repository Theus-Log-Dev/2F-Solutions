import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fmt } from '../src/utils/money.js';
import { summarize, byCategory } from '../src/utils/finance.js';
import { validate, emptyState } from '../src/services/storage.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const tx = (id, type, amount, date, categoryId = 'c1') => ({ id, type, amount, date, categoryId, description: id });

function sample() {
  const s = emptyState();
  s.people[0].salary = 500000; s.people[0].extra = 50000; s.people[1].salary = 300000;
  s.categories[0].limit = 50000;
  s.transactions = [
    tx('a', 'expense', 60000, '2026-05-10'),
    tx('b', 'invest', 50000, '2026-05-11'),
    tx('c', 'save', 20000, '2026-05-12'),
    tx('d', 'income', 10000, '2026-05-13'),
    tx('e', 'expense', 99999, '2026-04-30'),
  ];
  return s;
}

test('toCents converte formatos pt-BR e ponto decimal sem erro de precisão', () => {
  assert.equal(toCents('19,99'), 1999);
  assert.equal(toCents('1.234,56'), 123456);
  assert.equal(toCents('10.5'), 1050);
  assert.equal(toCents('0,30'), 30);
  assert.equal(toCents('abc'), 0);
});

test('fmt formata em Real brasileiro', () => {
  assert.match(fmt(123456).replace(/\s/g, ' '), /R\$ 1\.234,56/);
});

test('summarize considera só o mês pedido e separa despesa, investimento e reserva', () => {
  const r = summarize(sample(), '2026-05');
  assert.equal(r.reference, 850000);
  assert.equal(r.expense, 60000);
  assert.equal(r.invest, 50000);
  assert.equal(r.saved, 20000);
  assert.equal(r.balance, 850000 + 10000 - 130000);
  near(r.percentUsed, (130000 / 850000) * 100);
});

test('saldo pode ficar negativo', () => {
  const s = emptyState();
  s.people[0].salary = 10000;
  s.transactions = [tx('x', 'expense', 25000, '2026-05-01')];
  assert.equal(summarize(s, '2026-05').balance, -15000);
});

test('byCategory marca orçamento excedido e ignora tipos que não são despesa', () => {
  const c = byCategory(sample(), '2026-05')[0];
  assert.equal(c.used, 60000);
  assert.equal(c.remaining, -10000);
  assert.equal(c.over, true);
});

test('validate rejeita lixo e descarta movimentações inválidas', () => {
  assert.equal(validate(null), null);
  assert.equal(validate({ people: 1 }), null);
  const s = sample();
  s.transactions.push({ id: 'z', type: 'expense', amount: 10.5, date: '2026-05-01' });
  assert.equal(validate(s).transactions.length, 5);
});

import { personBudget, investmentStats, evolution } from '../src/utils/finance.js';

test('personBudget separa planejado e realizado por pessoa', () => {
  const s = sample();
  Object.assign(s.people[0], { toExpenses: 300000, toInvest: 100000, toReserve: 50000 });
  s.transactions = [{ ...tx('a', 'expense', 60000, '2026-05-10'), personId: 'p1' }, { ...tx('b', 'invest', 50000, '2026-05-11'), personId: 'p1' }];
  const [a, b] = personBudget(s, '2026-05');
  assert.equal(a.income, 550000);
  assert.equal(a.unallocated, 100000);
  assert.equal(a.actual.expense, 60000);
  assert.equal(a.actual.invest, 50000);
  assert.equal(b.actual.expense, 0);
});

test('investmentStats soma saldos informados e aportes vinculados sem dupla contagem', () => {
  const s = emptyState();
  s.investments = [
    { id: 'i1', name: 'CDB', kind: 'Renda fixa', ownerId: 'p1', initial: 100000, balance: 120000, history: [{ date: '2026-01-01', amount: 100000 }, { date: '2026-03-01', amount: 120000 }] },
    { id: 'i2', name: 'ETF', kind: 'Ações', ownerId: 'p2', initial: 0, balance: 50000, history: [{ date: '2026-02-01', amount: 40000 }] },
  ];
  s.transactions = [
    { id: 't1', type: 'invest', amount: 30000, date: '2026-02-05', investmentId: 'i1' },
    { id: 't2', type: 'invest', amount: 5000, date: '2026-02-06', investmentId: '' },
  ];
  const st = investmentStats(s);
  assert.equal(st.total, 170000);
  assert.equal(st.contributed, 30000);
  assert.equal(st.byKind['Ações'], 50000);
  assert.equal(st.byOwner.p1, 120000);
  assert.equal(summarize(s, '2026-02').invest, 35000);
  assert.equal(summarize(s, '2026-02').expense, 0);
  assert.deepEqual(evolution(s.investments).map((d) => d.total), [100000, 140000, 160000]);
});

test('validate preserva dados antigos (sem investimentos) e normaliza campos novos', () => {
  const old = { people: [{ id: 'p1', name: 'Ana', salary: 1000, extra: 0 }], categories: [], transactions: [] };
  const v = validate(old);
  assert.deepEqual(v.investments, []);
  assert.equal(v.people[0].toInvest, 0);
  assert.equal(v.people[0].name, 'Ana');
});
