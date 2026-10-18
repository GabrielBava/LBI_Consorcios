# Especificação funcional — Página 2: Carta Contemplada

Versão 3.2 · Implementação: `js/calc-contemplada.js` (motor de cálculo), `js/app-contemplada.js` (proposta, textos e PDF), `js/adesao.js` (termo de adesão) e `js/app.js` (navegação entre as páginas).

> **v3.2:** botões do topo iguais aos da página 1 (Transmitir proposta, Nova proposta, Gerar proposta), PDF no tema claro e mais enxuto (cerca de três páginas) e financiamento de **veículo (CDC)** no Consórcio vs Financiamento quando o segmento é Veículo ou Serviço.

> A simulação usa os valores informados das cartas e as premissas inseridas. O CET é aproximado (linear, sem capitalização) e não inclui o reajuste do indexador, exibido à parte. Reajustes, rendimentos e financiamento dependem de índices e taxas futuras, sem garantia.

---

## 1. Plataforma única: duas páginas no mesmo link

| Página | Link | Conteúdo |
|---|---|---|
| 1 · Consórcio | `index.html#primario` | Simulador de cartas primárias (sem alterações de regra; ver `ESPECIFICACAO.md`) |
| 2 · Carta Contemplada | `index.html#contemplada` | Simulador de cartas contempladas descrito aqui |

- **Abas no topo da proposta** (no celular, no topo do menu). O menu lateral troca os campos conforme a página.
- O link também aceita `?pagina=contemplada` (inclusive depois do `#`). Voltar/avançar do navegador alterna entre as páginas. O link do CRM (`?nome=&contato=&plano=`) abre sempre a página 1, salvo quando pede `pagina=contemplada`.
- As abas trocam a página por script, sem recarregar; no celular ficam no topo do menu e, com o menu oculto, no topo da proposta.
- **Compartilhado entre as páginas:** nome e contato do cliente, tema claro/escuro, menu oculto/visível, barra de ações: **Transmitir proposta** (laranja) e, no tom claro, **Nova proposta** e **Gerar proposta** (prévia e PDF).
- Cada página guarda seus próprios campos no navegador. **Nova proposta** limpa a página atual e os dados do cliente. O antigo **Salvar proposta** (.json) saiu na v3.2.
- **Transmitir proposta** (uso interno): o mesmo formulário do termo de adesão da página 1 (ver `ESPECIFICACAO.md`, seção 2.13), com o resumo da carta em tela (produto, administradora, indexador, cartas, crédito, entrada, parcela, saldo devedor, maior prazo e estimativa de transferência). Gera o PDF do termo e o e-mail para o pós-venda.

## 2. Menu lateral

### 2.1 Dados da proposta
| Campo | Padrão | Regra |
|---|---|---|
| Segmento | Imóvel | Imóvel, Veículo ou Serviço. Sugere o indexador (Imóvel → INCC; demais → IPCA). |
| Administradora | vazio | Texto livre com sugestões da lista de administradoras. |

### 2.2 Cartas contempladas (uma ou várias: junção)
Cada carta: **Crédito disponível\***, **Entrada / ágio pago**, **Parcela atual\*** e **Prazo restante\*** (meses). "Adicionar carta" inclui outra; "Remover" aparece com duas ou mais cartas.

### 2.3 Fluxo de Parcelas
| Campo | Padrão | Regra |
|---|---|---|
| Indexador | INCC | Pré-fixado 5%, Pré-fixado 6%, IPCA, INCC, INPC ou Outro. |
| Taxa estimada (% a.a.) | vazio | Obrigatória para IPCA/INCC/INPC/Outro quando algum reajuste é usado. |
| Habilitar reajuste pelo indexador | **desmarcado** | Sem reajuste, o fluxo mostra as parcelas atuais. Habilitado, aplica o reajuste anual. |
| 1º reajuste (mês) | 13 | Aparece quando há reajuste (fluxo, evolução, amortização, Consórcio vs Financiamento ou Gráficos). Depois, a cada 12 meses. |

### 2.4 Guias opcionais (todas **desmarcadas** ao iniciar)
| Guia | Campos |
|---|---|
| Estudo de Amortização | Valor do aporte (R$), Mês do aporte |
| Evolução de Parcelas | — |
| Calculadora de Rendimentos | Aporte inicial (travado = crédito − entrada), Aportes mensais (R$), Período (meses; automático = maior prazo), Parâmetros de rentabilidade |
| Consórcio vs Financiamento — **Imóvel** | Sistema (Tabela Price/SAC), Prazo (padrão 420; atalhos 360/420), Entrada % (padrão 20), Juros % a.a. (padrão 11,5), Crédito necessário (pré-preenchido com o crédito das cartas, editável), **Seguro de vida (% a.m.)** (MIP, sobre o saldo devedor, padrão 0,03%) e **Seguro proteção imóvel (% a.m.)** (DFI, sobre o valor do imóvel, padrão 0,008%) — o Seguro/FGHab da parcela da Caixa — e, em "Correção e custos do banco": TR (padrão 2% a.a.), outros seguros (R$/mês, padrão 0) e taxa de administração (R$ 25/mês) |
| Consórcio vs Financiamento — **Veículo e Serviço** (v3.2) | Financiamento de veículo (CDC, Tabela Price, parcelas fixas): Crédito necessário (como no imóvel), Prazo (padrão 48; atalhos 36/48/60; até 72), Entrada % (padrão 20), Juros % a.m. (padrão 1,93%, perto da média do Banco Central para aquisição de veículos por pessoa física; confirmar com o banco) e, em "IOF e tarifas": tarifa de cadastro (R$ 800) e registro do contrato (R$ 250). Sem TR, seguros habitacionais, CESH nem idade máxima |
| Gráficos | — (usam as premissas do Consórcio vs Financiamento; com o comparativo desmarcado, essas premissas continuam visíveis só para os gráficos) |

## 3. Proposta na tela (e no PDF)

1. **Resumo da Proposta:** Crédito contrato · Parcela atual · CET mensal · CET anual com "a.a. + indexador" na mesma linha.
2. **Características da Proposta:** Crédito total · Crédito líquido · Entrada (ágio) com % · Custo da operação (saldo devedor + ágio) · Custo total da operação (%) · Saldo devedor (R$). Com duas ou mais cartas, mostra a composição da junção. A estimativa de transferência (1%) saiu do quadro e segue só na mensagem do WhatsApp.
3. **Fluxo de Parcelas (sempre):** faixas de meses com o mesmo valor (período, parcelas, valor, subtotal e total), com o título "Parcelas a pagar" (ou "Parcelas projetadas" com reajuste). Botão **Copiar** para o WhatsApp.

**Tabelas com seta:** fluxo, amortização, evolução, comparativo e custos invisíveis têm uma seta para mostrar ou ocultar a tabela na tela (lembrado no navegador). O PDF traz sempre todas as tabelas.
4. **Estudo de Amortização** (se habilitado): saldo antes/depois do aporte, parcela antes/depois, reajustes evitados e tabela a cada 12 meses (mês, parcela sem aporte, parcela com aporte, saldo devedor), com a linha do mês do aporte destacada.
5. **Evolução das Parcelas** (se habilitada): a cada 12 meses e no último mês — mês, parcela com reajuste, aporte acumulado (parcelas pagas) e saldo devedor, sempre por último.
6. **Calculadora de Rendimentos** (se habilitada): valor inicial, aportes mensais, período, aporte da amortização (quando houver) e soma investida; barras do valor líquido de resgate (com a correção pelo IPCA como referência); tabela com valor bruto acumulado, rentabilidade bruta, custos, IR, valor líquido acumulado, rentabilidade líquida e ganho líquido; comparação com o custo da operação da carta.
7. **Consórcio vs Financiamento** (se habilitado): dois cartões **lado a lado**, com as mesmas linhas alinhadas — Crédito contratado · Entrada · Crédito líquido (carta) / Crédito financiado (financiamento) · 1ª parcela · Última parcela · Prazo · **CET + indexador** (carta: CET a.a. + taxa do índice = total) / **Juros + TR + CESH** (financiamento: soma = total) · Total pago (entrada + parcelas), os dois com reajustes (indexador na carta; TR, Seguro/FGHab e taxas no financiamento). A 1ª parcela do financiamento detalha prestação + Seguro/FGHab + taxas. No celular os cartões ficam um abaixo do outro; diferença no total pago com os reajustes de cada um (só com o mesmo crédito da carta); tabela **a cada 12 meses** (só com o mesmo crédito da carta) com parcela do consórcio (reajuste pelo indexador), parcela do financiamento (reajuste TR, com seguros e taxa), economia de parcela, acumulado orgânico, acumulado aplicado (CDB da calculadora, bruto), saldo devedor do financiamento e do consórcio; tabela de **custos invisíveis** (seguro de vida/MIP, seguro proteção do imóvel/DFI, outros seguros, TA: 1º mês, total no contrato e % do crédito, com total geral e o CESH); avisos de renda mínima (regra dos 30%) e idade máxima na assinatura.
   - **Veículo e Serviço (v3.2):** o cartão do financiamento mostra "CDC · Tabela Price"; Crédito financiado (com IOF e tarifas); 1ª e última parcela iguais (parcelas fixas); **Juros + IOF e tarifas** (juros a.a. + diferença até o CET = CET a.a.); total pago com juros, IOF e tarifas. Custos invisíveis: IOF (0,38% + 0,0082% ao dia), tarifa de cadastro e registro do contrato — valor cobrado, valor no contrato (com juros, pago nas parcelas) e % do crédito. Fica só o aviso de renda mínima (30%). O comparativo a cada 12 meses e os gráficos usam a parcela fixa do financiamento e o saldo devedor pela Price.
8. **Gráficos** (se habilitados; **só na tela, nunca no PDF**): (a) evolução mensal das parcelas do consórcio (reajuste pelo indexador) e do financiamento (TR, Seguro/FGHab e taxas), com a marca do **ponto de equilíbrio** — o primeiro mês em que as parcelas se igualam ou trocam de lado enquanto as duas são pagas; (b) economia acumulada orgânica e aplicada e saldos devedores do consórcio e do financiamento, até a última parcela da carta, com a marca do mês em que a **economia aplicada cobre o saldo devedor do consórcio**. Legenda com cor e traço por linha (financiamento tracejado, orgânico pontilhado), dica ao passar o mouse com os valores do mês (e a diferença de parcela) ao lado do cursor, sem cobrir o mês lido (sem espaço dos lados, acima do gráfico), "ver dados" com a tabela, e o texto do ponto de equilíbrio abaixo de cada gráfico. Exigem o mesmo crédito da carta, como a tabela a cada 12 meses.

**PDF (v3.2):** páginas A4 no **tema claro** da marca, com só o essencial, em cerca de três páginas: Resumo e **Características da Proposta**, **Composição da Junção** (duas ou mais cartas) e **Fluxo de Parcelas**; **Calculadora de Rendimentos** (se habilitada); **Consórcio vs Financiamento** com os custos invisíveis (se habilitado), seguido da chamada para o especialista e do aviso. Estudo de Amortização, Evolução das Parcelas, a tabela a cada 12 meses e os Gráficos ficam só na tela. Uma guia habilitada com pendência aparece como "Não calculado" com o motivo. Os blocos são medidos no tamanho final; tabelas longas continuam na página seguinte ("continuação"). A chamada para o especialista e o aviso fecham a última página. A mensagem do WhatsApp segue o resumo do simulador de cartas contempladas (cartas, resumo financeiro, CET + indexador, transferência e fluxo das parcelas).

## 4. Fórmulas

Notação por carta *i*: crédito Cᵢ, entrada Eᵢ, parcela Pᵢ, prazo nᵢ. Taxa do indexador *r* (a.a.); 1º reajuste no mês m₁.

| Resultado | Fórmula |
|---|---|
| Saldo devedor da carta | Sᵢ = Pᵢ × nᵢ |
| Crédito total / entrada / saldo | C = ΣCᵢ · E = ΣEᵢ · S = ΣSᵢ |
| Crédito líquido | C − E |
| Custo da operação | S + E (saldo devedor + ágio de entrada) |
| Custo total da operação (%) | (S + E) ÷ C − 100% |
| Custo efetivo (base do CET) | (E + S) − C, sobre o crédito líquido (C − E) |
| Prazo ponderado | Σ(nᵢ × Sᵢ) ÷ S |
| CET mensal (aprox.) | Custo efetivo % ÷ prazo ponderado |
| CET anual (aprox.) | CET mensal × 12, exibido "+ indexador" |
| Estimativa de transferência | 1% × C (só na mensagem do WhatsApp) |
| Reajustes até o mês t | 0 se t < m₁; senão 1 + ⌊(t − m₁) ÷ 12⌋ |
| Parcela do mês t (com reajuste) | Σ Pᵢ × (1 + r)^reajustes(t), para as cartas com t ≤ nᵢ |
| Saldo devedor após o mês t | Σ Pᵢ × (1 + r)^reajustes(t) × (nᵢ − t), a valores do mês |
| Aporte acumulado | Σ parcelas pagas até o mês t |
| Amortização no mês M (valor A) | Saldo após o mês M = S_M; aporte efetivo = min(A, S_M); k = 1 − aporte ÷ S_M; parcelas seguintes × k (prazo mantido, reajustes seguem) |
| Reajustes evitados | Σ parcelas após M × (1 − k) − aporte (zero sem reajuste) |
| Rendimentos (mecanismo da calculadora de renda fixa) | Inicial × f^n + aportes mensais × (fⁿ − 1)/(f − 1), f = (1 + taxa a.a.)^(1/12); custos = bruto × [(1 + custo a.a.)^(n/12) − 1]; IR = ganho × alíquota(n): 22,5% até 6 meses, 20% até 11, 17,5% até 23, 15% depois |
| Aporte da amortização na aplicação | Entra no mês M (nunca antes): valor × f^(n − M), com custos e IR pelo próprio prazo (n − M) |
| Financiamento mês a mês | Saldo corrigido pela TR: S′ = S × (1 + TR)^(1/12); juros = S′ × i; Price: prestação = S′ × i ÷ [1 − (1 + i)^−(meses restantes)]; SAC: amortização = S′ ÷ meses restantes; i = (1 + juros a.a.)^(1/12) − 1 |
| Seguro/FGHab do mês (como a Caixa) | Seguro de vida (MIP) = % × S′ (saldo devedor; na Caixa a taxa varia com a idade do cliente); seguro proteção do imóvel (DFI) = % × valor do imóvel atualizado pela TR (valor da garantia: B′ = B × (1 + TR)^(1/12) a cada mês); outros seguros e TA em R$ |
| Parcela do financiamento | Prestação + seguro de vida + seguro proteção do imóvel + outros seguros + TA |
| CESH (custo efetivo do seguro habitacional) | TIR anual das prestações com os dois seguros − TIR anual só das prestações, sobre o valor financiado: (1 + r_com)^12 − (1 + r_sem)^12 |
| Custo anual nos cartões | Carta: CET a.a. + taxa do indexador (+ 0% quando nenhum reajuste cai dentro do prazo); financiamento: juros a.a. + TR a.a. + CESH (soma simples, para comparação) |
| Pontos de equilíbrio | Parcelas: 1º mês, até o fim do menor prazo, em que (parcela financiamento − parcela consórcio) zera ou muda de sinal — na junção, a queda da parcela quando uma carta termina não conta como equilíbrio (é citada no texto) e a busca segue; investido: 1º mês antes da última parcela da carta em que acumulado aplicado ≥ saldo devedor do consórcio |
| Comparativo | Economia = parcela financiamento − parcela consórcio; acumulado orgânico = Σ economia; acumulado aplicado = (acumulado anterior × (1 + taxa CDB)^(1/12)) + economia do mês |
| Custos invisíveis | Σ MIP, DFI/DFC, outros seguros e TA no contrato; % = total ÷ crédito necessário |
| Financiamento de veículo (CDC, v3.2) | Base = (crédito − entrada) + tarifa de cadastro + registro; i = juros a.m.; IOF de pessoa física = 0,38% do total financiado + 0,0082% ao dia sobre cada amortização da Price (dias = 30 × mês, até 365); como o IOF é financiado, total = base ÷ (1 − fator do IOF); prestação = total × i ÷ [1 − (1 + i)^−n], fixa; juros a.a. = (1 + i)^12 − 1 |
| CET do veículo | TIR mensal que iguala (crédito − entrada) às prestações; CET a.a. = (1 + TIR)^12 − 1; no cartão, juros a.a. + (CET − juros) = CET |
| Custos invisíveis do veículo | Valor cobrado (IOF, cadastro, registro) e no contrato com juros = valor × (prestação × n ÷ total financiado); % = no contrato ÷ crédito necessário |
| Renda mínima | 1ª parcela do financiamento ÷ 30% (a parcela não pode comprometer mais de 30% da renda) |
| Idade máxima na assinatura | 65 anos − prazo, a partir de hoje (anos, meses e dias); nascidos a partir de (hoje + prazo − 65 anos) |

Produtos da calculadora: Poupança (% a.m., isenta), CDB (% do CDI, prefixado ou IPCA+), LCI/LCA (isenta), Tesouro Selic, Fundo DI (% do CDI, com taxa de administração), Tesouro IPCA+ (IPCA + juro real) e Tesouro Prefixado (com custódia da B3). Selic, CDI, IPCA (Focus, 12 meses) e poupança são buscados no Banco Central quando a calculadora é habilitada e há conexão; sem conexão, valem as taxas de referência do simulador. Os parâmetros são editáveis e "Restaurar parâmetros padrões" volta às taxas de referência; "Nova proposta" mantém as taxas já atualizadas. Só os parâmetros não editados são atualizados pelo Banco Central, e a proposta cita o Banco Central como fonte apenas quando Selic, CDI, IPCA e poupança em uso são os buscados.

## 5. Validações

| Situação | Nível |
|---|---|
| Carta sem crédito, parcela ou prazo | Erro (campo destacado; resultados "Não calculado") |
| Prazo restante acima de 600 meses | Erro (a carta não é calculada) |
| Entrada maior ou igual ao crédito; prazo acima de 420 meses | Alerta |
| Reajuste usado (fluxo, evolução, amortização, financiamento ou gráficos) com índice estimado sem taxa | Erro na taxa estimada |
| Reajuste usado com "1º reajuste (mês)" vazio | Erro (sem reajuste em uso, o campo fica oculto e não é validado) |
| Amortização sem valor ou com mês fora do prazo | Erro; aporte acima do saldo é limitado (aviso na proposta) |
| Período da aplicação acima do maior prazo | Alerta; o período é limitado ao maior prazo |
| Financiamento (ou gráficos): prazo fora de 1–420, entrada fora de 0–100%, juros vazio; TR, seguros ou taxa negativos | Erro |
| Financiamento de veículo: prazo fora de 1–72, entrada fora de 0–100%, juros a.m. vazio; tarifas negativas | Erro |
| Nome do cliente vazio | Erro (obrigatório nas duas páginas para gerar a proposta) |

## 6. Rastreabilidade

- Motor puro em `js/calc-contemplada.js`, testado em `tests/contemplada.test.js` (`npm test`), incluindo o exemplo do simulador de cartas contempladas: crédito R$ 1.200.000,00, entrada R$ 436.800,00, parcela R$ 6.165,60 × 233 → custo da operação R$ 1.873.384,80 (56,12%), custo efetivo 88,23% (base do CET), CET 0,38% a.m. e 4,54% a.a.
- Regras fixas (transferência 1%, comprometimento de 30% da renda, idade 65, prazo máximo 420, reajuste a cada 12 meses; no veículo, prazo máximo 72, atalhos 36/48/60 e IOF de 0,38% + 0,0082% ao dia até 365 dias) ficam em `REGRAS`; taxas de referência da calculadora em `PARAMS_RENDIMENTOS`.
