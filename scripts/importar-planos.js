// Gera js/planos.js: os planos embutidos na versão do simulador, usados quando não há acesso à planilha do Drive.
// Uso: npm run planos                      (lê a planilha do Google Drive de js/config.js → planilhaPlanos)
//      npm run planos -- arquivo.xlsx      (lê um arquivo local, como o modelo planos/Cadastro_de_Planos.xlsx)
// A leitura é a mesma do simulador (js/planilha-planos.js); aqui, só grava se a planilha não tiver erro.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PP = require('../js/planilha-planos.js');
const { ADMINISTRADORAS } = require('../js/calc.js');
const { config } = require('./montar.js');

const raiz = path.join(__dirname, '..');
const SAIDA = path.join(raiz, 'js', 'planos.js');

const inflar = async (b) => zlib.inflateRawSync(b);
const opcoes = { administradoras: ADMINISTRADORAS };

/** Lê um arquivo local e devolve { planos, erros, avisos, inativos, abas }. */
function importar(arquivo) {
  return PP.lerPlanos(fs.readFileSync(arquivo), inflar, opcoes);
}

/** Lê a planilha direto do Google Drive (link de compartilhamento). */
async function importarDoDrive(link) {
  for (const url of PP.enderecosDrive(link)) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const bytes = new Uint8Array(await resp.arrayBuffer());
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) return PP.lerPlanos(bytes, inflar, opcoes);
    } catch (e) { /* tenta o próximo endereço */ }
  }
  throw new Error('sem acesso à planilha do Drive (confira o link e o compartilhamento "qualquer pessoa com o link")');
}

function conteudoJs(planos, origem) {
  const agora = new Date();
  const dd = (x) => String(x).padStart(2, '0');
  const quando = dd(agora.getDate()) + '/' + dd(agora.getMonth() + 1) + '/' + agora.getFullYear() + ' ' + dd(agora.getHours()) + ':' + dd(agora.getMinutes());
  return '/* Planos embutidos no simulador (usados quando não há acesso à planilha do Google Drive).\n' +
    ' * Gerado por "npm run planos" a partir de ' + origem + ' em ' + quando + '.\n' +
    ' * Não edite à mão: altere a planilha e rode o comando de novo. */\n' +
    'window.CONFIG_SIMULADOR = window.CONFIG_SIMULADOR || {};\n' +
    'window.CONFIG_SIMULADOR.planos = [\n' + planos.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n];\n';
}

async function principal() {
  const arg = process.argv[2];
  const link = String(config().planilhaPlanos || '');
  let res, origem;
  try {
    if (arg) {
      const arquivo = path.resolve(arg);
      if (!fs.existsSync(arquivo)) { console.error('Planilha não encontrada: ' + arquivo); process.exit(1); }
      res = await importar(arquivo);
      const rel = path.relative(raiz, arquivo).split(path.sep).join('/');
      origem = rel.startsWith('..') ? path.basename(arquivo) : rel;
    } else if (link) {
      res = await importarDoDrive(link);
      origem = 'planilha do Google Drive';
    } else {
      console.error('Sem planilha: informe o arquivo (npm run planos -- arquivo.xlsx) ou o link planilhaPlanos em js/config.js.');
      process.exit(1);
    }
  } catch (e) { console.error('Não foi possível ler a planilha: ' + e.message); process.exit(1); }
  res.avisos.forEach((a) => console.warn('Aviso: ' + a));
  if (res.erros.length) {
    console.error('A planilha tem ' + res.erros.length + ' erro(s); js/planos.js não foi alterado:');
    res.erros.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
  const fora = res.planos.filter((p) => !ADMINISTRADORAS.includes(p.administradora));
  if (fora.length) console.warn('Aviso: ' + fora.length + ' plano(s) de administradora fora da lista (' + Array.from(new Set(fora.map((p) => p.administradora))).join(', ') + ') não aparecem no simulador.');
  fs.writeFileSync(SAIDA, conteudoJs(res.planos, origem));
  const adms = new Set(res.planos.map((p) => p.administradora));
  console.log('js/planos.js gerado: ' + res.planos.length + ' plano(s) de ' + adms.size + ' administradora(s)' + (res.inativos ? '; ' + res.inativos + ' inativo(s) ignorado(s)' : '') + '.');
  console.log('Gere a nova versão em seguida (npm run build:protegido).');
}

if (require.main === module) principal();

module.exports = { importar, importarDoDrive, conteudoJs };
