# Especificação funcional — Simulador de Cartas de Consórcio Primárias

Versão 3.2 · Implementação de referência: `index.html`, `js/calc.js` (motor de cálculo), `js/app.js` (interface) e `js/adesao.js` (termo de adesão).

> **v3.2 — ajustes do simulador:** administradora digitável, Recursos próprios e FGTS (com dica), FGTS travado no veículo, **Lance Retido**, seta para recolher as tabelas de venda, projeções sem o gráfico de rentabilidade, **Transmitir proposta** (termo de adesão para o pós-venda) e PDF no tema claro (seção 2.13).
>
> **v3.1 — identidade do Grupo Life Brasil:** a marca, as cores, as fontes e os modelos visuais passaram a ser os do **Grupo Life Brasil** (seção 2.12). Não há mais logotipos nem vínculos com a marca anterior.
>
> **v3.0 — plataforma única:** este simulador é a **página 1 (Consórcio)**, no mesmo link da **página 2 (Carta Contemplada)**, especificada em [`ESPECIFICACAO-CONTEMPLADA.md`](ESPECIFICACAO-CONTEMPLADA.md). As abas no topo da proposta alternam entre as páginas (`#primario` / `#contemplada`); nome e contato do cliente, tema e menu oculto são compartilhados. O seletor de tema saiu do topo da proposta e foi para a barra das abas. As regras desta página não mudaram.

> **Observação obrigatória:** a simulação depende dos dados do grupo, do contrato, das regras da administradora e das premissas inseridas. Nenhum valor é contratual. Não há garantia de contemplação, venda, lucro, valorização ou rentabilidade.

---

## 1. Estrutura e navegação

| Área | Conteúdo |
|---|---|
| **Barra de ferramentas** | Gerar proposta (PDF) · Nova simulação · Salvar como padrão · Carregar exemplo · Exportar/Importar JSON · Restaurar padrão de fábrica |
| **Menu lateral (esquerda)** | Dados do plano · Modalidade Parcela · Estratégias de Contemplação · Projeções |
| **Resultados (direita)** | Botão Ocultar/Mostrar menu → Alertas → Resumo da Proposta → Formas de Contemplação → Simulação de Alavancagem → Projeções (gráficos selecionados) → Detalhes do cálculo e premissas (recolhível: condições, premissas, memória por forma de contemplação e demonstrativo mensal) |
| **Proposta em PDF** | Abre uma prévia na tela. Na versão local, "Salvar em PDF" usa a impressão do navegador, com arquivo sugerido `Proposta_<Nome>_<data>`. Contém o nome do cliente e os dados da proposta, incluindo os gráficos selecionados. |

Todo valor exibido tem uma etiqueta de tipo (**Informado**, **Calculado**, **Estimado**, **Pendente**, **Não aplicável**) e uma **memória de cálculo** com fórmula, valores e origem.

---

## 2. Campos do menu lateral

### 2.1 Dados do plano

| Nome | Tipo | Unidade | Obrig. | Padrão | Regra de negócio | Efeito nos cálculos | Validações |
|---|---|---|---|---|---|---|---|
| Nome completo | Texto | — | Sim | vazio | Identifica o cliente na proposta | Título e nome do arquivo PDF | Obrigatório |
| Categoria | Lista: Imóvel, Veículo | — | Sim | Imóvel | Sugere o índice: Imóvel → INCC, Veículo → IPCA | Índice de reajuste (editável depois) | — |
| Administradora | Texto com sugestões: HS, Embracon, CNP, Itaú, Porto Seguro, Servopa, Banco do Brasil, Santander, Klubi (v3.2: selecionar ou digitar, como na página 2) | — | Não | vazio | Identificação; a grafia de uma administradora da lista é corrigida ao sair do campo ("hs" → "HS") | Exibida na proposta; filtra os planos cadastrados | Informativo se vazia |
| Valor do crédito | Moeda | R$ | Sim | vazio | Crédito contratado | Base de todas as parcelas, lances e venda | > 0 |
| Prazo total | Inteiro | meses | Sim | 240 | Número de parcelas | Divisor da parcela | Inteiro ≥ 1; alerta > 420 |
| Projeção contemplação | Inteiro | mês | Sim | 12 | Mês projetado de contemplação, igual para todas as modalidades | Fim do redutor, lance, venda e resultado | 1 ≤ mês ≤ prazo |
| Taxa de administração | Número | % do crédito | Sim | vazio | Diluída no prazo | Componente da parcela | 0–100% |
| Fundo de reserva | Número | % do crédito | Sim | vazio | Diluído no prazo | Componente da parcela | 0–100% |
| Adesão | Sim/Não | — | Não | Não | Abre % e meses | — | — |
| % de adesão | Número | % do crédito | Se adesão | vazio | Adesão = % × crédito contratado | Somada à parcela nos meses de diluição | 0–100% |
| Meses de diluição | Inteiro | meses | Se adesão | vazio | Adesão dividida em parcelas iguais, sem reajuste | Idem | 1 ≤ meses ≤ prazo |
| Seguro prestamista | Sim/Não | — | Não | Não | Abre o percentual | — | — |
| % do seguro | Número | % ao mês | Se seguro | 0,038% | Sobre o crédito atualizado do mês | Somado à parcela todo mês | 0–100% |
| Abatimento do lance | Lista: Parcela, Prazo | — | Sim | Parcela | Como o lance amortiza o saldo | Parcelas após a contemplação | — |
| Índice de reajuste | Lista: Pré-fixado 5%, Pré-fixado 6%, IPCA, INCC, INPC, Outro | — | Sim | INCC (imóvel) / IPCA (veículo) | Reajuste anual a cada 12 meses até o fim do plano, aplicado ao crédito; parcelas recalculadas sobre o crédito reajustado | Crédito e parcelas a partir do mês 13 | — |
| Taxa estimada | Número | % ao ano | Se IPCA, INCC, INPC ou Outro | vazio | Premissa de projeção do consultor | Fator de reajuste | Erro se vazia e prazo > 12 |
| Nome do índice | Texto | — | Se Outro | vazio | Rótulo | — | — |

### 2.2 Modalidade Parcela

| Nome | Tipo | Padrão | Regra |
|---|---|---|---|
| Modalidade | Lista: Parcela integral, Redutor de 50%, Redutor de 25%, Outro percentual | Integral | O redutor incide só sobre o fundo comum e vale da 1ª parcela até a contemplação. |
| % de redução | Número (%) | vazio | Apenas em "Outro percentual". Entre 0% e 100%, exclusive. |

**Recomposição após a contemplação:** o percentual do fundo comum não pago durante o redutor é diluído igualmente nas parcelas restantes.

### 2.3 Estratégias de Contemplação

| Nome | Campos | Padrão | Regra |
|---|---|---|---|
| Lance embutido | Ativar · % do crédito · Valor (travado) | 25% | Parte do lance paga com o próprio crédito. Reduz o crédito líquido. |
| Lance fixo | Ativar · % do crédito · Valor (travado) · Usar embutido | 50% | Percentual definido pela administradora. |
| Lance livre | Ativar · % do crédito · Valor (travado) · Usar embutido | vazio | Oferta escolhida pelo cliente. |

- O **valor** é sempre calculado (% × crédito no mês da contemplação) e não pode ser digitado.
- **Usar embutido:** recursos próprios = lance total − lance embutido. Se o embutido for maior que o lance, é limitado ao valor do lance (com alerta).
- **Sorteio** é sempre apresentado (Tabela A). Lance fixo (Tabela B) e lance livre (Tabela C) aparecem quando ativados.

### 2.4 Projeções

Caixas de seleção: **Parcelas**, **Crédito atualizado**, **Rentabilidade (venda)**. Cada gráfico só é calculado e exibido quando selecionado, e entra também no PDF.

| Gráfico | Conteúdo |
|---|---|
| Parcelas | Parcela total mês a mês em cada cenário ativo (sorteio, lance fixo, lance livre), com marca no mês da contemplação |
| Crédito atualizado | Crédito reajustado por ano (colunas) |
| Rentabilidade (venda) | Resultado estimado da venda para cada mês possível de contemplação, por cenário, com marca no mês projetado |

Cada gráfico tem legenda, detalhe ao passar o mouse e uma tabela "ver dados".

### 2.5 Apresentação ao cliente

**Menu lateral:** pode ser ocultado pelo botão "Ocultar menu" no topo dos resultados. A escolha fica salva no navegador.

**Resumo da Proposta:** quatro cartões, Crédito e Parcela inicial em destaque, mais Taxa ao ano e Prazo. Abaixo, em lista: taxa administrativa (%), fundo de reserva (%), fator redutor (Não, ou Sim / %), indexador de reajuste, seguro prestamista, adesão e projeção de contemplação.

**Formas de Contemplação:** um cartão por forma (Sorteio sempre; Lance embutido, Lance fixo e Lance livre quando ativados), na mesma ordem de linhas:

| Linha | Cálculo |
|---|---|
| Crédito contratado | Crédito atualizado no mês da contemplação |
| Lance embutido | (%) e valor do embutido |
| Lance recursos próprios | (%) e valor pago pelo cliente |
| **Crédito disponível** | Crédito − embutido |
| Prazo remanescente | Parcelas após a contemplação (reduzido quando o abatimento é por prazo) |
| Parcela pós-contemplação | 1ª parcela após a contemplação, a preços do mês da contemplação |
| Saldo devedor | Saldo das parcelas restantes (fundo comum, taxa e fundo de reserva) − lance, a preços do mês da contemplação |

Cada cartão de lance lembra onde o lance é abatido (parcela ou prazo). No sorteio, parcelas e prazo seguem o plano.

**Simulação de Alavancagem:** tabelas "via Sorteio" e "via Lance embutido", com contemplação e venda hipotéticas nos meses 1, 7, 13, … 49.

| Coluna | Cálculo |
|---|---|
| Crédito | Crédito disponível no mês (atualizado, menos o embutido) |
| Parcela atual | Parcela do mês |
| Aporte | Soma das parcelas pagas até o mês |
| Vl. venda | 20% × crédito disponível |
| Lucro (R$) | Vl. venda − aporte |
| Rentabilidade (%) | Lucro ÷ aporte |

**Gráficos:** um gráfico por forma de contemplação (pequenos múltiplos na mesma escala), para evitar cores difíceis de distinguir.

---

### 2.6 Ajustes de apresentação (v2.2)

- **Menu lateral:** abaixo de "Gerar proposta (PDF)", apenas **Nova proposta** (volta aos valores iniciais) e **Salvar proposta** (baixa a proposta em arquivo .json; na versão on-line, exibe o conteúdo para copiar). O **Nome completo** fica fora dos blocos e sempre visível.
- **Botão do menu:** ícone discreto, fixo no canto enquanto a página rola.
- **Sem bloco de alertas** na proposta; os campos com erro continuam destacados no menu.
- **Topo:** "Proposta de Consórcio" em destaque, com o nome do cliente abaixo.
- **Resumo da Proposta:** Crédito, Parcela inicial, Total de taxas (a.a.) e Prazo, sem textos auxiliares.
- **Características do Plano:** bloco próprio com tipo do plano (Imóvel/Veículo), administradora, taxa administrativa, fundo de reserva, fator redutor, indexador, seguro, adesão, abatimento e projeção de contemplação.
- **Formas de Contemplação:** subtítulo "Comparação de Estratégias de Contemplação". Os cartões de lance (embutido, fixo e livre) têm um olho no canto superior direito; os dados começam desfocados e só aparecem após o clique. O sorteio fica sempre visível. Sem textos de legenda.
- **Simulação de Alavancagem:** olho ao lado de cada título (Sorteio, Lance embutido); as tabelas começam ocultas a cada nova proposta.
- **Simulação de Aquisição (novo):** um cartão por lance ativo com CET (a.a. e a.m.), crédito para aquisição, entrada (recursos próprios), parcelas até o fim do plano com reajuste, total desembolsado, custo da aquisição e prazo total.
- **Removido:** bloco "Detalhes do cálculo e premissas".

### 2.7 Proposta em PDF (3 páginas A4)

| Página | Conteúdo |
|---|---|
| 1 | "Proposta de Consórcio", nome do cliente, tipo do plano e data; Crédito, Parcela inicial, Total de taxas (a.a.) e Prazo; Características do Plano; Formas de Contemplação (Sorteio, Lance embutido e Lance fixo) |
| 2 | Panorama de Alavancagem: tabelas de venda via Sorteio e via Lance embutido |
| 3 | Simulação de Aquisição com CET por lance; chamada para ação com botão "Falar no WhatsApp"; bloco de avisos |

- As páginas têm tamanho fixo (210 × 297 mm), com rodapé com nome do cliente e numeração.
- O PDF traz todos os dados, independentemente dos olhos da tela, que servem só para a apresentação.
- O botão abre `https://wa.me/55<número>` com uma mensagem pronta. O número vem do campo **WhatsApp do especialista**, no menu, que é mantido ao iniciar uma nova proposta. Sem número, o botão aparece desativado e a prévia avisa.

### 2.8 Ajustes v2.4

- **Categoria com valores fixos:** ao selecionar, aplica ao plano (editável depois):

  | Categoria | Crédito | Prazo | Taxa adm. | Fundo de reserva | Índice |
  |---|---|---|---|---|---|
  | Imóvel | R$ 200.000 | 240 meses | 20% | 2% | INCC |
  | Veículo | R$ 80.000 | 100 meses | 13% | 2% | IPCA |

- **Contato do cliente (WhatsApp):** campo obrigatório, com o mesmo destaque do nome e máscara (11) 98765-4321. Nome e contato são exigidos para gerar a proposta. A prévia tem o botão **Abrir conversa no WhatsApp** (link `wa.me` para o cliente, com mensagem pronta); o PDF salvo é anexado na conversa.
- **WhatsApp do especialista:** sai do menu e passa a ser configurado em `js/config.js` (`whatsappEspecialista`), usado no botão da página 3 do PDF.
- **Abatimento do lance:** opções "Parcela" e "Prazo", com descrição abaixo do campo.
- **Estratégia de Lance** (antes "Estratégias de Contemplação"), com títulos em maiúsculas. Campo **FGTS** no início (valor em R$); "Usar FGTS" no Lance Fixo e no Lance Livre (na v3.2, substituído por Recursos próprios e FGTS, seção 2.13). O FGTS faz parte dos recursos próprios, sem linha própria: recursos próprios = lance − embutido (com o FGTS incluído, limitado a esse valor). O lance total (embutido + recursos próprios) abate o saldo e recalcula as parcelas por parcela ou por prazo, e os recursos próprios entram no aporte uma única vez.
- **Características do Plano:** projeção de contemplação só com o número (ex.: 12); abatimento "Parcela" ou "Prazo".
- **Alavancagem:** meses 1 a 12 e depois 18, 24, 30, 36, 42 e 48. Rentabilidade ao mês = (Vl. venda ÷ Aporte)^(1/mês) − 1.
- **Aquisição:** cenários de Sorteio e Lance Embutido.

### 2.9 Lance Fidelidade (v2.5)

- **Menu:** bloco "Lance Fidelidade", abaixo de Estratégia de Lance, com "Habilitar Lance Fidelidade", **desmarcado ao iniciar**.
- **Opções:** ao habilitar, abre três opções com "A partir da Parcela" (esquerda), "% Embutido" (direita) e o valor em R$, travado:

  | Opção | A partir da parcela | % Embutido |
  |---|---|---|
  | Lance Fidelidade 1 | 6 | 30% |
  | Lance Fidelidade 2 | 12 | 27% |
  | Lance Fidelidade 3 | 18 | 25% |

- **Regra:** lance 100% embutido, sem recursos próprios. A contemplação ocorre na parcela da opção, e o percentual incide sobre o crédito atualizado nesse mês. O lance abate o saldo conforme o "Abatimento do lance".
- **Proposta:** seção **Bônus Fidelidade** ("Extra · Lance Fidelidade"), logo abaixo de Formas de Contemplação, com um cartão por opção no mesmo formato do Lance Embutido e o olho de exibição.
- **PDF:** mantém 3 páginas. Página 1: proposta, características e formas de contemplação; página 2: alavancagem via sorteio e via lance embutido; página 3: simulação de aquisição, depois o bloco **Bônus Fidelidade** (quando habilitado), a chamada para o especialista e o aviso.

### 2.10 Mecanismo de Alavancagem, aquisição e envio da proposta (v2.6)

- **Menu:** bloco "Mecanismo de Alavancagem", abaixo do Lance Fidelidade, **desmarcado ao iniciar**. Ao habilitar:
  - **Reaplicar:** "Valor de venda" ou "Lucro" da carta, sempre no mês da projeção de contemplação dos dados do plano.
  - **Carta de origem:** Sorteio ou Lance Embutido.
  - **Capital para reaplicar:** valor travado (lucro negativo conta como zero).
  - **Quantidade de cartas:** até 4 cenários (padrão 1 e 2); campo vazio não gera cenário.
  - **Contemplação das novas cartas (mês):** padrão 12.
- **Regra:** as novas cartas têm as mesmas características do plano atual e são contempladas e vendidas no mês informado. Por cenário: crédito total, parcela inicial total, aporte até o mês (parcelas pagas), valor pago com o capital (e meses cobertos), aporte adicional do cliente ou sobra do capital, venda no mês, lucro (venda − aporte) e patrimônio projetado (venda + sobra do capital).
- **Proposta:** seção "Mecanismo de Alavancagem" logo abaixo da Simulação de Alavancagem, com olho de exibição por cenário. Não entra no PDF.
- **Simulação de Aquisição:** "Entrada (recursos próprios)" foi trocado por **Parcela atual pós-contemplação**, e "Parcelas até o fim do plano" por **Retorno mensal de locação** = 1,6% × crédito disponível (tela e PDF).
- **Envio da proposta:** na prévia, o botão "Gerar proposta" baixa o PDF automaticamente (gerado no navegador com html2canvas e jsPDF, em `js/vendor`) e mostra a mensagem pronta para o WhatsApp, já copiada: primeiro nome em negrito, categoria, crédito, prazo, administradora e parcela inicial em destaque, reforço do Lance Fidelidade 1, 2 e 3 (quando habilitado) e aviso de que o PDF da reunião segue abaixo.

### 2.11 Planos cadastrados (v2.7)

- **Menu:** campo **Plano** logo abaixo da Administradora, com os planos cadastrados da administradora selecionada.
- **Ao selecionar o plano**, são preenchidos automaticamente:
  - crédito (a partir do crédito mínimo do plano);
  - prazo do grupo, taxa administrativa e fundo de reserva;
  - percentuais de lance embutido e lance fixo;
  - índice de reajuste (e a taxa estimada do índice, quando informada);
  - categoria (Imóvel/Veículo).
  Os campos continuam editáveis. Crédito abaixo do mínimo do plano é sinalizado como erro.
- **Origem dos planos:** `planosUrl` em `js/config.js` (endereço do CRM que devolve os planos em JSON, como lista ou `{ "planos": [...] }`); sem endereço, vale a lista `planos` do mesmo arquivo (hoje com dois planos de exemplo, a substituir).
- **Campos de cada plano:** `id`, `administradora`, `nome`, `categoria`, `creditoMinimo`, `prazo`, `taxaAdm`, `fundoReserva`, `embutidoPct`, `fixoPct`, `indice`, `indiceTaxa` (opcional). Também aceita os nomes `codigo`, `adm`, `descricao`, `tipo`, `credito_minimo`, `prazo_grupo`, `taxa_adm`, `fundo_reserva`, `lance_embutido`, `lance_fixo`, `indice_reajuste` e `taxa_indice`.
- **Link do CRM:** além de `nome` e `contato`, aceita `plano=<id>` para já abrir com o plano aplicado.
- Trocar a categoria ou a administradora desfaz a seleção do plano.

### 2.12 Identidade visual do Grupo Life Brasil (v3.1)

- **Fonte da verdade:** `css/tokens.css`, tirado da apresentação institucional V1 do Grupo Life Brasil (paleta, temas escuro e claro, tipografia, raios, espaçamentos e sombras). `css/style.css` só acrescenta tokens derivados (botão principal, fundos suaves de status, anel de foco, séries dos gráficos) e os componentes. O resumo da identidade está em `marca/IDENTIDADE.md`.
- **Temas:** escuro por padrão (preto, como os slides escuros); claro (branco, como os slides claros) quando o sistema operacional está no modo claro ou quando a pessoa escolhe **Claro** no seletor (preferência guardada só no navegador). O PDF sai sempre no tema claro da marca (v3.2; antes, escuro).
- **Cores:** laranja Life `#F05A00` nos títulos, destaques e preenchimentos; texto de destaque `#FF7A2E` no escuro e `#B03D00` no claro (contraste acima de 4,5:1); fundo preto `#000` e cartões `#111`; grafite `#201E1E` no texto do tema claro; degradê do coração (carmim `#C8203A` → coral `#EE3F31` → tangerina `#FF5A24`) e degradê laranja (`#F7A23A` → `#F05A00`) nos indicadores em destaque, com texto escuro.
- **Tipografia:** Klavika (fonte da marca, comercial) quando instalada no computador; sem ela, a Titillium Web (Google Fonts), de desenho próximo. Títulos de seção em caixa alta e peso leve, com a palavra-chave em negrito.
- **Modelos da apresentação aplicados:**
  - Título de seção laranja em caixa alta ("RESUMO DA **PROPOSTA**"), com um traço fino abaixo.
  - Cabeçalho da proposta no estilo da capa: "PROPOSTA DE **CONSÓRCIO**", fino, com a palavra-chave em negrito laranja.
  - Cartões de cantos bem arredondados com contorno fino (como os cartões "Nossa Missão"); ícones em laranja dentro de círculo de contorno.
  - Indicadores principais em degradê laranja com texto escuro e aba ativa em pílula laranja (como o sistema Diagnóstico Life).
  - Botão principal em laranja Life com texto branco; destaques em pílula com borda laranja.
- **Marca:** logotipo do **Grupo Life Brasil** (nome configurável em `js/config.js`, campo `empresa`). A versão com texto grafite é usada no tema claro e a versão com texto branco no tema escuro; o coração sozinho é o ícone da página. Aparece no topo do menu, no topo da proposta na tela, no topo da página 1 do PDF e no rodapé de todas as páginas, sempre na versão clara (texto grafite) no PDF. A mensagem do WhatsApp cita o *Grupo Life Brasil*. Os arquivos ficam em `marca/life-logo-claro.png`, `marca/life-logo-escuro.png` e `marca/life-coracao.png`, embutidos em `js/logos.js` por `npm run logos`.
- **Gráficos:** linhas e barras em laranja Life; na página 2, consórcio em laranja, financiamento em azul, economia aplicada em verde e economia orgânica em magenta (paleta validada para daltonismo e contraste em todos os pares, nos dois temas).
- **Geração do PDF:** as páginas são montadas fora da tela em escala 2,5× e capturadas a 0,8×. Assim o html2canvas desenha o texto pequeno sem falhas de espaçamento e a resolução final continua a mesma (1588 × 2245 px por página).

### 2.13 Ajustes v3.2

- **Administradora:** o mesmo campo da página 2 — selecionar da lista ou digitar. Os planos cadastrados aparecem para a administradora escolhida; com um nome fora da lista, a seleção de plano fica desabilitada e a proposta usa os campos preenchidos.
- **Recursos próprios e FGTS** (primeiro bloco da Estratégia de Lance; substitui o antigo "FGTS"): a caixa **Recursos próprios** abre dois campos, **Recursos próprios (R$)** e **FGTS (R$)**. Ao lado de Recursos próprios, um ícone de dica (ao passar o mouse, tocar ou focar) lembra o consultor de perguntar ao cliente: dinheiro em conta ou aplicado que possa resgatar para o lance; imóvel quitado (o valor de avaliação pode servir de base para o lance); veículo quitado (valor da tabela FIPE do modelo). No campo, só os valores.
  - Nos lances fixo, livre e retido, **Usar Recursos próprios** aparece quando a caixa está marcada. O lance pago pelo cliente (lance − embutido) usa primeiro o FGTS (só imóvel) e depois o dinheiro; se não bastar, um alerta mostra quanto falta.
  - Propostas salvas antes desta versão: "FGTS" ativado vira "Recursos próprios" com o mesmo valor de FGTS.
- **Trava do FGTS no veículo:** com a categoria Veículo, o campo FGTS fica desabilitado ("O FGTS só pode ser usado em imóveis") e não entra em nenhum lance; um valor já digitado é ignorado, com aviso.
- **Lance Retido (nova modalidade):** funciona como um lance livre, mas a oferta é feita pelo **valor do bem** (por exemplo, o veículo ou o imóvel do cliente). Campos: **Valor do lance (R$)**; travados, o **% do crédito** (valor ÷ crédito atualizado na contemplação) e o valor **em dinheiro** (o que o cliente paga além do embutido e do FGTS); **Usar Embutido** e **Usar Recursos próprios**, como nas demais. Vale para imóvel e veículo. Limites: alerta quando o valor passa do crédito contratado, quando o lance passa do saldo devedor na contemplação (o excedente não é aproveitado) e quando faltam recursos próprios. Aparece nas Formas de Contemplação, na tela e no PDF.
- **Tabelas de venda (Simulação de Alavancagem):** além do olho (mostrar/ocultar os valores ao cliente), uma seta no canto direito do bloco recolhe a tabela de Sorteio ou de Lance Embutido, como nas tabelas da página 2 (lembrado no navegador).
- **Projeções:** só **Parcelas** e **Crédito atualizado**; o gráfico de rentabilidade (venda) saiu.
- **Botões do topo:** **Transmitir proposta** (laranja, principal); abaixo, no tom claro, **Nova proposta** e **Gerar proposta** (a prévia do PDF, que antes era o botão laranja). **Salvar proposta** (.json) saiu.
- **Transmitir proposta (uso interno, backoffice):** abre o formulário do termo de adesão com o resumo da proposta em tela e os dados mínimos do cliente — consorciado (nome, CPF, nascimento, RG, órgão emissor, estado civil, cônjuge quando casado(a) ou em união estável, profissão, renda, celular, e-mail), endereço, cota (grupo, cota, dia de vencimento, pagamento da 1ª parcela), consultor e observações. Campos obrigatórios e formatos são validados (CPF com dígito verificador, e-mail, CEP, celular com DDD, 18 anos ou mais). Ao finalizar, baixa o PDF `Termo_Adesao_<Nome>_<data>.pdf` (tema claro, "Uso interno") e abre a janela de envio ao pós-venda: assunto, texto do e-mail pronto para copiar, **Abrir e-mail** (destinatário em `emailPosVenda`, `js/config.js`) e **Baixar PDF de novo**. O cliente não recebe este documento. Os dados pessoais ficam só na memória da aba; o navegador lembra apenas nome e e-mail do consultor. A lista de campos fica em `CAMPOS_ADESAO` (`js/adesao.js`), para trocar quando a lista definitiva chegar.
- **PDF da proposta:** tema claro (fundo branco, títulos laranja, texto grafite e logo na versão clara); o conteúdo é o mesmo. A página 1 traz até quatro cartões (Sorteio, Lance Embutido, Lance Fixo e Lance Retido).

## 3. Fórmulas

Notação: C = crédito contratado; N = prazo; mC = mês da contemplação; r = redutor; F(m) = fator de reajuste.

| Resultado | Fórmula |
|---|---|
| Fator de reajuste | F(m) = (1 + taxa)^⌊(m − 1) ÷ 12⌋ |
| Crédito atualizado | C × F(m) |
| Fundo comum (parcela integral) | (100% ÷ N) × C × F |
| Fundo comum até a contemplação | (100% ÷ N) × C × F × (1 − r) |
| Parcela com redutor — **HS** | [(100% ÷ N) + (TA% ÷ N) + (FR% ÷ N)] × C × F × (1 − r): o redutor (ex.: meia parcela, 50%) vale para a parcela inteira; as demais administradoras aplicam o redutor só no fundo comum. A diferença é recomposta depois da contemplação nos três componentes |
| Fundo comum após a contemplação | C × F × [1/N + r × mC ÷ (N × (N − mC))] |
| Taxa de administração do mês | (TA% ÷ N) × C × F |
| Fundo de reserva do mês | (FR% ÷ N) × C × F |
| Adesão do mês | (Adesão% × C) ÷ meses de diluição, nos primeiros meses |
| Seguro prestamista do mês | Seguro% × C × F |
| **Parcela total** | Fundo comum + Taxa adm. + Fundo de reserva + Adesão + Seguro |
| Lance (fixo ou livre) | % × C × F(mC) |
| Lance embutido | % embutido × C × F(mC), limitado ao lance |
| Recursos próprios | Lance − Embutido |
| Uso dos recursos informados (v3.2) | FGTS usado = min(FGTS informado, recursos próprios) — só imóvel; dinheiro = recursos próprios − FGTS usado; falta = max(0, dinheiro − recursos próprios informados) |
| Lance Retido (v3.2) | Lance = valor ofertado (R$); % do crédito = valor ÷ (C × F(mC)); em dinheiro = lance − embutido − FGTS usado |
| **Crédito líquido** | C × F(mC) − Embutido |
| Saldo na contemplação | Σ (fundo comum + taxa + fundo de reserva) das parcelas restantes, a valores do mês da contemplação |
| Abatimento por parcela | Parcelas restantes × (1 − Lance ÷ Saldo) |
| Abatimento por prazo | Quita parcelas a partir do fim do plano até consumir o lance; a última pode ficar parcial |
| **Total aportado** | Σ parcelas pagas até mC (inclusive) + Recursos próprios (o embutido não entra) |
| **Valor de venda** | 20% × Crédito líquido |
| **Resultado estimado** | Valor de venda − Total aportado |
| Rentabilidade | Resultado ÷ Total aportado |
| Total de taxas (a.a.) | (Taxa de administração + fundo de reserva) ÷ (prazo ÷ 12) |
| CET da aquisição | TIR mensal dos fluxos do cliente: −parcelas (com reajuste até o fim do plano), + crédito disponível − recursos próprios no mês da contemplação; CET a.a. = (1 + CET a.m.)¹² − 1 |
| Lance embutido (forma própria) | Lance = embutido; recursos próprios = 0 |

---

## 4. Validações e mensagens

| Situação | Nível |
|---|---|
| Nome, crédito, prazo, projeção de contemplação, taxa de administração ou fundo de reserva ausentes | Erro |
| Percentuais fora de 0–100%; prazo ou meses inválidos | Erro |
| Adesão ativada sem percentual ou meses | Erro |
| Seguro ativado sem percentual | Erro |
| IPCA/INCC/INPC/Outro sem taxa estimada (prazo > 12 meses) | Erro — "sem premissa de projeção" |
| Lance ativado sem percentual | Erro |
| "Usar embutido" com lance embutido desativado | Alerta |
| Recursos próprios marcado sem valor (nem FGTS, no imóvel); valores negativos | Erro |
| Recursos próprios insuficientes para o lance | Alerta (mostra quanto falta) |
| FGTS informado com categoria Veículo | Informação (o FGTS não entra no lance) |
| Lance Retido ativado sem valor | Erro |
| Lance Retido acima do crédito; lance acima do saldo devedor na contemplação | Alerta |
| Embutido maior que o lance | Alerta (limitado ao lance) |
| Índice com taxa estimada | Informação — "A projeção usa uma taxa estimada para o índice selecionado." |
| Sempre nos cenários | "Mês de contemplação projetado, sem garantia de ocorrência." · "Resultado estimado: depende das premissas informadas." |

## 5. Premissas adotadas (confirmar com a administradora)

1. Taxa projetada do índice (IPCA, INCC, INPC ou outro) é estimativa do consultor.
2. Seguro prestamista incide sobre o crédito atualizado do mês.
3. Adesão incide sobre o crédito contratado e não é reajustada.
4. Redutor vale até a contemplação; a diferença é diluída nas parcelas restantes.
5. Percentuais de lance incidem sobre o crédito atualizado no mês da contemplação.
6. O lance amortiza fundo comum, taxa de administração e fundo de reserva das parcelas restantes, proporcionalmente (parcela) ou a partir do fim (prazo).
7. Venda a 20% do crédito líquido, sem custos de venda, com as parcelas restantes transferidas ao comprador.

## 6. Limitações

- Valores nominais, sem valor presente.
- A parcela divide o crédito reajustado pelo prazo total, sem recalcular pelo percentual amortizado.
- O mês de contemplação é projeção do consultor e não deriva do valor do lance.
- O valor de venda é uma hipótese fixa, sem referência de mercado.

## 7. Rastreabilidade

- Motor de cálculo puro em `js/calc.js`, testado em `tests/calc.test.js` (`npm test`).
- Cada valor carrega fórmula, números usados e origem.
- As entradas ficam guardadas no navegador, para reabrir a simulação (o antigo **Salvar proposta** em .json saiu na v3.2).
- Regras fixas (reajuste a cada 12 meses, venda de 20%, padrões de 0,038%, 25% e 50%) ficam em `REGRAS`, em `js/calc.js`.
