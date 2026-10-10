'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CC = require('../js/calc-contemplada.js');

const near = (a, b, msg, tol) => assert.ok(Math.abs(a - b) < (tol || 0.01), (msg || '') + ` esperado ${b}, obtido ${a}`);

function base(cartas) {
  const s = CC.estadoPadrao();
  s.cartas = cartas || [{ credito: 1200000, entrada: 436800, parcela: 6165.6, prazo: 233 }];
  return s;
}

test('padrões: fluxo sem reajuste e guias opcionais desabilitadas', () => {
  const s = CC.estadoPadrao();
  assert.equal(s.fluxo.reajuste, false);
  assert.equal(s.amortizacao.ativo, false);
  assert.equal(s.evolucao.ativo, false);
  assert.equal(s.rendimentos.ativo, false);
  assert.equal(s.financiamento.ativo, false);
  assert.equal(s.financiamento.prazo, 420);
  assert.equal(s.financiamento.entradaPct, 20);
  assert.equal(s.reajusteMes, 13);
});

test('resumo reproduz o exemplo do simulador de cartas contempladas', () => {
  const R = CC.resumo(base());
  assert.ok(R.ok);
  near(R.credito, 1200000);
  near(R.creditoLiquido, 763200);
  near(R.saldoDevedor, 1436584.8);
  near(R.custo, 673384.8);
  near(R.custoPct, 88.2318, '', 0.001);
  near(R.cetMes, 0.37868, '', 0.0001);
  near(R.cetAno, 4.5442, '', 0.001);
  near(R.entradaPct, 36.4);
  near(R.transferencia, 12000);
  near(R.parcelaAtual, 6165.6);
  assert.equal(R.prazoMax, 233);
});

test('junção: prazo ponderado pelo saldo de cada carta', () => {
  const R = CC.resumo(base([
    { credito: 500000, entrada: 150000, parcela: 3000, prazo: 200 },
    { credito: 300000, entrada: 100000, parcela: 2000, prazo: 100 }
  ]));
  near(R.saldoDevedor, 800000);
  near(R.prazoPonderado, (200 * 600000 + 100 * 200000) / 800000);
  near(R.custo, 250000 + 800000 - 800000);
  near(R.parcelaAtual, 5000);
  assert.equal(R.prazoMax, 200);
});

test('carta incompleta não calcula e é sinalizada', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: null, prazo: 100 }]);
  assert.equal(CC.resumo(s).ok, false);
  assert.ok(CC.validar(s).some((v) => v.campo === 'cartas.0.parcela' && v.nivel === 'erro'));
});

test('fluxo sem reajuste agrupa faixas de valor constante', () => {
  const s = base([
    { credito: 1000000, entrada: 300000, parcela: 6165.6, prazo: 233 },
    { credito: 200000, entrada: 50000, parcela: 2834.4, prazo: 120 }
  ]);
  const F = CC.fluxo(s);
  assert.equal(F.comReajuste, false);
  assert.equal(F.grupos.length, 2);
  assert.deepEqual([F.grupos[0].de, F.grupos[0].ate, F.grupos[0].qtd], [1, 120, 120]);
  near(F.grupos[0].valor, 9000);
  assert.deepEqual([F.grupos[1].de, F.grupos[1].ate], [121, 233]);
  near(F.grupos[1].valor, 6165.6);
});

test('fluxo com reajuste: parcela sobe a cada 12 meses a partir do 1º reajuste', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 30 }]);
  s.indice = 'pre5';
  s.fluxo.reajuste = true;
  const F = CC.fluxo(s);
  assert.deepEqual(F.grupos.map((g) => [g.de, g.ate]), [[1, 12], [13, 24], [25, 30]]);
  near(F.grupos[1].valor, 1050);
  near(F.grupos[2].valor, 1102.5);
  s.reajusteMes = 5;
  assert.deepEqual(CC.fluxo(s).grupos.map((g) => [g.de, g.ate]), [[1, 4], [5, 16], [17, 28], [29, 30]]);
});

test('reajuste com índice estimado exige a taxa', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 30 }]);
  s.indice = 'incc';
  s.fluxo.reajuste = true;
  assert.equal(CC.fluxo(s).ok, false);
  assert.ok(CC.validar(s).some((v) => v.campo === 'indiceTaxa' && v.nivel === 'erro'));
  s.indiceTaxa = 4;
  near(CC.fluxo(s).grupos[1].valor, 1040);
  // Sem reajuste no fluxo e sem guias que o usem, a taxa não é obrigatória
  s.indiceTaxa = null;
  s.fluxo.reajuste = false;
  assert.ok(!CC.validar(s).some((v) => v.campo === 'indiceTaxa'));
});

test('evolução anual: parcela reajustada, aporte acumulado e saldo devedor', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 30 }]);
  s.indice = 'pre5';
  s.evolucao.ativo = true;
  const E = CC.evolucao(s);
  assert.deepEqual(E.linhas.map((l) => l.t), [12, 24, 30]);
  near(E.linhas[0].parcela, 1000); near(E.linhas[0].pago, 12000); near(E.linhas[0].saldo, 18000);
  near(E.linhas[1].parcela, 1050); near(E.linhas[1].pago, 24600); near(E.linhas[1].saldo, 6300);
  near(E.linhas[2].parcela, 1102.5); near(E.linhas[2].pago, 31215); near(E.linhas[2].saldo, 0);
});

test('amortização sem reajuste: abate o saldo e reduz a parcela, sem economia', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 100 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 0 });
  Object.assign(s.amortizacao, { ativo: true, valor: 10000, mes: 20 });
  const A = CC.amortizacao(s);
  assert.ok(A.ok);
  near(A.saldoAntes, 80000);
  near(A.saldoDepois, 70000);
  near(A.parcelaAntes, 1000);
  near(A.parcelaDepois, 875);
  near(A.economia, 0);
  const l20 = A.linhas.find((l) => l.t === 20);
  assert.ok(l20.aporte);
  near(l20.parcela, 1000, 'parcela do mês do aporte não muda');
  near(l20.saldo, 70000);
  const l24 = A.linhas.find((l) => l.t === 24);
  near(l24.parcela, 875);
  near(l24.saldo, 875 * 76);
});

test('amortização com reajuste: evita reajustes futuros sobre o valor amortizado', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 100 }]);
  s.indice = 'pre5';
  Object.assign(s.amortizacao, { ativo: true, valor: 10000, mes: 20 });
  const A = CC.amortizacao(s);
  near(A.saldoAntes, 1050 * 80);
  near(A.parcelaDepois, 1050 * (1 - 10000 / 84000));
  assert.ok(A.economia > 0);
  near(A.totalSem - A.totalCom, A.economia);
});

test('amortização maior que o saldo é limitada e quita a junção', () => {
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 30 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 0 });
  Object.assign(s.amortizacao, { ativo: true, valor: 50000, mes: 10 });
  const A = CC.amortizacao(s);
  assert.ok(A.limitado);
  near(A.aporte, 20000);
  near(A.parcelaDepois, 0);
});

test('rendimentos seguem o mecanismo da calculadora de renda fixa', () => {
  const p = { cdi: 12, selic: 12, poupanca: 0.5, lciPct: 85, custodia: 0.2, tesouroPre: 8 };
  const r = CC.calcularRendimentos({ inicial: 10000, mensal: 0, meses: 12 }, p);
  const por = Object.fromEntries(r.produtos.map((x) => [x.id, x]));
  near(por.cdb.bruto, 11200);
  near(por.cdb.ir, 210);
  near(por.cdb.liquido, 10990);
  near(por.lci.liquido, 11020);
  near(por.poupanca.liquido, 10000 * Math.pow(1.005, 12));
  near(por.tesouroSelic.custos, 22.4);
  near(por.tesouroSelic.liquido, 10967.6);
  near(por.cdb.rentLiquida, 9.9);
  near(por.cdb.ganho, 990);
  assert.equal(r.aliquotaIR, 17.5);
  assert.equal(r.produtos[0].id, 'lci', 'ordenado pelo valor líquido');
});

test('aportes mensais: valor futuro de série uniforme', () => {
  const r = CC.calcularRendimentos({ inicial: 0, mensal: 100, meses: 24 }, { poupanca: 0.5 });
  const pp = r.produtos.find((x) => x.id === 'poupanca');
  near(pp.bruto, 100 * (Math.pow(1.005, 24) - 1) / 0.005);
  assert.equal(r.investido, 2400);
});

test('aporte da amortização entra na aplicação só no mês do aporte', () => {
  const p = { cdi: 12 };
  const sem = CC.calcularRendimentos({ inicial: 10000, mensal: 0, meses: 12 }, p);
  const com = CC.calcularRendimentos({ inicial: 10000, mensal: 0, meses: 12, extra: { valor: 1000, mes: 6 } }, p);
  const cdb = (r) => r.produtos.find((x) => x.id === 'cdb');
  near(cdb(com).extra.bruto, 1000 * Math.pow(1.12, 0.5));
  near(cdb(com).extra.ir, (1000 * Math.pow(1.12, 0.5) - 1000) * 0.225, 'IR pelo prazo do próprio aporte (6 meses)');
  near(cdb(com).bruto - cdb(sem).bruto, 1000 * Math.pow(1.12, 0.5));
  assert.equal(com.investido, 11000);
});

test('guia de rendimentos: aplicação inicial = crédito − entrada e período = maior prazo', () => {
  const s = base([
    { credito: 500000, entrada: 150000, parcela: 3000, prazo: 200 },
    { credito: 300000, entrada: 100000, parcela: 2000, prazo: 100 }
  ]);
  s.rendimentos.ativo = true;
  const r = CC.simular(s).rendimentos;
  near(r.inicial, 550000);
  assert.equal(r.meses, 200);
  s.rendimentos.meses = 500;
  assert.equal(CC.simular(s).rendimentos.meses, 200, 'limitado ao maior prazo');
  s.rendimentos.meses = 60;
  assert.equal(CC.simular(s).rendimentos.meses, 60);
  // Com amortização: o aporte entra no mês informado
  Object.assign(s, { indice: 'pre5' });
  Object.assign(s.amortizacao, { ativo: true, valor: 20000, mes: 18 });
  const r2 = CC.simular(s).rendimentos;
  assert.deepEqual(r2.extra, { valor: 20000, mes: 18 });
  near(r2.investido, 570000);
});

test('financiamento Price e SAC', () => {
  const pv = 800000, n = 420;
  const P = CC.tabelaFinanciamento(pv, 12, n, 'price');
  near(P.primeira * (1 - Math.pow(1 + P.i, -n)) / P.i, pv, 'valor presente das parcelas = financiado');
  const S = CC.tabelaFinanciamento(pv, 12, n, 'sac');
  near(S.primeira, pv / n + pv * S.i);
  near(S.ultima, (pv / n) * (1 + S.i));
  near(S.total, pv + S.i * pv * (n + 1) / 2);
});

test('consórcio × financiamento: entrada 20%, renda 3× parcela e idade máxima', () => {
  const s = base();
  s.financiamento.ativo = true;
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.ok(F.ok);
  assert.ok(F.creditoAuto);
  near(F.credito, 1200000);
  near(F.entrada, 240000);
  near(F.financiado, 960000);
  near(F.rendaMinima, 3 * F.primeira);
  assert.deepEqual(F.idadeMaxima, { anos: 30, meses: 0, dias: 0 });
  assert.equal(F.nascimentoMinimo.getFullYear(), 1996);
  near(F.diferenca, F.totalPago - (436800 + 1436584.8));
  // Cliente mais velho que o permitido: apenas alerta, com o prazo compatível
  s.financiamento.nascimento = '1990-01-15';
  const F2 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.ok(F2.cliente.excede);
  assert.equal(F2.cliente.prazoMaximo, 339);
  s.financiamento.prazo = 360;
  s.financiamento.credito = 900000;
  const F3 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.equal(F3.creditoAuto, false);
  assert.deepEqual(F3.idadeMaxima, { anos: 35, meses: 0, dias: 0 });
});

test('diferença de datas em anos, meses e dias', () => {
  assert.deepEqual(CC.diferencaData(new Date(2000, 0, 31), new Date(2000, 2, 1)), { anos: 0, meses: 1, dias: 1 });
  assert.deepEqual(CC.diferencaData(new Date(1996, 9, 10), new Date(2026, 9, 10)), { anos: 30, meses: 0, dias: 0 });
  const d = CC.somarMeses(new Date(2025, 0, 31), 1);
  assert.equal(d.getMonth(), 1);
  assert.equal(d.getDate(), 28);
});

test('agrupar avança mesmo com valor não finito e prazo acima do teto invalida a carta', () => {
  const g = CC.agrupar([{ t: 1, total: Infinity }, { t: 2, total: Infinity }, { t: 3, total: 5 }]);
  assert.equal(g.length, 3);
  const s = base([{ credito: 100000, entrada: 0, parcela: 1000, prazo: 200000 }]);
  assert.equal(CC.resumo(s).ok, false);
  assert.ok(CC.validar(s).some((v) => v.campo === 'cartas.0.prazo' && v.nivel === 'erro'));
});

test('reajustes evitados sem reajuste é exatamente zero', () => {
  const s = base([{ credito: 1200000, entrada: 436800, parcela: 2303.24, prazo: 206 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 0 });
  Object.assign(s.amortizacao, { ativo: true, valor: 72983.9, mes: 125 });
  assert.equal(CC.amortizacao(s).economia, 0);
});

test('1º reajuste só é obrigatório quando algum reajuste está em uso', () => {
  const s = base();
  s.reajusteMes = null;
  assert.ok(!CC.validar(s).some((v) => v.campo === 'reajusteMes'));
  s.fluxo.reajuste = true;
  s.indiceTaxa = 5;
  assert.ok(CC.validar(s).some((v) => v.campo === 'reajusteMes' && v.nivel === 'erro'));
});

test('idade: limite pelo 65º aniversário, inclusive com fim do contrato em 29/02', () => {
  const s = base();
  Object.assign(s.financiamento, { ativo: true, prazo: 352, nascimento: '1991-02-28' });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 31) }).financiamento;
  assert.equal(F.dataFim.getMonth(), 1);
  assert.equal(F.dataFim.getDate(), 29);
  assert.equal(F.nascimentoMinimo.getDate(), 1, 'nascidos a partir de 01/03/1991');
  assert.equal(F.nascimentoMinimo.getMonth(), 2);
  assert.ok(F.cliente.excede, 'faz 65 anos um dia antes do fim');
  s.financiamento.nascimento = '1991-03-01';
  assert.ok(!CC.simular(s, { hoje: new Date(2026, 9, 31) }).financiamento.cliente.excede);
});
