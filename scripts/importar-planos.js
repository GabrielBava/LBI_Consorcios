// Importa a planilha de planos (planos/Cadastro_de_Planos.xlsx) para js/planos.js, embutido nas versões do simulador.
// Uso: npm run planos                      (planilha padrão)
//      npm run planos -- outra-planilha.xlsx
// A leitura é a mesma do botão "Carregar planilha de planos" (js/planilha-planos.js); aqui, só grava se não houver erro.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PP = require('../js/planilha-planos.js');
const { ADMINISTRADORAS } = require('../js/calc.js');

const raiz = path.join(__dirname, '..');
const PLANILHA_PADRAO = path.join(raiz, 'planos', 'Cadastro_de_Planos.xlsx');
const SAIDA = path.join(raiz, 'js', 'planos.js');

const inflar = async (b) => zlib.inflateRawSync(b);

/** Lê o arquivo e devolve { planos, erros, avisos, inativos, abas }. */
function importar(arquivo) {
  return PP.lerPlanos(fs.readFileSync(arquivo), inflar, { administradoras: ADMINISTRADORAS });
}

function conteudoJs(planos, origem) {
  const agora = new Date();
  const dd = (x) => String(x).padStart(2, '0');
  const quando = dd(agora.getDate()) + '/' + dd(agora.getMonth() + 1) + '/' + agora.getFullYear() + ' ' + dd(agora.getHours()) + ':' + dd(agora.getMinutes());
  return '/* Planos cadastrados no simulador: administradora, plano, crédito mínimo e máximo, prazo, taxas, lances e índice.\n' +
    ' * Gerado por "npm run planos" a partir de ' + origem + ' em ' + quando + '.\n' +
    ' * Não edite à mão: altere a planilha e rode o comando de novo. */\n' +
    'window.CONFIG_SIMULADOR = window.CONFIG_SIMULADOR || {};\n' +
    'window.CONFIG_SIMULADOR.planos = [\n' + planos.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n];\n';
}

async function principal() {
  const arquivo = path.resolve(process.argv[2] || PLANILHA_PADRAO);
  if (!fs.existsSync(arquivo)) { console.error('Planilha não encontrada: ' + arquivo); process.exit(1); }
  let res;
  try { res = await importar(arquivo); } catch (e) { console.error('Não foi possível ler a planilha: ' + e.message); process.exit(1); }
  res.avisos.forEach((a) => console.warn('Aviso: ' + a));
  if (res.erros.length) {
    console.error('A planilha tem ' + res.erros.length + ' erro(s); js/planos.js não foi alterado:');
    res.erros.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
  const origem = path.relative(raiz, arquivo).split(path.sep).join('/');
  fs.writeFileSync(SAIDA, conteudoJs(res.planos, origem.startsWith('..') ? path.basename(arquivo) : origem));
  const adms = new Set(res.planos.map((p) => p.administradora));
  console.log('js/planos.js gerado: ' + res.planos.length + ' plano(s) de ' + adms.size + ' administradora(s)' + (res.inativos ? '; ' + res.inativos + ' inativo(s) ignorado(s)' : '') + '.');
  console.log('Gere a nova versão em seguida (npm run build:protegido).');
}

if (require.main === module) principal();

module.exports = { importar, conteudoJs };
