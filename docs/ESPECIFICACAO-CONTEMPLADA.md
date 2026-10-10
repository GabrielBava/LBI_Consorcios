# Especificação funcional — Página 2: Carta Contemplada

Versão 3.0 · Implementação: `js/calc-contemplada.js` (motor de cálculo), `js/app-contemplada.js` (proposta, textos e PDF) e `js/app.js` (navegação entre as páginas).

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
- **Compartilhado entre as páginas:** nome e contato do cliente, tema claro/escuro, menu oculto/visível, barra de ações (Gerar proposta, Nova proposta, Salvar proposta).
- Cada página guarda seus próprios campos no navegador. **Nova proposta** limpa a página atual e os dados do cliente. **Salvar proposta** baixa um único JSON com as duas páginas (`versao: 3`).

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
| 1º reajuste (mês) | 13 | Aparece quando há reajuste (fluxo, evolução ou amortização). Depois, a cada 12 meses. |

### 2.4 Guias opcionais (todas **desmarcadas** ao iniciar)
| Guia | Campos |
|---|---|
| Estudo de Amortização | Valor do aporte (R$), Mês do aporte |
| Evolução de Parcelas | — |
| Calculadora de Rendimentos | Aporte inicial (travado = crédito − entrada), Aportes mensais (R$), Período (meses; automático = maior prazo), Parâmetros de rentabilidade |
| Consórcio vs Financiamento | Sistema (Tabela Price/SAC), Prazo (padrão 420; atalhos 360/420), Entrada % (padrão 20), Juros % a.a. (padrão 11,5), Crédito necessário (pré-preenchido com o crédito das cartas, editável), Nascimento do cliente (opcional) |

## 3. Proposta na tela (e no PDF)

1. **Resumo da Proposta:** Crédito contrato · Parcela atual · CET mensal · CET anual + indexador.
2. **Características da Proposta:** Crédito total · Crédito líquido · Entrada (ágio) com % · Custo da operação (R$) · Custo total da operação (%) · Saldo devedor (R$) · Estimativa de transferência (1% do crédito). Com duas ou mais cartas, mostra a composição da junção.
3. **Fluxo de Parcelas (sempre):** faixas de meses com o mesmo valor (período, parcelas, valor, subtotal e total). Botão **Copiar** para o WhatsApp.
4. **Estudo de Amortização** (se habilitado): saldo antes/depois do aporte, parcela antes/depois, reajustes evitados e tabela a cada 12 meses (mês, parcela sem aporte, parcela com aporte, saldo devedor), com a linha do mês do aporte destacada.
5. **Evolução das Parcelas** (se habilitada): a cada 12 meses e no último mês — mês, parcela com reajuste, aporte acumulado (parcelas pagas) e saldo devedor, sempre por último.
6. **Calculadora de Rendimentos** (se habilitada): valor inicial, aportes mensais, período, aporte da amortização (quando houver) e soma investida; barras do valor líquido de resgate (com a correção pelo IPCA como referência); tabela com valor bruto acumulado, rentabilidade bruta, custos, IR, valor líquido acumulado, rentabilidade líquida e ganho líquido; comparação com o custo da operação da carta.
7. **Consórcio vs Financiamento** (se habilitado): cartões da carta e do financiamento (com o total da carta com reajuste projetado, quando o reajuste está habilitado no fluxo), diferença no total pago e avisos de renda mínima e idade. A diferença "a favor do…" só aparece quando o crédito do financiamento é o mesmo da carta; se ele foi editado, a proposta avisa que os totais não são diretamente comparáveis.

**PDF:** páginas A4 no tema escuro da marca, montadas conforme as guias habilitadas; uma guia habilitada com pendência aparece como "Não calculado" com o motivo. Os blocos são medidos no tamanho final; tabelas longas continuam na página seguinte ("continuação"). A última página traz a chamada para o especialista e o aviso. A mensagem do WhatsApp segue o resumo do simulador de cartas contempladas (cartas, resumo financeiro, CET + indexador, transferência e fluxo das parcelas).

## 4. Fórmulas

Notação por carta *i*: crédito Cᵢ, entrada Eᵢ, parcela Pᵢ, prazo nᵢ. Taxa do indexador *r* (a.a.); 1º reajuste no mês m₁.

| Resultado | Fórmula |
|---|---|
| Saldo devedor da carta | Sᵢ = Pᵢ × nᵢ |
| Crédito total / entrada / saldo | C = ΣCᵢ · E = ΣEᵢ · S = ΣSᵢ |
| Crédito líquido | C − E |
| Custo da operação | (E + S) − C |
| Custo total (%) | Custo ÷ Crédito líquido |
| Prazo ponderado | Σ(nᵢ × Sᵢ) ÷ S |
| CET mensal (aprox.) | Custo % ÷ prazo ponderado |
| CET anual (aprox.) | CET mensal × 12, exibido "+ indexador" |
| Estimativa de transferência | 1% × C |
| Reajustes até o mês t | 0 se t < m₁; senão 1 + ⌊(t − m₁) ÷ 12⌋ |
| Parcela do mês t (com reajuste) | Σ Pᵢ × (1 + r)^reajustes(t), para as cartas com t ≤ nᵢ |
| Saldo devedor após o mês t | Σ Pᵢ × (1 + r)^reajustes(t) × (nᵢ − t), a valores do mês |
| Aporte acumulado | Σ parcelas pagas até o mês t |
| Amortização no mês M (valor A) | Saldo após o mês M = S_M; aporte efetivo = min(A, S_M); k = 1 − aporte ÷ S_M; parcelas seguintes × k (prazo mantido, reajustes seguem) |
| Reajustes evitados | Σ parcelas após M × (1 − k) − aporte (zero sem reajuste) |
| Rendimentos (mecanismo da calculadora de renda fixa) | Inicial × f^n + aportes mensais × (fⁿ − 1)/(f − 1), f = (1 + taxa a.a.)^(1/12); custos = bruto × [(1 + custo a.a.)^(n/12) − 1]; IR = ganho × alíquota(n): 22,5% até 6 meses, 20% até 11, 17,5% até 23, 15% depois |
| Aporte da amortização na aplicação | Entra no mês M (nunca antes): valor × f^(n − M), com custos e IR pelo próprio prazo (n − M) |
| Price | PMT = PV × i ÷ [1 − (1 + i)^−n], i = (1 + juros a.a.)^(1/12) − 1 |
| SAC | 1ª = PV/n + PV × i; última = PV/n × (1 + i); total = PV + i × PV × (n + 1)/2 |
| Renda mínima | 3 × maior parcela do financiamento |
| Idade máxima na assinatura | 65 anos − prazo, a partir de hoje (anos, meses e dias); nascidos a partir de (hoje + prazo − 65 anos) |
| Alerta de idade | Com a data de nascimento: se a idade ao fim do prazo passar de 65 anos, mostra o prazo compatível (sem bloquear nada) |

Produtos da calculadora: Poupança (% a.m., isenta), CDB (% do CDI, prefixado ou IPCA+), LCI/LCA (isenta), Tesouro Selic, Fundo DI (% do CDI, com taxa de administração), Tesouro IPCA+ (IPCA + juro real) e Tesouro Prefixado (com custódia da B3). Selic, CDI, IPCA (Focus, 12 meses) e poupança são buscados no Banco Central quando a calculadora é habilitada e há conexão; sem conexão, valem as taxas de referência do simulador. Os parâmetros são editáveis e "Restaurar parâmetros padrões" volta às taxas de referência; "Nova proposta" mantém as taxas já atualizadas. Só os parâmetros não editados são atualizados pelo Banco Central, e a proposta cita o Banco Central como fonte apenas quando Selic, CDI, IPCA e poupança em uso são os buscados.

## 5. Validações

| Situação | Nível |
|---|---|
| Carta sem crédito, parcela ou prazo | Erro (campo destacado; resultados "Não calculado") |
| Prazo restante acima de 600 meses | Erro (a carta não é calculada) |
| Entrada maior ou igual ao crédito; prazo acima de 420 meses | Alerta |
| Reajuste usado (fluxo, evolução ou amortização) com índice estimado sem taxa | Erro na taxa estimada |
| Reajuste usado com "1º reajuste (mês)" vazio | Erro (sem reajuste em uso, o campo fica oculto e não é validado) |
| Amortização sem valor ou com mês fora do prazo | Erro; aporte acima do saldo é limitado (aviso na proposta) |
| Período da aplicação acima do maior prazo | Alerta; o período é limitado ao maior prazo |
| Financiamento: prazo fora de 1–420, entrada fora de 0–100%, juros vazio | Erro |
| Nome do cliente vazio | Erro (obrigatório nas duas páginas para gerar a proposta) |

## 6. Rastreabilidade

- Motor puro em `js/calc-contemplada.js`, testado em `tests/contemplada.test.js` (`npm test`), incluindo o exemplo do simulador de cartas contempladas: crédito R$ 1.200.000,00, entrada R$ 436.800,00, parcela R$ 6.165,60 × 233 → custo 88,23%, CET 0,38% a.m. e 4,54% a.a.
- Regras fixas (transferência 1%, renda 3×, idade 65, prazo máximo 420, reajuste a cada 12 meses) ficam em `REGRAS`; taxas de referência da calculadora em `PARAMS_RENDIMENTOS`.
