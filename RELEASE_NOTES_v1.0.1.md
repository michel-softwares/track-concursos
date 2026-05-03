# Track Concursos v1.0.1

Essa atualização é focada em produtividade real dentro do app: sistema de Flashcards integrados ao edital, melhorias no ciclo de estudos, métricas mais claras, revisões mais confiáveis, melhorias de conforto e vários bugs corrigidos.

## Principais novidades

### Flashcards integrados ao edital

- Nova **área** de Flashcards **acessível** pelo menu lateral do Track.
- **Criação** automática de baralhos por **matéria**, **tópico** e **subtópico**, usando a **própria** estrutura do edital.
- Estudo por baralho com cards do tipo `Flip` e `Questões Comentadas`.
- Sistema SRS simples para organizar **revisões** dos Flashcards.
- **Estatísticas** próprias de Flashcards: total de cards, pendentes, novos do dia, streak, acerto do dia e atividade recente.
- Botão `Sincronizar` para linkar flashcards de um baralho ao seu respectivo **tópico/subtópico** do edital, permitindo um link direto para o baralho através da aba da matéria.
- Link interno direto para baralhos usando `dashboard.html#flashcards:<deckId>`.

### Importação e exportação de Flashcards

- O sistema de FLASHCARDS do Track foi criado para ser facilmente compatível com Questões Comentadas (Quizzes) e flashcards (cards) criados pelo NotebookLM. Utilizem a extensão para navegador NotebookLM Quiz Exporter para exportar facilmente Quizzes e Cards em .CSV ou .JSON compatíveis com o Track Concursos
- **Importação** de Flashcards por JSON e CSV no mesmo fluxo.
- Compatibilidade com CSV simples: frente/pergunta na primeira coluna e verso/resposta na segunda.
- Compatibilidade com CSV com **cabeçalho**, incluindo campos como `frente`, `verso`, `tipo`, `gabarito`, `alternativas`, **explicação** e `tags`.
- Compatibilidade com CSV de questões comentadas no **padrão** `Question`, `Hint`, `Option A‑E`, `Correct Answer` e `Rationale`.
- Compatibilidade com arquivos do Anki em CSV, TSV e TXT, incluindo linhas de metadados como `#separator`, `#html`, `#deck`, `#tags` e `#columns`.
- **Importação** JSON de questões comentadas com `question`, `hint`, `options`, `correctAnswer` e **comentários** por alternativa.
- **Exportação** de Flashcards para JSON e CSV com janela nativa para o usuário escolher pasta e nome do arquivo.

### Editor rico de Flashcards

- Editor com negrito, **itálico**, sublinhado, riscado, listas, links, imagens e limpeza de **formatação**.
- Suporte a upload/colar imagem em base64 dentro dos cards.
- Editor de `Questões Comentadas` com campos separados para enunciado, alternativas e **comentários** individuais por alternativa.
- Gabarito escolhido diretamente na alternativa marcada como `Correta`.
- Banco de **símbolos** matemáticos no editor e nos campos de alternativas.

## Melhorias de estudo

### Questões comentadas mais completas

- A tela de estudo agora exige selecionar uma alternativa antes de mostrar o feedback.
- A alternativa correta fica destacada em verde.
- A alternativa errada escolhida fica destacada em vermelho.
- Comentários por alternativa aparecem dentro da própria alternativa quando o arquivo importado trouxer essas justificativas.
- Quando existir apenas um `Rationale` geral, ele aparece como comentário da alternativa correta.
- A dica importada do CSV/JSON fica protegida atrás do botão `Mostrar dica`, evitando spoiler antes da resposta.
- Textos longos agora expandem a página naturalmente, sem cortar enunciados, alternativas ou explicações.
- Cards comuns do tipo `Flip` preservam o efeito de virar.
### Ciclo de estudos

- O card `Carga estudada / Meta do ciclo` agora abre um comparativo por matéria.
- Cada matéria mostra meta planejada, tempo estudado e saldo em relação à meta.
- Matérias pendentes aparecem em cinza com `faltam X`.
- Matérias finalizadas manualmente abaixo da meta aparecem com saldo negativo em vermelho.
- O ciclo não reinicia automaticamente ao terminar.
- Novo botão `Reiniciar ciclo` para iniciar a próxima rodada apenas quando o usuário quiser.
### Métricas e dashboard

- Dashboard semanal reorganizado com gráficos doughnut para horas estudadas por matéria e questões certas/erradas.
- Semana fixa de domingo a sábado, com intervalo exibido no card.
- Faixa de dias `DOM` a `SAB`, diferenciando dias com atividade, sem atividade e dias futuros.
- Tempos exibidos em formato amigável, como `42min`, `1h1m` e `1h20m`, evitando horas decimais.
- Aba `Métricas` recebeu painel `Estudos do dia`, com horas por matéria, questões certas/erradas e sessões do dia.
- Botão discreto de print/compartilhamento do painel com logos do Track Concursos e Michel Softwares.
- Calendário de horas estudadas ajustado para paleta verde com contraste automático.

## Revisões e navegação

### Revisões de tópicos e sub‑tópicos

- Revisões de sub‑tópicos estudados agora aparecem corretamente nas telas.
- Compatibilidade com registros antigos em que revisões de sub‑tópico foram gravadas no campo de tópico.
- Dashboard, aba da matéria, aba `Revisões` e badges laterais passaram a considerar revisões por tópico e sub‑tópico.
- Exclusões e zeramentos removem também revisões vinculadas a sub‑tópicos, evitando itens órfãos.
- Aba `Revisões` ganhou exclusão manual de revisões.

### Navegação interna mais confortável

- O botão lateral de voltar do mouse e o histórico do WebView agora priorizam ações internas antes de trocar de página.
- O app tenta fechar popup, modal, menu contextual, estudo ativo, detalhe de baralho, aba Flashcards, sub‑tópico aberto e tópico aberto antes de navegar para outra tela.
- Isso reduz saídas acidentais da dashboard ao tentar apenas fechar uma camada aberta.

## Atualizacao e seguranca do projeto

### Verificador de versao

- O app agora mostra `v1.0.1` abaixo do logo.
- Checagem de nova versao pela release mais recente do GitHub: `michel-softwares/track-concursos`.
- Consulta cacheada em `localStorage`, no maximo uma vez por dia.
- Falhas de internet ou GitHub ficam silenciosas e nao travam o app.
- O usuario pode ignorar temporariamente uma versao; o aviso volta quando surgir uma tag diferente.


## Compatibilidade de dados

- Os dados do usuario continuam fora da pasta do programa, em `%LOCALAPPDATA%\Track Concursos`.
- Profiles, backups, snapshots e logos do usuario nao sao apagados pelo instalador.
- A atualizacao de `1.0.0` para `1.0.1` foi validada com simulacao de perfil avancado antigo.
- A simulacao preservou concursos, materias, topicos, subtopicos, sessoes, questoes, simulados, revisoes, cronometro, logos e metadados do perfil.
- A limpeza de snapshots afeta somente arquivos `.json` dentro de `profiles/<perfil>/snapshots`.
- `profile.json`, `manifest.json`, logos e backups externos nao sao alterados por essa rotina.
