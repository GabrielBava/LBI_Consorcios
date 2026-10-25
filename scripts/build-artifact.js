// Gera dist/simulador.html: página única (CSS e JS embutidos) para publicação on-line no claude.ai.
// Nesse modo (window.MODO_ARTIFACT) os arquivos são baixados pelo recurso de downloads da página publicada.
// Para distribuir à equipe, use o arquivo protegido por senha: npm run build:protegido.
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, raiz } = require('./montar');

const semEntidade = (js) => js.replace(/<\/script/gi, '<\\/script');
const m = montar({ artifact: true });
const saida = [m.titulo, m.fontes, m.icone, '<style>\n' + m.css + '\n</style>', m.corpo]
  .concat(m.scripts.map((js) => '<script>\n' + semEntidade(js) + '\n</script>'), '').join('\n');

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist', 'simulador.html'), saida);
console.log('dist/simulador.html gerado (' + Math.round(saida.length / 1024) + ' KB)');
