# Simulador de Consórcio — Vero Consórcios

Pacote completo do simulador (cartas primárias), com código, logos, manual de identidade visual e um exemplo de proposta em PDF. Serve para criar uma cópia de teste em outro chat, por exemplo para incluir o **modelo de carta contemplada**.

## Como abrir

- Abra `index.html` no navegador (Chrome ou Edge). Não precisa instalar nada e funciona offline.
- `dist/simulador.html` é a mesma versão em um arquivo único, usada na publicação on-line.
- Testes do motor de cálculo: `npm test` (Node.js 18 ou superior).
- Gerar a versão em arquivo único: `npm run build:online`.

## O que tem em cada pasta

| Caminho | Conteúdo |
|---|---|
| `index.html` | Tela: menu lateral (dados do plano, lances, fidelidade, mecanismo) e área da proposta |
| `js/calc.js` | Motor de cálculo puro, sem interface: parcelas, reajuste, redutor, lances, venda, alavancagem, CET, fidelidade, mecanismo, planos |
| `js/app.js` | Interface: campos, desenho da proposta, PDF, mensagem do WhatsApp, temas, link do CRM |
| `js/config.js` | WhatsApp do especialista, endereço do CRM (`planosUrl`) e planos cadastrados |
| `js/logos.js` | Logos da Vero embutidos (versão clara e escura) |
| `js/vendor/` | html2canvas e jsPDF, usados para gerar o arquivo PDF |
| `css/tokens.css` | Tokens oficiais da identidade (cores, fontes, raios, sombras; temas escuro e claro) |
| `css/style.css` | Componentes da tela e layout das 3 páginas do PDF |
| `tests/calc.test.js` | 27 testes do motor de cálculo |
| `docs/ESPECIFICACAO.md` | Especificação completa: campos, regras, fórmulas e histórico de versões (até 2.8) |
| `marca/` | Logos com fundo transparente (`vero-logo-claro.png`, `vero-logo-escuro.png`) e os originais |
| `marca/manual-identidade/` | Os 4 PDFs do manual (paleta, tipografia, elementos, aplicações) e o `design-tokens.css` original |
| `exemplos/proposta-exemplo.pdf` | Exemplo do PDF gerado pelo botão "Gerar proposta" |

## Regras principais já implementadas (resumo)

- **Parcela:** fundo comum = (100% ÷ prazo) × crédito; taxa adm. = (TA% ÷ prazo) × crédito; fundo de reserva = (FR% ÷ prazo) × crédito.
- **Redutor:** vale até a contemplação e a diferença é diluída depois. Na **HS** o redutor vale para a parcela inteira; nas demais, só para o fundo comum.
- **Reajuste:** índice anual a cada 12 meses (INCC no imóvel, IPCA no veículo).
- **Lances:**
  - Embutido 25% e fixo 50%; livre informado.
  - "Usar Embutido" e "Usar FGTS"; o FGTS entra nos recursos próprios.
  - O lance abate o saldo por parcela ou por prazo.
- **Venda da carta:** 20% do crédito disponível. Alavancagem nos meses 1 a 12 e depois 18 a 48, de 6 em 6.
- **Aquisição:** CET pela TIR dos fluxos, parcela pós-contemplação e retorno de locação de 1,6% do crédito disponível.
- **Lance Fidelidade (opcional):** 6ª parcela/30%, 12ª/27% e 18ª/25%, 100% embutido.
- **Mecanismo de Alavancagem (opcional):** reaplica a venda (ou o lucro) em novas cartas do mesmo plano, em até 4 cenários.
- **PDF:** 3 páginas A4 no tema escuro da marca, com logo; o botão "Gerar proposta" baixa o arquivo e prepara a mensagem do WhatsApp.
- **CRM:** o link aceita `?nome=...&contato=...&plano=<id>`.

Os detalhes e exemplos numéricos estão em `docs/ESPECIFICACAO.md`.

## Pendências conhecidas

- Número de WhatsApp do especialista em `js/config.js` (está vazio).
- Endereço do CRM ou lista real de planos em `js/config.js` (hoje há 2 planos de exemplo).
- Fonte Famels: comercial. Para usar, coloque os arquivos em `css/fonts/`; até lá, a Manrope é usada.
- Mecanismo de Alavancagem ainda não entra no PDF.

## Como começar no outro chat

1. Envie este arquivo zip (ou os arquivos descompactados) no novo chat.
2. Cole uma mensagem como esta, ajustando o que for preciso:

> Segue em anexo o projeto completo do Simulador de Consórcio da Vero Consórcios (HTML/CSS/JS, sem build). Leia primeiro `LEIA-ME-PRIMEIRO.md` e `docs/ESPECIFICACAO.md`. Quero criar uma versão de teste separada que mantenha tudo o que já existe e inclua um **modelo de carta contemplada**: [descreva aqui as regras da carta contemplada, por exemplo: crédito disponível, saldo devedor, parcelas restantes, valor de ágio/entrada, comparação com financiamento]. Siga a identidade visual de `css/tokens.css` e do manual em `marca/manual-identidade/`, use os logos de `marca/` e mantenha os testes de `tests/calc.test.js` passando.
