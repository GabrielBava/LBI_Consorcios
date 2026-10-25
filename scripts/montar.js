// Monta as partes da página única do simulador (usado pelos builds on-line e protegido).
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const lerBase64 = (f) => fs.readFileSync(path.join(raiz, f)).toString('base64');

/** Configuração (js/config.js) lida no Node, para usar a versão e a validade no build. */
function config() {
  const janela = {};
  new Function('window', ler('js/config.js'))(janela);
  return janela.CONFIG_SIMULADOR || {};
}

/**
 * Partes da página: cabeçalho (título, fontes, ícone), CSS, corpo e scripts na ordem de carregamento.
 * opcoes.artifact: marca window.MODO_ARTIFACT; opcoes.pdfEmbutido: inclui html2canvas e jsPDF (funciona sem internet).
 */
function montar(opcoes) {
  const o = opcoes || {};
  const html = ler('index.html');
  const titulo = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const fontes = (html.match(/<link[^>]*fonts\.g[^>]*>/g) || []).join('\n');
  // Ícone da página (o coração da marca) embutido, para o arquivo único não depender de marca/
  const icone = '<link rel="icon" type="image/png" href="data:image/png;base64,' + lerBase64('marca/life-coracao.png') + '">';
  const corpo = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src="js/config.js">')).trim();
  // Klavika: só a instalada no computador (local); sem ela, vale a Titillium Web do Google Fonts
  const css = ler('css/tokens.css').replace(/,url\("fonts\/[^"]+"\) format\("woff2"\)/g, '') + '\n' + ler('css/style.css');
  const scripts = [];
  if (o.artifact) scripts.push('window.MODO_ARTIFACT = true;');
  if (o.pdfEmbutido) scripts.push(ler('js/vendor/html2canvas.min.js'), ler('js/vendor/jspdf.umd.min.js'));
  ['js/config.js', 'js/logos.js', 'js/calc.js', 'js/calc-contemplada.js', 'js/app-contemplada.js', 'js/adesao.js', 'js/app.js'].forEach((f) => scripts.push(ler(f)));
  return { titulo, fontes, icone, css, corpo, scripts };
}

module.exports = { montar, config, raiz, lerBase64 };
