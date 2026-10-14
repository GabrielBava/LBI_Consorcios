// Gera js/logos.js a partir dos logotipos em marca/ (embutidos como data URI para funcionar
// offline, na versão on-line e na geração do PDF). Rode após trocar os arquivos: node scripts/gerar-logos.js
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, 'marca', f)).toString('base64');

const saida = [
  '/*',
  ' * Logotipo do Grupo Life Brasil (gerado por scripts/gerar-logos.js a partir de marca/life-*.png).',
  ' * claro: para fundos claros (texto grafite); escuro: para fundos escuros (texto branco);',
  ' * coracao: o símbolo sozinho. Embutido como data URI para funcionar offline, na versão on-line e no PDF.',
  ' */',
  'window.LOGO_MARCA = {',
  "  claro: '" + uri('life-logo-claro.png') + "',",
  "  escuro: '" + uri('life-logo-escuro.png') + "',",
  "  coracao: '" + uri('life-coracao.png') + "'",
  '};',
  ''
].join('\n');
fs.writeFileSync(path.join(raiz, 'js', 'logos.js'), saida);
console.log('js/logos.js gerado (' + Math.round(saida.length / 1024) + ' KB)');
