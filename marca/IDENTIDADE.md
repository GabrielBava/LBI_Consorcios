# Identidade visual — Grupo Life Brasil

Resumo tirado da apresentação institucional V1 do Grupo Life Brasil e aplicado ao simulador.
Os valores usados de fato ficam em `css/tokens.css` (temas escuro e claro) e `css/style.css`.

## Logotipo

| Arquivo | Uso |
|---|---|
| `life-logo-claro.png` | Fundo claro (texto grafite `#201E1E`) |
| `life-logo-escuro.png` | Fundo escuro (texto branco); é o usado no PDF |
| `life-coracao.png` | O coração sozinho: ícone da página e marca discreta |

Os três são embutidos em `js/logos.js` por `npm run logos` (`scripts/gerar-logos.js`).
O nome exibido na proposta e na mensagem do WhatsApp vem de `js/config.js` (`empresa`).

## Cores

| Papel | Cor |
|---|---|
| Laranja Life (títulos, destaques, preenchimentos) | `#F05A00` |
| Texto de destaque no tema escuro | `#FF7A2E` (7:1 sobre o cartão) |
| Texto de destaque no tema claro | `#C24400` (5:1 sobre o branco) |
| Botão principal (texto branco) | `#CC4800` |
| Fundo escuro / cartões | `#000000` / `#111111` |
| Texto grafite (tema claro) | `#201E1E` |
| Coração (degradê) | `#C8203A` → `#EE3F31` → `#FF5A24` |
| Indicadores em destaque (degradê, texto `#1A0E05`) | `#F7A23A` → `#F05A00` |

Gráficos da página 2 (validados para daltonismo e contraste em todos os pares):

| Série | Escuro | Claro |
|---|---|---|
| Consórcio | `#F05A00` | `#E85500` |
| Financiamento (tracejado) | `#3A86E8` | `#1F63C0` |
| Economia aplicada | `#159A6C` | `#128A62` |
| Economia orgânica (pontilhado) | `#C25BB4` | `#A8358C` |

## Tipografia

- **Klavika** (Light, Regular, Bold e Light Italic): a fonte da marca, comercial. É usada quando está instalada no computador.
- **Titillium Web** (Google Fonts): substituta de desenho próximo, carregada automaticamente quando a Klavika não está instalada.

## Modelos da apresentação

- **Título de seção:** caixa alta, peso leve, em laranja, com a palavra-chave em negrito
  ("MARCOS DE **SUCESSO**") e um traço fino abaixo.
- **Capa:** texto fino em caixa alta com a parte principal em negrito ("APRESENTAÇÃO INSTITUCIONAL | **V1**").
- **Slides escuros:** fundo preto, títulos laranja, texto branco; **slides claros:** fundo branco, títulos laranja, texto grafite.
- **Cartões:** cantos bem arredondados e contorno fino (cartões "Nossa Missão"), números em laranja.
- **Destaques:** pílulas laranja com texto claro; ícones laranja dentro de círculo de contorno.
- **Coração:** no canto das páginas, como marca discreta.
- **Sistema Diagnóstico Life:** indicadores em degradê laranja com texto escuro e aba ativa em pílula laranja.
