# Simulador de Consórcio — Grupo Life Brasil

Plataforma única, no mesmo link, com duas páginas:

- **Página 1 · Consórcio** (`index.html#primario`): cartas primárias — condições do plano, evolução do crédito e das parcelas, modalidades de contemplação (sorteio, lance embutido, fixo, livre e retido, com recursos próprios e FGTS), cenários de sorteio e de lance, resultado financeiro estimado e a estratégia de cartas (split do crédito ou multiplicação).
- **Página 2 · Carta Contemplada** (`index.html#contemplada`): uma ou várias cartas contempladas (junção) — resumo com CET, características da proposta, fluxo de parcelas (com ou sem reajuste pelo indexador) e as guias opcionais Estudo de Amortização, Evolução de Parcelas, Calculadora de Rendimentos, Consórcio vs Financiamento (cartões lado a lado; no imóvel, Seguro/FGHab como a Caixa e CESH; no veículo e serviço, financiamento CDC com IOF e tarifas) e Gráficos (só na tela, fora do PDF).

As abas no topo da proposta alternam entre as páginas; o menu lateral troca os campos, e nome do cliente, tema claro/escuro e menu oculto valem para as duas. Cada página gera a sua **proposta em PDF** (tema claro, com data e hora da emissão) com o nome do lead, e o **Finalizar venda** baixa o termo de cadastro do cliente para o consultor encaminhar ao pós-venda (uso interno).

> A simulação depende dos dados do grupo, do contrato, das regras da administradora e das premissas inseridas. Não há garantia de contemplação, venda, lucro, valorização ou rentabilidade.

## Como usar

1. Abra `index.html` no navegador (versão de desenvolvimento). Não há instalação nem servidor; funciona também offline. Para a equipe, distribua o arquivo protegido por senha (abaixo).
2. Preencha as seções do menu lateral. Os resultados são atualizados automaticamente.
3. Clique em **Gerar proposta** e confira a prévia. Na prévia, **Gerar proposta** baixa o PDF (`Proposta_<Nome>_<data>.pdf`) e prepara a mensagem para colar no WhatsApp do cliente.
4. Fechado o negócio, **Finalizar venda** abre a ficha de cadastro (fechamento vindo da simulação, dados do cliente ou da empresa e do representante, endereço pelo CEP e dados bancários). **Concluir e baixar termo** baixa `Termo_Cadastro_Consorcio_<cliente>_<administradora>.pdf`, com data e hora da emissão, mostra o agradecimento e abre o site do grupo. O consultor encaminha o PDF ao pós-venda; o cliente não recebe.

Cada acesso começa do zero, só com as premissas base: nenhuma proposta fica gravada no navegador. **Nova proposta** limpa os campos.

## Senha de acesso

Toda forma de abrir o simulador (`index.html`, a versão on-line e o arquivo protegido) começa por uma tela de senha. A senha não fica gravada: `js/config.js` guarda só o resumo dela (`senhaAcessoHash`). Para trocar:

```bash
npm run senha -- 1234
```

Em todas as formas, depois de entrar, ficam bloqueados o botão direito, a seleção e a cópia de texto fora dos campos e os atalhos de salvar a página (Ctrl+S), imprimir (Ctrl+P), ver código (Ctrl+U) e ferramentas do desenvolvedor (F12, Ctrl+Shift+I/J/C). O menu do próprio navegador ainda permite "Salvar como": no arquivo protegido, a cópia salva não funciona (o conteúdo é criptografado e os scripts saem da página depois de carregados); no `index.html` e na versão on-line, o código está aberto. Por isso, distribua à equipe só o arquivo protegido.

## Arquivo para a equipe (protegido por senha)

```bash
SIMULADOR_SENHA=1234 npm run build:protegido
```

Use a mesma senha do `npm run senha` (o build avisa se forem diferentes). Gera `dist/GLB_Simulador_de_Consorcio_v<versão>.html`: um arquivo único que funciona sem internet e abre com uma tela de senha. Todo o simulador vai criptografado (AES-256-GCM, chave derivada da senha por PBKDF2); a senha (4 a 64 caracteres; prefira 8 ou mais, com letras e números) não fica gravada no arquivo nem no repositório. A cada nova versão:

1. Atualize `versao` e `validadeVersao` em `js/config.js` (depois da validade, o arquivo antigo não abre mais; a data faz parte da criptografia, então editá-la no arquivo impede a abertura).
2. Gere o arquivo com a nova senha e distribua o arquivo e a senha por canais separados.

A senha é pedida uma vez só, na tela do arquivo. É uma proteção contra acesso e cópia casuais: quem tem a senha e conhecimento técnico ainda consegue ler o código pelo navegador, uma senha de 4 dígitos pode ser descoberta por tentativa com ferramentas próprias em poucos minutos, e atrasar o relógio do computador contorna a validade. **O código-fonte deste repositório também precisa ficar privado** (no GitHub: Settings → Danger Zone → Change visibility).

## Versão on-line

`npm run build:online` gera `dist/simulador.html`, uma página única com CSS e JS embutidos, para publicação no claude.ai (os downloads passam pelo recurso de downloads da página publicada; aberta fora dela, usa o download comum do navegador).

## Identidade visual

O simulador segue a identidade do **Grupo Life Brasil** (apresentação institucional V1): laranja Life sobre preto no tema escuro e sobre branco no tema claro (botão **Claro | Escuro** no topo da proposta), títulos em caixa alta com a palavra-chave em negrito, cartões de cantos arredondados e o logotipo com o coração (versões para fundo claro e escuro em `marca/`, embutidas em `js/logos.js` por `npm run logos`). A fonte da marca é a Klavika (comercial), usada quando está instalada no computador; sem ela, a Titillium Web assume automaticamente. Os tokens ficam em `css/tokens.css` e o resumo da identidade em `marca/IDENTIDADE.md`.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Tela: menu lateral (configuração) e área de resultados |
| `css/tokens.css` | Tokens da identidade do Grupo Life Brasil (cores, tipografia, forma, sombras; temas escuro e claro) |
| `css/style.css` | Componentes do simulador e layout das páginas do PDF |
| `js/config.js` | Nome da empresa, versão e validade, site aberto depois do Finalizar venda e planos cadastrados (ou endereço do CRM) |
| `js/vendor/` | html2canvas e jsPDF, usados para gerar o arquivo PDF |
| `js/calc.js` | Motor de cálculo puro da página 1 (sem interface), com fórmulas, validações e memórias |
| `js/calc-contemplada.js` | Motor de cálculo puro da página 2: cartas, CET, fluxo, amortização, evolução, rendimentos e financiamento |
| `js/app-contemplada.js` | Página 2 na tela, textos do WhatsApp e PDF da carta contemplada |
| `js/acesso.js` | Tela de senha na entrada e travas contra salvar, imprimir e copiar a página |
| `js/adesao.js` | Finalizar venda: ficha de cadastro (campos em `CAMPOS_ADESAO`) e PDF do termo de cadastro |
| `js/app.js` | Interface: navegação entre as páginas, vínculo dos campos, desenho dos resultados, ações e PDF |
| `tests/calc.test.js` | Testes do motor de cálculo da página 1 |
| `tests/contemplada.test.js` | Testes do motor de cálculo da página 2 |
| `scripts/build-protegido.js` | Gera o arquivo protegido por senha para a equipe (`npm run build:protegido`) |
| `scripts/gerar-senha.js` | Troca a senha da tela de acesso (`npm run senha -- <senha>`) |
| `scripts/build-artifact.js` | Gera a página única para publicação on-line (`npm run build:online`) |
| `tests/adesao.test.js` | Testes das validações, máscaras, endereço e busca de CEP da ficha de fechamento |
| `tests/acesso.test.js` | Testes do resumo da senha de acesso |
| `docs/ESPECIFICACAO.md` | Especificação funcional da página 1 (campos, regras, fórmulas, pendências) |
| `docs/ESPECIFICACAO-CONTEMPLADA.md` | Especificação funcional da página 2 |

## Testes

```bash
npm test
```

Requer Node.js 18 ou superior. Não há dependências externas.
