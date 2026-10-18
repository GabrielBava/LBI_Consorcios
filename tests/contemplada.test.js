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
  near(R.custo, 1873384.8, 'custo da operação = saldo devedor + ágio');
  near(R.custoPct, 1873384.8 / 1200000 * 100 - 100, 'custo % = custo ÷ crédito − 100%', 0.0001);
  near(R.custoEfetivo, 673384.8);
  near(R.custoEfetivoPct, 88.2318, '', 0.001);
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
  near(R.custo, 800000 + 250000);
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

test('consórcio × financiamento: entrada 20%, renda pela regra dos 30% e idade máxima', () => {
  const s = base();
  s.indiceTaxa = 5;
  s.financiamento.ativo = true;
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.ok(F.ok);
  assert.ok(F.creditoAuto);
  near(F.credito, 1200000);
  near(F.entrada, 240000);
  near(F.financiado, 960000);
  near(F.rendaMinima, F.primeira / 0.3, 'a 1ª parcela compromete no máximo 30% da renda');
  near(F.primeira, F.primeiraPrestacao + F.meses[0].mip + F.meses[0].dfi + F.meses[0].seguros + F.meses[0].ta);
  assert.deepEqual(F.idadeMaxima, { anos: 30, meses: 0, dias: 0 });
  assert.equal(F.nascimentoMinimo.getFullYear(), 1996);
  assert.equal(F.cliente, undefined, 'sem análise pela data de nascimento');
  near(F.diferenca, F.totalPago - F.consorcio.totalPago);
  near(F.consorcio.totalPago, 436800 + CC.fluxoMensal(s, true).total, 'consórcio com reajuste pelo indexador');
  s.financiamento.prazo = 360;
  s.financiamento.credito = 900000;
  const F3 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.equal(F3.creditoAuto, false);
  assert.deepEqual(F3.idadeMaxima, { anos: 35, meses: 0, dias: 0 });
});

test('financiamento sem TR e sem encargos reproduz Price e SAC', () => {
  for (const sis of ['price', 'sac']) {
    const C = CC.cronogramaFinanciamento(800000, 12, 420, sis, {});
    const T = CC.tabelaFinanciamento(800000, 12, 420, sis);
    near(C.meses[0].total, T.primeira);
    near(C.meses[419].total, T.ultima);
    near(C.tot.total, T.total);
    near(C.meses[419].saldo, 0);
  }
});

test('TR corrige o saldo e a parcela; seguro de vida, proteção do imóvel, seguros e taxa somam nos custos', () => {
  const C = CC.cronogramaFinanciamento(800000, 12, 360, 'price', { trAa: 2, mipPct: 0.03, dfiPct: 0.008, valorBem: 1000000, seguros: 10, ta: 25 });
  const tr = Math.pow(1.02, 1 / 12) - 1;
  near(C.meses[0].correcao, 800000 * tr);
  near(C.meses[0].mip, 800000 * (1 + tr) * 0.0003, 'seguro de vida sobre o saldo devedor');
  near(C.meses[0].dfi, 1000000 * (1 + tr) * 0.00008, 'proteção do imóvel sobre o valor do imóvel atualizado pela TR');
  near(C.meses[119].dfi, 1000000 * Math.pow(1 + tr, 120) * 0.00008);
  near(C.meses[0].seguro, C.meses[0].mip + C.meses[0].dfi, 'Seguro/FGHab = vida + imóvel');
  assert.ok(C.meses[120].prestacao > C.meses[0].prestacao, 'Price com TR: prestação cresce');
  near(C.meses[359].saldo, 0);
  near(C.tot.ta, 25 * 360);
  near(C.tot.seguros, 10 * 360);
  near(C.tot.total, C.tot.prestacoes + C.tot.mip + C.tot.dfi + C.tot.seguros + C.tot.ta);
});

test('CESH: quanto os seguros somam à taxa anual (TIR com prêmios − TIR só com prestações)', () => {
  const sem = CC.cronogramaFinanciamento(800000, 12, 360, 'price', {});
  near(sem.cesh, 0, 'sem seguros, CESH zero', 1e-6);
  near(CC.tirMensal(800000, sem.meses.map((l) => l.prestacao)), Math.pow(1.12, 1 / 12) - 1, 'TIR das prestações = juros', 1e-9);
  // Seguro constante de 0,05% a.m. sobre o saldo, sem TR: TIR com prêmio ≈ i + 0,0005 ao mês
  const C = CC.cronogramaFinanciamento(800000, 12, 360, 'price', { mipPct: 0.05 });
  const i = Math.pow(1.12, 1 / 12) - 1;
  near(C.cesh, (Math.pow(1 + i + 0.0005, 12) - 1.12) * 100, 'CESH coerente com o prêmio sobre o saldo', 0.01);
  assert.ok(C.cesh > 0.6 && C.cesh < 0.75);
});

test('custos invisíveis: total e percentual sobre o crédito', () => {
  const s = base();
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true, tr: 0, mip: 0.03, dfi: 0.008, seguros: 15, ta: 25 });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  near(F.custos.ta, 25 * 420);
  near(F.custos.seguros, 15 * 420);
  near(F.custos.dfi, 1200000 * 0.00008 * 420, 'sem TR, o valor do imóvel não muda');
  near(F.custos.total, F.custos.mip + F.custos.dfi + F.custos.seguros + F.custos.ta);
  near(F.custosPct, F.custos.total / 1200000 * 100);
});

test('comparativo a cada 12 meses: economia de parcela, acumulados e saldos', () => {
  const s = base([{ credito: 100000, entrada: 20000, parcela: 1000, prazo: 30 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 0 });
  Object.assign(s.financiamento, { ativo: true, prazo: 36, tr: 0, mip: 0, dfi: 0, seguros: 0, ta: 0 });
  s.rendimentos.params = Object.assign({}, CC.PARAMS_RENDIMENTOS, { cdi: 12, cdbPct: 100, cdbTipo: 'cdi' });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  const K = F.comparativo;
  assert.ok(K.ok);
  assert.deepEqual(K.linhas.map((l) => l.t), [12, 24, 36]);
  const pf = F.meses[0].total;
  near(K.linhas[0].consorcio, 1000);
  near(K.linhas[0].financiamento, pf);
  near(K.linhas[0].economia, pf - 1000);
  near(K.linhas[0].organico, 12 * (pf - 1000));
  near(K.linhas[0].aplicado, (pf - 1000) * (Math.pow(1.12, 1) - 1) / (Math.pow(1.12, 1 / 12) - 1));
  near(K.linhas[2].consorcio, 0, 'consórcio já encerrado');
  near(K.linhas[2].saldoCons, 0);
  near(K.linhas[2].saldoFin, 0);
  near(K.linhas[0].saldoCons, 1000 * 18);
  near(K.organico, 36 * pf - 30 * 1000);
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
  Object.assign(s.financiamento, { ativo: true, prazo: 352 });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 31) }).financiamento;
  assert.equal(F.dataFim.getMonth(), 1);
  assert.equal(F.dataFim.getDate(), 29);
  assert.equal(F.nascimentoMinimo.getDate(), 1, 'nascidos a partir de 01/03/1991');
  assert.equal(F.nascimentoMinimo.getMonth(), 2);
});

test('financiamento: premissas negativas ficam pendentes (não entram no cálculo)', () => {
  const s = base();
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true, mip: -0.03, tr: -2 });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.equal(F.ok, false);
  assert.ok(F.pend.some((p) => /seguro de vida não pode ser negativo/.test(p)));
  assert.ok(F.pend.some((p) => /TR não pode ser negativo/.test(p)));
});

test('comparativo a cada 12 meses só com o mesmo crédito da carta', () => {
  const s = base();
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true, credito: 2500000 });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.ok(F.ok);
  assert.equal(F.comparativo.ok, false);
  assert.match(F.comparativo.pend[0], /mesmo crédito da carta/);
  s.financiamento.credito = null;
  assert.ok(CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.comparativo.ok);
});

test('cartões lado a lado: 1ª e última parcela reajustadas, custo anual de cada caminho', () => {
  const s = base();
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  const Fc = CC.fluxoMensal(s, true);
  const K = F.consorcio;
  near(K.creditoLiquido, 1200000 - 436800);
  near(K.primeira, 6165.6, 'antes do 1º reajuste (mês 13)');
  near(K.ultima, Fc.meses[232].total);
  assert.ok(K.ultima > K.primeira);
  near(K.custoAa, K.cetAno + 5, 'CET + indexador');
  near(F.custoAa, 11.5 + 2 + F.cesh, 'juros + TR + CESH');
  assert.ok(F.cesh > 0);
  near(F.primeiraSeguro, F.meses[0].mip + F.meses[0].dfi);
  near(F.primeira, F.primeiraPrestacao + F.primeiraSeguro + F.primeiraOutros);
});

test('pontos de equilíbrio: parcelas que se igualam e economia aplicada que cobre o saldo do consórcio', () => {
  // Consórcio começa abaixo e sobe 10% ao ano; financiamento fixo (sem TR nem encargos)
  const s = base([{ credito: 300000, entrada: 0, parcela: 2000, prazo: 200 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 10, reajusteMes: 13 });
  Object.assign(s.financiamento, { ativo: true, prazo: 200, entradaPct: 0, juros: 6, tr: 0, mip: 0, dfi: 0, seguros: 0, ta: 0 });
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  const K = F.comparativo;
  assert.equal(K.meses.length, 200);
  const E = K.equilibrioParcela;
  assert.equal(E.inicio, 'consorcio', 'o consórcio começa com a parcela menor');
  assert.ok(E.t > 1);
  assert.ok(K.meses[E.t - 1].consorcio >= K.meses[E.t - 1].financiamento - 0.005);
  assert.ok(K.meses[E.t - 2].consorcio < K.meses[E.t - 2].financiamento);
  // Economia aplicada × saldo do consórcio: aqui a economia nunca alcança o saldo antes do fim
  assert.equal(K.equilibrioInvestido.t, null);
  assert.ok(K.meses.slice(0, 199).every((l) => l.aplicado < l.saldoCons));
  // Parcelas que nunca se igualam
  s.indiceTaxa = 0;
  const K2 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.comparativo;
  assert.equal(K2.equilibrioParcela.t, null);
  assert.equal(K2.equilibrioParcela.inicio, 'consorcio');
});

test('economia aplicada cobre o saldo do consórcio antes do fim', () => {
  const s = base([{ credito: 300000, entrada: 0, parcela: 500, prazo: 120 }]);
  Object.assign(s, { indice: 'outro', indiceTaxa: 0 });
  Object.assign(s.financiamento, { ativo: true, prazo: 120, entradaPct: 0, juros: 12, tr: 0, mip: 0, dfi: 0, seguros: 0, ta: 0 });
  const K = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.comparativo;
  const I = K.equilibrioInvestido;
  assert.ok(I.t > 1 && I.t < 120);
  assert.ok(I.aplicado >= I.saldoCons);
  assert.ok(K.meses[I.t - 2].aplicado < K.meses[I.t - 2].saldoCons);
});

test('junção: o fim de uma carta derruba a parcela, mas não é ponto de equilíbrio', () => {
  const s = base([{ credito: 600000, entrada: 100000, parcela: 8000, prazo: 60 }, { credito: 600000, entrada: 100000, parcela: 3000, prazo: 200 }]);
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true });
  const K = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.comparativo;
  const E = K.equilibrioParcela;
  assert.equal(E.salto.t, 61, 'a carta #1 termina no mês 60');
  assert.ok(E.salto.consorcio < E.salto.financiamento);
  assert.equal(E.inicio, 'consorcio', 'depois da queda, o consórcio fica com a parcela menor');
  assert.equal(E.t, null, 'a queda não é equilíbrio e as parcelas não se cruzam depois');
  // Com reajuste forte, a parcela da carta restante volta a alcançar a do financiamento: esse é o equilíbrio
  s.indiceTaxa = 20;
  const E2 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.comparativo.equilibrioParcela;
  assert.equal(E2.salto.t, 61);
  assert.ok(E2.t > 61);
  assert.equal(E2.inicio, 'consorcio');
});

test('CET + indexador: sem reajuste dentro do prazo, o indexador não entra', () => {
  const s = base([{ credito: 300000, entrada: 50000, parcela: 30000, prazo: 10 }]);
  s.indiceTaxa = 5;
  Object.assign(s.financiamento, { ativo: true });
  const K = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.consorcio;
  assert.equal(K.semReajuste, true);
  near(K.custoAa, K.cetAno);
  near(K.primeira, K.ultima);
  s.cartas[0].prazo = 24;
  const K2 = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.consorcio;
  assert.equal(K2.semReajuste, false);
  near(K2.custoAa, K2.cetAno + 5);
});

test('gráficos sem o comparativo: o financiamento é calculado e validado só para eles', () => {
  const s = base();
  s.indiceTaxa = 5;
  s.graficos.ativo = true;
  assert.equal(s.financiamento.ativo, false);
  const rc = CC.simular(s, { hoje: new Date(2026, 9, 10) });
  assert.ok(rc.financiamento.ok);
  assert.ok(rc.financiamento.comparativo.ok);
  s.financiamento.juros = null;
  assert.ok(CC.validar(s).some((v) => v.campo === 'financiamento.juros' && v.nivel === 'erro'));
  s.graficos.ativo = false;
  assert.equal(CC.simular(s).financiamento, null);
  assert.ok(!CC.validar(s).some((v) => /^financiamento\./.test(v.campo)));
});

test('financiamento com crédito automático e carta incompleta pede as cartas, não o crédito', () => {
  const s = base([{ credito: 1200000, entrada: 0, parcela: null, prazo: 100 }]);
  s.indiceTaxa = 5;
  s.financiamento.ativo = true;
  const F = CC.simular(s).financiamento;
  assert.equal(F.ok, false);
  assert.match(F.pend[0], /todas as cartas/);
  s.financiamento.credito = 0;
  assert.match(CC.simular(s).financiamento.pend[0], /crédito necessário/);
});

test('financiamento de veículo (CDC): Price com IOF e tarifas financiados, CET pela TIR', () => {
  assert.equal(CC.tipoFinanciamento({ segmento: 'imovel' }), 'imovel');
  assert.equal(CC.tipoFinanciamento({ segmento: 'veiculo' }), 'veiculo');
  assert.equal(CC.tipoFinanciamento({ segmento: 'servico' }), 'veiculo');
  // IOF: 0,38% + 0,0082% ao dia sobre cada amortização (até 365 dias), sobre o total financiado
  const C = CC.cronogramaVeiculo(81050, 1.93, 48);
  const i = 0.0193;
  const pmt1 = i / (1 - Math.pow(1 + i, -48));
  let saldo = 1, fator = 0.0038;
  for (let t = 1; t <= 48; t++) { const a = pmt1 - saldo * i; fator += a * 0.000082 * Math.min(30 * t, 365); saldo -= a; }
  near(C.iof, C.total * fator, 'IOF financiado');
  near(C.total, 81050 + C.iof);
  near(C.pmt, C.total * pmt1);
  near(C.meses[47].saldo, 0);

  const s = base([{ credito: 100000, entrada: 15000, parcela: 2100, prazo: 50 }]);
  Object.assign(s, { segmento: 'veiculo', indice: 'ipca', indiceTaxa: 4.5 });
  s.financiamento.ativo = true;
  const F = CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento;
  assert.ok(F.ok);
  assert.equal(F.tipo, 'veiculo');
  near(F.entrada, 20000);
  near(F.financiado, 80000);
  near(F.tarifas, 1050);
  near(F.primeira, F.ultima, 'parcelas fixas');
  near(F.juros, (Math.pow(1.0193, 12) - 1) * 100);
  assert.ok(F.cet > F.juros, 'o CET inclui IOF e tarifas');
  near(F.custoAa, F.juros + F.extraAa);
  near(F.rendaMinima, F.primeira / 0.3);
  near(F.totalPago, 20000 + 48 * F.primeira);
  assert.equal(F.idadeMaxima, undefined, 'sem regra de idade no veículo');
  near(F.custos.total, F.custos.iofContrato + F.custos.tarifaCadastroContrato + F.custos.registroContrato);
  assert.ok(F.comparativo.ok);
  near(F.diferenca, F.totalPago - F.consorcio.totalPago);
  // Validação dos campos do veículo
  s.financiamento.veiculo.prazo = 100;
  assert.ok(CC.validar(s).some((v) => v.campo === 'financiamento.veiculo.prazo' && v.nivel === 'erro'));
  assert.equal(CC.simular(s).financiamento.ok, false);
  // Imóvel continua no modelo habitacional
  s.segmento = 'imovel';
  assert.equal(CC.simular(s, { hoje: new Date(2026, 9, 10) }).financiamento.tipo, 'imovel');
});
