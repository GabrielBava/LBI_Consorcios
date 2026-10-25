# Simulador de Consórcio — Grupo Life Brasil

Pacote completo do simulador, com código, logos e o resumo da identidade visual do Grupo Life Brasil. É uma plataforma única com duas páginas no mesmo link: **Consórcio** (cartas primárias, `#primario`) e **Carta Contemplada** (`#contemplada`).

## Como abrir

- Abra `index.html` no navegador (Chrome ou Edge). Não precisa instalar nada e funciona offline.
- Arquivo para a equipe, protegido por senha: `SIMULADOR_SENHA=1234 npm run build:protegido` gera `dist/Simulador_Life_v<versão>.html` (ver o README).
- `dist/simulador.html` (`npm run build:online`) é a versão em arquivo único usada na publicação on-line.
- Testes do motor de cálculo: `npm test` (Node.js 18 ou superior).

## O que tem em cada pasta

| Caminho | Conteúdo |
|---|---|
| `index.html` | Tela: menu lateral com os campos das duas páginas e área da proposta |
| `js/calc.js` | Página 1 — motor de cálculo puro, sem interface: parcelas, reajuste, redutor, lances, venda, alavancagem, CET, fidelidade, mecanismo, planos |
| `js/calc-contemplada.js` | Página 2 — motor de cálculo puro: cartas e junção, CET aproximado, fluxo de parcelas, amortização, evolução, rendimentos e financiamento |
| `js/app-contemplada.js` | Página 2 — proposta na tela, mensagem do WhatsApp e PDF |
| `js/adesao.js` | Finalizar venda: ficha de cadastro (campos em `CAMPOS_ADESAO`) e PDF do termo de cadastro |
| `js/app.js` | Interface: abas entre as páginas, campos, desenho da proposta, PDF, mensagem do WhatsApp, temas, link do CRM |
| `js/config.js` | Nome da empresa, versão e validade (`versao`, `validadeVersao`), site depois do Finalizar venda (`siteAposVenda`), endereço do CRM (`planosUrl`) e planos cadastrados |
| `js/logos.js` | Logos do Grupo Life Brasil embutidos (versão clara, escura e o coração), gerados por `npm run logos` |
| `js/vendor/` | html2canvas e jsPDF, usados para gerar o arquivo PDF |
| `css/tokens.css` | Tokens da identidade do Grupo Life Brasil (cores, fontes, raios, sombras; temas escuro e claro) |
| `css/style.css` | Componentes da tela e layout das 3 páginas do PDF |
| `tests/calc.test.js` | 30 testes do motor de cálculo da página 1 |
| `tests/contemplada.test.js` | 37 testes do motor de cálculo da página 2 |
| `tests/adesao.test.js` | 7 testes das validações, máscaras, endereço e busca de CEP da ficha de fechamento |
| `docs/ESPECIFICACAO.md` | Página 1: campos, regras, fórmulas e histórico de versões (até 3.4 / versão 1.2.1) |
| `docs/ESPECIFICACAO-CONTEMPLADA.md` | Página 2 (v3.2): campos, regras, fórmulas e validações |
| `marca/` | Logos com fundo transparente (`life-logo-claro.png`, `life-logo-escuro.png`, `life-coracao.png`) e `IDENTIDADE.md` (cores, fontes e modelos da marca) |
| `scripts/gerar-logos.js` | Gera `js/logos.js` a partir dos logos de `marca/` (`npm run logos`) |

## Regras principais já implementadas (resumo)

- **Parcela:** fundo comum = (100% ÷ prazo) × crédito; taxa adm. = (TA% ÷ prazo) × crédito; fundo de reserva = (FR% ÷ prazo) × crédito.
- **Redutor:** vale até a contemplação e a diferença é diluída depois. Na **HS** e na **Porto Seguro** o redutor vale para a parcela inteira; nas demais, só para o fundo comum.
- **Reajuste:** índice anual a cada 12 meses (INCC no imóvel, IPCA no veículo).
- **Lances:**
  - Embutido 25% e fixo 50%; livre informado.
  - **Lance Retido:** recursos próprios (valor do bem: FIPE ou avaliação do imóvel, em R$) + lance embutido (% do crédito); o total soma as duas partes.
  - **Recursos próprios e FGTS:** valores do cliente, com dica do que perguntar; o lance usa primeiro o FGTS (só imóvel; travado no veículo e na pessoa jurídica) e depois o dinheiro, com alerta do que faltar. "Usar Embutido" e "Usar Recursos próprios" em cada lance.
  - O lance abate o saldo por parcela ou por prazo.
- **Venda da carta:** 20% do crédito disponível. Alavancagem nos meses 1 a 12 e depois 18 a 48, de 6 em 6.
- **Aquisição:** CET pela TIR dos fluxos, parcela pós-contemplação e retorno de locação de 1,6% do crédito disponível.
- **Lance Fidelidade (opcional):** 6ª parcela/30%, 12ª/27% e 18ª/25%, 100% embutido.
- **Mecanismo de Alavancagem (opcional):** reaplica a venda (ou o lucro) em novas cartas do mesmo plano, em até 4 cenários.
- **Tipo de pessoa:** física ou jurídica (pessoa jurídica não usa FGTS).
- **Estratégia de Cartas (opcional):** split do crédito em N cartas ou N cartas iguais à simulada, com valores por carta e total.
- **PDF:** 3 páginas A4 no tema claro da marca (veículo: 2, sem a alavancagem), com logo, data e hora da emissão e o aviso legal; o botão "Gerar proposta" baixa o arquivo e prepara a mensagem do WhatsApp.
- **Finalizar venda (uso interno):** ficha de cadastro (fechamento vindo da simulação, dados do consorciado ou da empresa e do representante, endereço com busca pelo CEP, dados bancários); baixa o termo de cadastro em PDF, com data e hora da emissão, mostra o agradecimento e abre o site do grupo.
- **Seguro prestamista:** % ao mês sobre o valor total do plano (crédito + taxa de administração + fundo de reserva, atualizados, + adesão).
- **Acesso:** cada acesso começa do zero; o arquivo da equipe abre com senha e tem validade por versão (versão exibida abaixo do logo).
- **CRM:** o link aceita `?nome=...&contato=...&plano=<id>` e `pagina=contemplada` para abrir direto na página 2.

### Página 2 · Carta Contemplada

- **Resumo:** crédito contrato, parcela atual, CET mensal e CET anual + indexador (CET aproximado, como no simulador de cartas contempladas).
- **Características:** crédito total e líquido, entrada (ágio), custo da operação (saldo devedor + ágio, em R$ e em % acima do crédito) e saldo devedor.
- **Fluxo de parcelas (sempre):** agrupado por faixa de meses; o reajuste pelo indexador começa desabilitado.
- **Guias opcionais (desabilitadas ao iniciar):** Estudo de Amortização (aporte no mês informado, parcela recalculada e tabela a cada 12 meses), Evolução de Parcelas (a cada 12 meses, com reajuste, aporte acumulado e saldo devedor), Calculadora de Rendimentos (mecanismo da calculadora de renda fixa; aplicação inicial = crédito − entrada; período = maior prazo; o aporte da amortização entra só no mês dele) e Consórcio vs Financiamento (cartões lado a lado com as mesmas linhas; Price/SAC, 420 meses, entrada de 20%, TR, seguro de vida e seguro proteção do imóvel — o Seguro/FGHab da Caixa — com o CESH, comparativo a cada 12 meses, custos invisíveis, renda mínima pela regra dos 30% e idade máxima de 65 anos ao fim do contrato) e Gráficos (parcelas e economia mês a mês com os pontos de equilíbrio; só na tela, não entram no PDF).
- **Veículo e Serviço:** o comparativo usa o financiamento de veículo (CDC, Tabela Price, juros ao mês, 48 meses, entrada de 20%, IOF de pessoa física e tarifas financiados, CET pela TIR).
- **PDF:** tema claro, com data e hora da emissão, cerca de três páginas: características, composição da junção, fluxo de parcelas, calculadora de rendimentos e consórcio vs financiamento.

Os detalhes e exemplos numéricos estão em `docs/ESPECIFICACAO.md`.

## Pendências conhecidas

- Deixar o repositório do GitHub privado (hoje é público: o código-fonte fica visível para qualquer pessoa).
- Endereço do CRM ou lista real de planos em `js/config.js` (hoje há 2 planos de exemplo).
- Fonte Klavika: comercial. Instalada no computador, ela é usada automaticamente; sem ela, vale a Titillium Web.
- Mecanismo de Alavancagem ainda não entra no PDF.

## Como começar em outro chat

1. Envie este arquivo zip (ou os arquivos descompactados) no novo chat.
2. Cole uma mensagem como esta, ajustando o que for preciso:

> Segue em anexo o projeto completo do Simulador de Consórcio do Grupo Life Brasil (HTML/CSS/JS, sem build). Leia primeiro `LEIA-ME-PRIMEIRO.md` e `docs/ESPECIFICACAO.md`. Quero criar uma versão de teste separada que mantenha tudo o que já existe e inclua um **modelo de carta contemplada**: [descreva aqui as regras da carta contemplada, por exemplo: crédito disponível, saldo devedor, parcelas restantes, valor de ágio/entrada, comparação com financiamento]. Siga a identidade visual de `css/tokens.css` e de `marca/IDENTIDADE.md`, use os logos de `marca/` e mantenha os testes de `tests/calc.test.js` passando.
