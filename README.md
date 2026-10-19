# Simulador de Consórcio — Grupo Life Brasil

Plataforma única, no mesmo link, com duas páginas:

- **Página 1 · Consórcio** (`index.html#primario`): cartas primárias — condições do plano, evolução do crédito e das parcelas, modalidades de contemplação (sorteio, lance embutido, fixo, livre e retido, com recursos próprios e FGTS), cenários de sorteio e de lance e resultado financeiro estimado.
- **Página 2 · Carta Contemplada** (`index.html#contemplada`): uma ou várias cartas contempladas (junção) — resumo com CET, características da proposta, fluxo de parcelas (com ou sem reajuste pelo indexador) e as guias opcionais Estudo de Amortização, Evolução de Parcelas, Calculadora de Rendimentos, Consórcio vs Financiamento (cartões lado a lado; no imóvel, Seguro/FGHab como a Caixa e CESH; no veículo e serviço, financiamento CDC com IOF e tarifas) e Gráficos (só na tela, fora do PDF).

As abas no topo da proposta alternam entre as páginas; o menu lateral troca os campos, e nome do cliente, tema claro/escuro e menu oculto valem para as duas. Cada página gera a sua **proposta em PDF** (tema claro) com o nome do lead e pode **transmitir a proposta**: o termo de adesão em PDF e o e-mail para o time de pós-venda (uso interno).

> A simulação depende dos dados do grupo, do contrato, das regras da administradora e das premissas inseridas. Não há garantia de contemplação, venda, lucro, valorização ou rentabilidade.

## Como usar

1. Abra `index.html` no navegador. Não há instalação nem servidor; funciona também offline.
2. Preencha as seções do menu lateral. Os resultados são atualizados automaticamente.
3. Clique em **Gerar proposta** e confira a prévia. Na prévia, **Gerar proposta** baixa o PDF (`Proposta_<Nome>_<data>.pdf`) e prepara a mensagem para colar no WhatsApp do cliente.
4. Fechado o negócio, **Transmitir proposta** abre a ficha de fechamento do termo de adesão (dados do fechamento vindos da simulação, dados do cliente, endereço pelo CEP e dados bancários). Ao finalizar, baixa `Termo_Adesao_<Nome>_<data>_<hora>.pdf`, com data e hora da emissão, e prepara o e-mail para o pós-venda (destinatário em `emailPosVenda`, `js/config.js`). É um documento interno: o cliente não recebe.

Na primeira abertura aparece um exemplo com valores fictícios. **Nova proposta** limpa os campos.

## Versão on-line

`npm run build:online` gera `dist/simulador.html`, uma página única com CSS e JS embutidos, para publicação. Nessa versão o download do PDF pede confirmação do navegador.

## Identidade visual

O simulador segue a identidade do **Grupo Life Brasil** (apresentação institucional V1): laranja Life sobre preto no tema escuro e sobre branco no tema claro (botão **Claro | Escuro** no topo da proposta), títulos em caixa alta com a palavra-chave em negrito, cartões de cantos arredondados e o logotipo com o coração (versões para fundo claro e escuro em `marca/`, embutidas em `js/logos.js` por `npm run logos`). A fonte da marca é a Klavika (comercial), usada quando está instalada no computador; sem ela, a Titillium Web assume automaticamente. Os tokens ficam em `css/tokens.css` e o resumo da identidade em `marca/IDENTIDADE.md`.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Tela: menu lateral (configuração) e área de resultados |
| `css/tokens.css` | Tokens da identidade do Grupo Life Brasil (cores, tipografia, forma, sombras; temas escuro e claro) |
| `css/style.css` | Componentes do simulador e layout das páginas do PDF |
| `js/config.js` | Número do especialista, e-mail do pós-venda (`emailPosVenda`) e planos cadastrados (ou endereço do CRM) |
| `js/vendor/` | html2canvas e jsPDF, usados para gerar o arquivo PDF |
| `js/calc.js` | Motor de cálculo puro da página 1 (sem interface), com fórmulas, validações e memórias |
| `js/calc-contemplada.js` | Motor de cálculo puro da página 2: cartas, CET, fluxo, amortização, evolução, rendimentos e financiamento |
| `js/app-contemplada.js` | Página 2 na tela, textos do WhatsApp e PDF da carta contemplada |
| `js/adesao.js` | Transmitir proposta: formulário do termo de adesão (campos em `CAMPOS_ADESAO`), PDF interno e e-mail para o pós-venda |
| `js/app.js` | Interface: navegação entre as páginas, vínculo dos campos, desenho dos resultados, ações e PDF |
| `tests/calc.test.js` | Testes do motor de cálculo da página 1 |
| `tests/contemplada.test.js` | Testes do motor de cálculo da página 2 |
| `tests/adesao.test.js` | Testes das validações, máscaras, endereço e busca de CEP da ficha de fechamento |
| `docs/ESPECIFICACAO.md` | Especificação funcional da página 1 (campos, regras, fórmulas, pendências) |
| `docs/ESPECIFICACAO-CONTEMPLADA.md` | Especificação funcional da página 2 |

## Testes

```bash
npm test
```

Requer Node.js 18 ou superior. Não há dependências externas.
