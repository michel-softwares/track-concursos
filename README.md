# Track Concursos

> Aplicativo desktop para organizar estudos para concursos com foco em edital, execução diária, métricas e simulados.

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Windows](https://img.shields.io/badge/platform-Windows-0A84FF.svg)](#instalacao)
[![Status](https://img.shields.io/badge/status-beta-6C63FF.svg)](#visao-geral)
[![Licença Proprietária](https://img.shields.io/badge/licen%C3%A7a-uso%20pessoal-red.svg)](LICENSE)

**Track Concursos** é um aplicativo desktop criado para organizar a rotina de estudos para concursos públicos, desde o planejamento do pré-edital até a análise pós-prova, reunindo organização do seu material de estudo particular, execução e acompanhamento de desempenho em uma única experiência local.

## Apoie o projeto

O **Track Concursos** é gratuito para uso pessoal.

Se ele foi útil para você, considere apoiar o projeto com uma doação via Pix ou adquirindo um **Edital Premium** feito por mim, já estruturado para uso dentro do aplicativo.

### Contato

- WhatsApp: [falar comigo](https://api.whatsapp.com/send?phone=5589981383459&text=Ol%C3%A1,%20estou%20interessado%20em%20um%20Edital%20Premium%20para%20o%20Track%20Concursos)
- E-mail: `michel.araujo.py@gmail.com`
- Chave Pix: `michelaraujo100@gmail.com`

QR Code Pix

![QR Code Pix](www/assets/qrcode-pix.png)

---

## Sumário

- [Apoie o projeto](#apoie-o-projeto)
- [Visão Geral](#visao-geral)
- [Por Que Este Projeto Existe](#por-que-este-projeto-existe)
- [Principais Funcionalidades](#principais-funcionalidades)
- [Modelos de Prova Suportados](#modelos-de-prova-suportados)
- [Fluxo de Uso](#fluxo-de-uso)
- [Instalação](#instalacao)
- [Como Abrir o Programa](#como-abrir-o-programa)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Dados e Portabilidade](#dados-e-portabilidade)
- [Licença de Uso](#licenca-de-uso)
- [Sobre o Desenvolvimento](#sobre-o-desenvolvimento)
- [Solução de Problemas](#solucao-de-problemas)

---

## Visão Geral

O Track Concursos foi pensado para quem precisa de algo mais completo do que uma planilha ou checklist genérico. Cada concurso pode ser tratado como um projeto de estudo, com organização do conteúdo, registro da execução, controle de revisões, simulados e análise de desempenho.

Com ele, é possível:

- cadastrar concursos em pré-edital, pós-edital ou realizados
- organizar matérias, tópicos e subtópicos
- montar ciclo de estudos ou cronograma semanal
- registrar horas, questões, revisões e sessões de estudo
- configurar o painel da prova com lógica de correção
- lançar simulados com cálculo automático de nota
- analisar desempenho geral e por matéria
- importar estruturas prontas via Edital Premium
- usar perfis separados no mesmo computador

---

## Por Que Este Projeto Existe

Como um concurseiro, eu sei que a nossa preparação para concursos costuma ficar espalhada entre PDFs, cronômetros, várias planilhas, cadernos e plataformas de questões. O Track Concursos nasceu para reunir essas camadas em um único ambiente organizado, reduzindo a fragmentação e permitindo um acompanhamento mais claro da jornada, acessando aulas e livros com poucos cliques.

Ele centraliza:

- planejamento do edital intelingente e com auxílio de inteligência artificial (PROMPT que organiza automaticamente todo o contéudo programático para você)
- rotina diária de estudo
- registro de horas estudadas e questões, com uma análise profunda de pontos fracos e fortes
- revisões periódicas
- simulados com uma área de análise de dados específica para ele
- histórico de todas as suas conquistas, desde reprovações em concursos até aprovações e a tão sonhada nomeação

---

## Principais Funcionalidades

### 1. Gestão completa por concurso

Cada concurso pode armazenar:

- instituição, banca, cargo e data da prova
- status de pré-edital, pós-edital ou realizado
- matérias, tópicos e subtópicos
- progresso por cobertura de edital
- histórico de aprovação, reprovação e classificação

### 2. Ciclo de estudos e cronograma semanal

O programa suporta dois modelos de planejamento:

- **Ciclo de Estudos**: ideal para rotinas imprevisíveis, com sequência contínua de matérias e metas de tempo
- **Cronograma Semanal**: ideal para quem prefere organizar os estudos por dias fixos

### 3. Cronômetro, pomodoro e lançamentos manuais

O app permite registrar estudo por meio de:

- cronômetro inteligente
- Pomodoro clássico
- cronômetro livre
- lançamentos manuais de horas e questões

### 4. Revisões e progresso por tópico

Ao concluir um tópico, o usuário pode acompanhar:

- revisões atrasadas
- revisões do dia
- revisões futuras
- progresso geral dentro do edital

### 5. Simulados com análise aprofundada

Os simulados podem ser lançados manualmente ou calculados automaticamente a partir do Painel da Prova. A área de Simulados oferece:

- evolução da nota
- comparação com o simulado anterior
- comparação com a média geral
- raio-x por matéria
- análise de maior facilidade e maior dificuldade

### 6. Edital Premium

O programa suporta importação de estruturas prontas em JSON, incluindo:

- matérias
- tópicos e subtópicos
- painel da prova
- simulados vinculados
- configurações estruturais do concurso

### 7. Perfis separados e backups locais

Mais de uma pessoa pode usar o programa no mesmo computador sem misturar:

- concursos
- estatísticas
- backups
- preferências do perfil

---

## Modelos de Prova Suportados

O Painel da Prova suporta atualmente dois formatos principais:

| Modelo | Lógica de cálculo |
|---|---|
| Tradicional por peso | questões x peso por matéria |
| CESPE / CEBRASPE | +1 por acerto, penalidade configurável por erro e 0 para questão em branco |

O painel também pode contemplar:

- conhecimentos gerais
- conhecimentos específicos
- redação

Isso permite que o cálculo dos simulados fique mais fiel ao edital cadastrado pelo usuário. Ao registrar a quantidade de questões e peso previstos no edital do concurso, o cálculo da sua nota é automaticamente mostrado após registrar um simulado feito.

---

## Manual de uso inicial

Um fluxo comum dentro do Track Concursos é:

1. Criar um novo concurso em `Meus Concursos`
2. Cadastrar manualmente ou importar a estrutura do edital através de um EDITAL PREMIUM (feito e distribuído por mim, não tente importar dados de outros usuários pois isso pode corromper seu aplicativo!)
3. Criar e escolher entre ciclo de estudos ou cronograma semanal
4. Configurar o Painel da Prova
5. Linkar seu material de estudo: é possível linkar pdfs diretamente do seu computador, ou da internet, em cada matéria/tópico/subtópico
6. Registrar suas horas estudadas e questões feitas
7. Criar e realizar simulados para acompanhar a evolução geral e por matéria

---

## Instalação

### Pré-requisitos

- Windows 11
- Python 3.11 ou superior
- Instalar os requisitos presentes em requirements.txt que são
pywebview>=4.4.1
pyinstaller>=6.0


### Instalação do Python

Se o Python ainda não estiver instalado:

1. Acesse [python.org/downloads](https://www.python.org/downloads/)
2. Instale o Python
3. Marque a opção `Add Python to PATH`

### Instalação das dependências/requisitos

Abra o terminal na pasta do projeto (na pasta do Track Concursos, clique com o botão direito em uma área vazia em seguida clique em Abrir no Terminal) e rode:

```powershell
pip install -r requirements.txt
```

Se `pip` não funcionar:

```powershell
python -m pip install -r requirements.txt
```

---

## Como Abrir o Programa

Forma recomendada:

- dê duplo clique em `Track Concursos.pyw`

Ou, pelo terminal:

```powershell
pythonw "Track Concursos.pyw"
```

---

## Estrutura do Projeto

```text
Track Concursos/
|-- Track Concursos.pyw
|-- track_concursos_app.py
|-- requirements.txt
|-- README.md
|-- LICENSE
|-- backups/
|-- profiles/
`-- www/
```

| Caminho | Função |
|---|---|
| `Track Concursos.pyw` | launcher principal |
| `track_concursos_app.py` | núcleo desktop do aplicativo |
| `www/` | interface HTML, CSS e JavaScript |
| `profiles/` | perfis locais do usuário |
| `backups/` | backups e snapshots locais |

---

## Dados e Portabilidade

O aplicativo salva os dados LOCALMENTE na própria pasta do projeto. Isso inclui:

- perfis
- concursos
- backups
- configurações auxiliares

Na prática, isso significa que os **dados são portáteis**. Se a pasta completa do programa for levada para outro computador com Python e dependências instalados, a tendência é que o app continue funcionando com os mesmos dados locais.

Importante:

- os **dados** são portáteis
- a **execução** ainda depende de Python e das dependências instaladas na máquina

---

## Licença de Uso

O Track Concursos é disponibilizado gratuitamente para **uso pessoal e não comercial**.

Sem autorização prévia e por escrito do autor, não é permitido:

- modificar o software
- redistribuir versões originais ou alteradas
- vender, revender, sublicenciar ou explorar comercialmente o programa
- comercializar conteúdos premium vinculados ao projeto

Consulte [LICENSE](LICENSE) para os termos completos.

---

## Sobre o Desenvolvimento

Tenho conhecimentos de HTML, CSS, JavaScript e noções de Python. O programa foi desenvolvido por mim com apoio de ferramentas de inteligência artificial, com minha atuação principalmente na revisão, direção do produto e validação das funcionalidades.

Tecnologias utilizadas:

- Linguagens: HTML, CSS, JavaScript e Python
- Claude Sonnet 4.6: utilizado no início do projeto
- Antigraviry Gemini 3 Flash e Gemini 3.1 Pro: utilizados em grande parte do desenvolvimento
- Codex GPT-5.4: utilizado no refatoramento e na finalização do projeto

---

## Solução de Problemas

### `python nao e reconhecido como comando`

- reinstale o Python marcando `Add Python to PATH`

### `No module named webview`

Rode:

```powershell
pip install pywebview
```

### `A janela abre em branco`

- confira se a pasta `www/` está na mesma pasta do programa

### `O launcher .pyw nao abriu`

Tente:

```powershell
pythonw "Track Concursos.pyw"
```

---

## Contato e comunidade

Sugestões, feedbacks e dúvidas são sempre bem-vindos. Também estou disponível para tirar dúvidas e auxiliar sobre o uso do programa no grupo do Telegram.

- [Grupo no Telegram](https://t.me/+nlYaAYBFTYs4YTYx)

Você também pode falar comigo diretamente por:

- WhatsApp: [falar comigo](https://api.whatsapp.com/send?phone=5589981383459&text=Ol%C3%A1,%20estou%20interessado%20em%20um%20Edital%20Premium%20para%20o%20Track%20Concursos)
- E-mail: `michel.araujo.py@gmail.com`

---

Para uso normal, abra sempre `Track Concursos.pyw`.
