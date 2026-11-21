'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../scripts/importar-planos.js');
const PP = require('../js/planilha-planos.js');
const Calc = require('../js/calc.js');

const PLANILHA = path.join(__dirname, '..', 'planos', 'Cadastro_de_Planos.xlsx');
const ADMS = { administradoras: Calc.ADMINISTRADORAS };
const cab = ['Administradora', 'Plano', 'Tipo', 'Prazo (meses)', 'Crédito mínimo (R$)', 'Crédito máximo (R$)', 'Taxa de administração (%)', 'Fundo de reserva (%)', 'Lance embutido (%)', 'Lance fixo (%)', 'Índice de reajuste'];
const linha = (vals, pct) => vals.map((v, i) => (v === undefined ? undefined : { v, pct: !!(pct && pct.includes(i)) }));

test('planilha de planos: lê o modelo e gera os planos do simulador', async () => {
  const r = await I.importar(PLANILHA);
  assert.deepEqual(r.erros, []);
  assert.equal(r.planos.length, 2);
  const [imovel, veiculo] = r.planos;
  assert.deepEqual(imovel, { id: 'PORTO-SEGURO-IMOVEL-240-MESES', administradora: 'Porto Seguro', nome: 'Imóvel 240 meses', exemplo: true, categoria: 'imovel', prazo: 240, creditoMinimo: 200000, creditoMaximo: 1000000, taxaAdm: 20, fundoReserva: 2, embutidoPct: 25, fixoPct: 50, indice: 'incc' });
  assert.equal(veiculo.categoria, 'veiculo');
  assert.equal(veiculo.indice, 'ipca');
  assert.equal(r.avisos.length, 2, 'linhas de exemplo geram aviso');
  assert.deepEqual(r.abas, ['Planos'], 'a aba Instruções é ignorada');
});

test('planos embutidos (js/planos.js): válidos e só das administradoras da lista', () => {
  const janela = {};
  new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', 'planos.js'), 'utf8'))(janela);
  const lista = janela.CONFIG_SIMULADOR.planos;
  assert.ok(Array.isArray(lista) && lista.length > 0);
  lista.forEach((p) => {
    const n = Calc.normalizarPlano(p);
    assert.ok(n, p.id);
    assert.ok(Calc.ADMINISTRADORAS.includes(n.administradora), n.administradora);
    assert.ok(['imovel', 'veiculo'].includes(n.categoria) && Calc.isNum(n.prazo) && Calc.isNum(n.creditoMinimo), p.id);
  });
});

test('planilha de planos: link do Drive e colunas da planilha da equipe (tipo de grupo, flags e fidelidade)', () => {
  assert.deepEqual(PP.enderecosDrive('https://docs.google.com/spreadsheets/d/1l-1kvMCTs2kz4N9WbKUiit1WHwuYh0Zm/edit?usp=sharing&rtpof=true'), [
    'https://drive.usercontent.google.com/download?id=1l-1kvMCTs2kz4N9WbKUiit1WHwuYh0Zm&export=download&confirm=t',
    'https://docs.google.com/spreadsheets/d/1l-1kvMCTs2kz4N9WbKUiit1WHwuYh0Zm/export?format=xlsx'
  ]);
  assert.deepEqual(PP.enderecosDrive('sem link'), []);
  const c = ['Administradora', 'Tipo de Grupo ', 'Plano', 'Tipo', 'Prazo (meses)', 'Flag Adesão', 'Flag Seguro', 'Crédito mínimo (R$)', 'Crédito máximo (R$)', 'Taxa de administração (%)', 'Fundo de reserva (%)', 'Lance embutido (%)', 'Lance fixo (%)', 'Índice de reajuste', 'Flag Fidelidade', 'A partir de (Mês)', '% Lance Embutido'];
  const r = PP.planosDaPlanilha([
    linha(c),
    linha(['Porto Seguro', 'Em Formação', 'Imóvel 200 Meses', 'Imóvel', 200, 'Não', 'Sim', 200000, 1000000, 21, 2, 30, 40, 'INCC', 'Sim', null, null]),
    linha(['Bradesco', 'Em Andamento', 'Auto 80', 'Veículo', 80, 'Sim', 'Não', 80000, 300000, 16, 2, 30, 40, 'IPCA', 'Sim', '6; 12', '30; 27']),
    linha(['Mapfre', 'Em Formação', 'Casa 180', 'Imóvel', 180, 'Talvez', 'Não', 100000, null, 20, 2, null, null, 'INCC', 'Sim', 6, null])
  ], ADMS);
  assert.deepEqual(r.erros, ['Linha 4: Flag Adesão "Talvez" inválida (use Sim ou Não).', 'Linha 4: Lance Fidelidade: informe "A partir de (Mês)" e "% Lance Embutido" para cada opção.']);
  const [porto, auto] = r.planos;
  assert.deepEqual([porto.tipoGrupo, porto.categoria, porto.adesaoAtiva, porto.seguroAtivo, porto.fidelidadeAtiva, porto.fidelidade], ['Em Formação', 'imovel', false, true, true, undefined]);
  assert.deepEqual(auto.fidelidade, [{ parcela: 6, pct: 30 }, { parcela: 12, pct: 27 }]);
  const s = Calc.estadoPadrao();
  Calc.aplicarPlanoCadastrado(s, Calc.normalizarPlano(auto));
  assert.deepEqual([s.plano.adesaoAtiva, s.plano.seguroAtivo, s.fidelidade.ativo, s.fidelidade.p1Parcela, s.fidelidade.p1Pct, s.fidelidade.p2Parcela, s.fidelidade.p3Parcela], [true, false, true, 6, 30, 12, 18]);
  Calc.aplicarPlanoCadastrado(s, Calc.normalizarPlano(porto));
  assert.deepEqual([s.plano.adesaoAtiva, s.plano.seguroAtivo, s.fidelidade.p1Parcela, s.fidelidade.p1Pct], [false, true, 6, 30], 'opções da fidelidade voltam ao padrão');
});

test('planilha de planos: percentuais, valores em texto, padrões e grafia da administradora', () => {
  const r = PP.planosDaPlanilha([
    linha(cab),
    linha(['porto', 'Imóvel 200', 'imovel', 200, 'R$ 150.000,00', '500.000', 0.18, 0.02, '30%', 0, 'Pré-fixado 6%'], [6, 7]),
    linha(['Nova Adm', 'Auto 80', 'Veículo', 80, 90000, null, 15, 3]),
    linha(['nova adm', 'Moto 60', 'Veículo', 60, 20000, null, 16, 2]),
    linha([null, null, null, null, null, null, null, null, null, null, null])
  ], ADMS);
  assert.deepEqual(r.erros, []);
  const [porto, auto, moto] = r.planos;
  assert.equal(porto.administradora, 'Porto Seguro');
  assert.deepEqual([porto.creditoMinimo, porto.creditoMaximo, porto.taxaAdm, porto.fundoReserva, porto.embutidoPct, porto.fixoPct, porto.indice], [150000, 500000, 18, 2, 30, 0, 'pre6']);
  assert.equal(auto.indice, 'ipca', 'veículo sem índice usa IPCA');
  assert.equal(auto.creditoMaximo, undefined);
  assert.equal(auto.embutidoPct, undefined, 'vazio mantém o padrão do simulador');
  assert.equal(moto.administradora, 'Nova Adm', 'mesma administradora com a grafia da primeira linha');
  assert.equal(r.planos.length, 3, 'linha vazia é ignorada');
});

test('planilha de planos: erros por linha; as linhas com erro ficam de fora', () => {
  const r = PP.planosDaPlanilha([
    linha(cab),
    linha(['HS', 'Imóvel', 'Imóvel', null, 100000, 50000, 20, 2]),
    linha(['HS', 'Imóvel', 'Serviços', 240, 100000, null, 120, 2, null, null, 'IGPM']),
    linha(['HS', 'Inativo', 'Imóvel', 240, 100000]),
    linha(['HS', 'Certo', 'Imóvel', 240, 100000, null, 20, 2])
  ], ADMS);
  assert.ok(r.erros.includes('Linha 2: falta Prazo (meses).'));
  assert.ok(r.erros.includes('Linha 2: crédito máximo menor que o crédito mínimo.'));
  assert.ok(r.erros.some((e) => /^Linha 3: tipo "Serviços" inválido/.test(e)));
  assert.ok(r.erros.some((e) => /^Linha 3: Taxa de administração fora da faixa/.test(e)));
  assert.ok(r.erros.some((e) => /^Linha 3: índice "IGPM" inválido/.test(e)));
  assert.ok(r.erros.includes('Linha 4: falta Taxa de administração (%).'));
  assert.deepEqual(r.planos.map((p) => p.nome), ['Certo']);
  assert.equal(r.linhasComErro, 3);
  const dup = PP.planosDaPlanilha([linha(cab), linha(['HS', 'Imóvel', 'Imóvel', 240, 1, null, 1, 1]), linha(['HS', 'Imóvel', 'Imóvel', 240, 1, null, 1, 1])], ADMS);
  assert.deepEqual(dup.erros, ['Linha 3: plano "Imóvel" repetido na administradora HS (linha 2).']);
  assert.match(PP.planosDaPlanilha([linha(['Prazo', 'Taxa'])]).erros[0], /^Cabeçalho não encontrado/);
});

test('planilha de planos: títulos com variações, administradora pelo nome da aba e tipo pelo nome do plano', () => {
  const abas = [
    { nome: 'Instruções', linhas: [linha(['Como preencher'])] },
    { nome: 'Bradesco', linhas: [linha(['Tabela de planos — novembro']), linha([]), linha(['Produto', 'Prazo', 'Crédito', 'Tx. Adm.', 'FR', 'Reajuste']),
      linha(['Imóvel 200 meses', 200, 'R$ 300.000,00', '22%', '1,5%', 'INCC-M']), linha(['Auto Leve 80', 80, 70000, 14, 2, 'IPCA'])] },
    { nome: 'Âncora', linhas: [linha(['Plano', 'Segmento', 'Prazo', 'Crédito mín.', 'Crédito máx.', 'Taxa de administração', 'Fundo de reserva', 'Redutor (%)']),
      linha(['Pesados 100', 'Pesados', 100, 150000, 400000, 15, 2, 30])] }
  ];
  const r = PP.planosDoLivro(abas, ADMS);
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.abas, ['Bradesco', 'Âncora']);
  assert.deepEqual(r.planos.map((p) => [p.administradora, p.nome, p.categoria, p.creditoMinimo, p.taxaAdm, p.fundoReserva, p.indice]), [
    ['Bradesco', 'Imóvel 200 meses', 'imovel', 300000, 22, 1.5, 'incc'],
    ['Bradesco', 'Auto Leve 80', 'veiculo', 70000, 14, 2, 'ipca'],
    ['Âncora', 'Pesados 100', 'veiculo', 150000, 15, 2, 'ipca']
  ]);
  assert.deepEqual([r.planos[2].creditoMaximo, r.planos[2].redutorPct], [400000, 30]);
});

test('planilha de planos: uma aba por mês lê a do mês atual', () => {
  const aba = (nome, plano) => ({ nome, linhas: [linha(cab), linha(['Mapfre', plano, 'Imóvel', 200, 100000, null, 20, 2])] });
  const r = PP.planosDoLivro([aba('Outubro', 'Plano de outubro'), aba('Novembro', 'Plano de novembro')], Object.assign({ hoje: new Date(2026, 10, 8) }, ADMS));
  assert.deepEqual(r.planos.map((p) => p.nome), ['Plano de novembro']);
  assert.match(r.avisos[0], /lida a aba "Novembro"/);
});

test('planilha de planos: colunas opcionais (adesão, seguro, modalidade, abatimento, ativo, código)', () => {
  const c = cab.concat(['Taxa de adesão (%)', 'Adesão diluída em (meses)', 'Seguro prestamista (% a.m.)', 'Modalidade de parcela', 'Outro redutor (%)', 'Abatimento do lance', 'Ativo', 'Código do plano']);
  const r = PP.planosDaPlanilha([
    linha(c),
    linha(['HS', 'Meia parcela', 'Imóvel', 240, 200000, null, 20, 2, null, null, 'INCC', 1, 12, '0,038% a.m.', 'Redutor de 50%', null, 'Prazo', 'Sim', 'HS-MEIA']),
    linha(['HS', 'Outro', 'Imóvel', 240, 200000, null, 20, 2, null, null, 'INCC', null, null, null, 'Outro percentual', 30, null, null, null]),
    linha(['HS', 'Guardado', 'Imóvel', 240, 200000, null, 20, 2, null, null, 'INCC', null, null, null, null, null, null, 'Não', null])
  ], ADMS);
  assert.deepEqual(r.erros, []);
  assert.equal(r.inativos, 1);
  const [meia, outro] = r.planos;
  assert.deepEqual([meia.id, meia.adesaoPct, meia.adesaoMeses, meia.seguroPct, meia.redutorPct, meia.abatimento], ['HS-MEIA', 1, 12, 0.038, 50, 'prazo']);
  assert.deepEqual([outro.adesaoPct, outro.redutorPct, outro.abatimento], [0, 30, 'parcela']);
});

test('plano cadastrado: crédito máximo, adesão, redutor, abatimento e lance de 0%', () => {
  const pl = Calc.normalizarPlano({ id: 'X1', administradora: 'HS', nome: 'Meia', categoria: 'imovel', creditoMinimo: 100000, creditoMaximo: 300000, prazo: 200, taxaAdm: 18, fundoReserva: 2, embutidoPct: 0, fixoPct: 40, adesaoPct: 1, adesaoMeses: 10, seguroPct: 0.05, redutorPct: 50, abatimento: 'Prazo', indice: 'incc' });
  const s = Calc.estadoPadrao();
  s.plano.lead = 'Teste';
  Calc.aplicarPlanoCadastrado(s, pl);
  assert.deepEqual([s.plano.credito, s.plano.creditoMinimo, s.plano.creditoMaximo], [100000, 100000, 300000]);
  assert.deepEqual([s.plano.adesaoAtiva, s.plano.adesaoPct, s.plano.adesaoMeses, s.plano.seguroPct, s.plano.abatimento], [true, 1, 10, 0.05, 'prazo']);
  assert.deepEqual([s.parcela.modalidade, s.lances.embutidoAtivo, s.lances.fixoAtivo, s.lances.fixoPct, s.lances.fixoUsarEmbutido], ['r50', false, true, 40, false]);
  assert.ok(!Calc.validar(s).some((v) => /embutido/i.test(v.msg) && v.nivel !== 'info'), 'sem alerta de embutido quando a administradora não oferece');
  s.plano.credito = 350000;
  assert.ok(Calc.validar(s).some((v) => v.campo === 'plano.credito' && /acima do máximo/.test(v.msg)));
  s.plano.credito = 300000;
  assert.ok(!Calc.validar(s).some((v) => v.campo === 'plano.credito'));
  Calc.aplicarPlanoCadastrado(s, Calc.normalizarPlano({ id: 'X2', administradora: 'HS', redutorPct: 30, adesaoPct: 0 }));
  assert.deepEqual([s.parcela.modalidade, s.parcela.redutorOutro, s.plano.adesaoAtiva, s.plano.creditoMaximo], ['outro', 30, false, null]);
  assert.equal(Calc.normalizarPlano({ id: 'X3', administradora: 'HS', ativo: false }), null, 'plano inativo não entra');
});
