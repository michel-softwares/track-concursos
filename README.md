# Track Concursos

<p align="center">
  <img src="www/assets/readme/logo-track.png" alt="Track Concursos" width="660">
</p>

<p align="center">
  Aplicativo desktop para organizar estudos para concursos, acompanhar rotina de estudos,
  revisões, simulados e desempenho em um ambiente local.
</p>

<p align="center">
  <a href="#requisitos"><img src="https://img.shields.io/badge/platform-Windows-0A84FF.svg" alt="Windows"></a>
  <a href="#instalacao"><img src="https://img.shields.io/badge/instala%C3%A7%C3%A3o-via%20Release-2ea44f.svg" alt="Instalação via Release"></a>
  <a href="#licenca"><img src="https://img.shields.io/badge/licen%C3%A7a-uso%20pessoal-red.svg" alt="Licença"></a>
</p>

## Visão Geral

O **Track Concursos** foi criado para centralizar a preparação para concursos públicos em um único aplicativo desktop. Nele você pode:

- cadastrar concursos em pré-edital, pós-edital ou realizados
- organizar matérias, tópicos e subtópicos
- montar ciclo de estudos ou cronograma semanal
- registrar horas estudadas, questões, revisões e sessões
- configurar o painel da prova
- lançar simulados com cálculo automático de nota
- acompanhar desempenho geral e por matéria
- usar perfis separados no mesmo computador

<h2 id="instalacao">Instalação</h2>

### Forma recomendada

O jeito recomendado para usar o programa é baixar o instalador `.exe` na área de **Releases** do GitHub.

Passo a passo:

1. Abra a página de **Releases** do repositório.
2. Baixe o arquivo `TrackConcursos-Setup.exe`.
3. Execute o instalador.
4. Siga as etapas do assistente até concluir.
5. Abra o programa pelo atalho criado.

### Primeira execução no Windows

Como a versão atual é distribuída sem assinatura digital paga, o Windows pode exibir um aviso como:

- `O Windows protegeu o computador`
- `Unknown publisher`

Se isso acontecer:

1. Clique em `Mais informações`.
2. Clique em `Executar assim mesmo`.

### Dependência do WebView2

O aplicativo usa o **Microsoft Edge WebView2 Runtime** para renderizar a interface.

Na maioria dos computadores com Windows 10 ou Windows 11, esse componente já está instalado. Se não estiver:

- o instalador pode avisar
- o app também pode avisar ao abrir
- basta instalar o componente oficial da Microsoft e abrir o programa novamente

Download oficial do WebView2 Runtime:

- [Microsoft Edge WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703)

<h2 id="requisitos">Requisitos</h2>

- Windows 10 ou Windows 11
- Microsoft Edge WebView2 Runtime
- Python 3.11 ou superior apenas para a instalação manual

## Instalação Alternativa com Python

Se você não quiser usar o instalador, também é possível rodar o projeto manualmente.

### 1. Instale o Python

Baixe e instale o Python 3.11 ou superior:

- [python.org/downloads](https://www.python.org/downloads/)

Durante a instalação, marque a opção:

- `Add Python to PATH`

### 2. Baixe o projeto

1. Baixe o ZIP do repositório no GitHub.
2. Extraia os arquivos em uma pasta.
3. Abra essa pasta no Terminal.

### 3. Instale a dependência manualmente

```powershell
python -m pip install pywebview
```

### 4. Abra o programa

```powershell
pythonw "Track Concursos.pyw"
```

Ou dê duplo clique em:

- `Track Concursos.pyw`

## Onde os Dados São Salvos

### Quando o programa é instalado pelo `.exe`

Os dados do usuário ficam em:

```text
%LOCALAPPDATA%\Track Concursos
```

Isso inclui:

- perfis
- concursos
- backups
- snapshots
- logos e arquivos auxiliares

### Quando o projeto é rodado manualmente

No modo manual/portátil, os dados podem ficar na própria pasta do projeto, principalmente em:

- `profiles/`
- `backups/`

## Estrutura do Projeto

```text
Track Concursos/
|-- Track Concursos.pyw
|-- track_concursos_app.py
|-- requirements.txt
|-- README.md
|-- LICENSE
|-- www/
|-- profiles/
`-- backups/
```

Arquivos principais:

- `Track Concursos.pyw`: launcher principal sem terminal
- `track_concursos_app.py`: núcleo desktop do aplicativo
- `www/`: interface HTML, CSS e JavaScript
- `profiles/`: dados locais no modo manual/portátil
- `backups/`: backups locais no modo manual/portátil

## Solução de Problemas

### O Windows bloqueou o programa

Isso pode acontecer por falta de assinatura digital.

Faça assim:

1. Clique em `Mais informações`.
2. Clique em `Executar assim mesmo`.

### O navegador não conclui o download do instalador

Alguns navegadores podem interromper o download por reputação baixa do arquivo.

Alternativas:

- baixar novamente e manter o arquivo
- usar a instalação manual com Python
- compartilhar o arquivo diretamente em ambiente de teste fechado

### O app avisou que falta WebView2

Instale o componente oficial da Microsoft:

- [Baixar WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703)

Depois abra o programa novamente.

### `python` não é reconhecido

Reinstale o Python e marque:

- `Add Python to PATH`

### `No module named webview`

Rode:

```powershell
python -m pip install pywebview
```

### A janela abre em branco

Verifique se:

- o WebView2 Runtime está instalado
- a pasta `www/` está presente ao lado dos arquivos do projeto, no modo manual

## Desenvolvimento e Empacotamento

Arquivos auxiliares do processo de build:

- `build_windows.ps1`
- `release_windows.ps1`
- `TrackConcursos.spec`
- `installer/TrackConcursos.iss`
- `requirements-build.txt`

Documentação auxiliar:

- [Empacotamento Windows](docs/empacotamento-windows.md)
- [Assinatura de Código](docs/assinatura-windows.md)
- [Release sem assinatura](docs/release-sem-assinatura.md)

## Apoie o Projeto

O **Track Concursos** é gratuito para uso pessoal.

Se ele foi útil para você, considere apoiar o projeto com uma doação via Pix ou adquirindo um **Edital Premium** feito por mim.

Contato:

- WhatsApp: [falar comigo](https://api.whatsapp.com/send?phone=5589981383459&text=Ol%C3%A1,%20estou%20interessado%20em%20um%20Edital%20Premium%20para%20o%20Track%20Concursos)
- E-mail: `michel.araujo.py@gmail.com`
- Chave Pix: `michelaraujo100@gmail.com`

QR Code Pix:

<p>
  <img src="www/assets/qrcode-pix.png" alt="QR Code Pix" width="300">
</p>

<h2 id="licenca">Licença</h2>

O Track Concursos é disponibilizado gratuitamente para **uso pessoal e não comercial**.

Consulte [LICENSE](LICENSE) para os termos completos.

## Contato e Comunidade

Sugestões, feedbacks, bugs e dúvidas são bem-vindos.

- [Grupo no Telegram](https://t.me/+nlYaAYBFTYs4YTYx)
