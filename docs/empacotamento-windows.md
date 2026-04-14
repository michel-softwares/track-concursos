# Empacotamento Windows

## Diagnóstico do projeto

O aplicativo é um desktop em Python com `pywebview`, carregando a interface local em `www/` e persistindo dados em JSON.

Pontos importantes para distribuição:

- O entrypoint é [Track Concursos.pyw](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/Track%20Concursos.pyw:1).
- O núcleo desktop está em [track_concursos_app.py](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/track_concursos_app.py:1).
- A pasta `www/` precisa ir junto no build.
- Em modo instalado, os dados agora ficam em `%LOCALAPPDATA%\Track Concursos`, evitando erro de permissão em `Program Files`.
- Há migração automática de instalações antigas portáteis para a nova pasta de dados.

## Estratégia recomendada

Use `PyInstaller` em modo `onedir` e empacote o resultado com `Inno Setup`.

Por que `onedir`:

- é mais estável com `pywebview`
- facilita depuração
- evita extração temporária grande em toda abertura
- reduz chance de falso positivo de antivírus comparado a builds improvisados

## Arquivos adicionados

- [TrackConcursos.spec](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/TrackConcursos.spec:1): define o build do PyInstaller
- [build_windows.ps1](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/build_windows.ps1:1): cria venv de build e gera `dist/TrackConcursos`
- [installer/TrackConcursos.iss](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/installer/TrackConcursos.iss:1): gera o instalador

## Como gerar o `.exe`

### 1. Gerar a pasta distribuível

No PowerShell, na raiz do projeto:

```powershell
.\build_windows.ps1
```

Saída esperada:

```text
dist\TrackConcursos\TrackConcursos.exe
```

### 2. Testar antes de instalar

Abra manualmente:

```powershell
.\dist\TrackConcursos\TrackConcursos.exe
```

Checklist:

- a janela abre sem terminal
- `www/` carrega normalmente
- criar perfil funciona
- salvar concurso funciona
- trocar perfil funciona
- reiniciar o app preserva os dados

### 3. Gerar o instalador

Abra o Inno Setup Compiler e compile:

```text
installer\TrackConcursos.iss
```

Saída esperada:

```text
installer\output\TrackConcursos-Setup.exe
```

## Observações importantes

- O ambiente `venv/` atual do projeto aponta para um Python 3.7 em `D:\Programas` e está inconsistente para build.
- O script `build_windows.ps1` ignora esse problema e cria um ambiente limpo em `.build-venv`.
- O runtime do Edge WebView2 costuma já existir no Windows 11 e em muitas máquinas com Edge atualizado.
- Se quiser distribuição ainda mais robusta, o próximo passo é acoplar a instalação do WebView2 Runtime no instalador.

## Fluxo recomendado de release

1. Atualizar a versão no arquivo `installer/TrackConcursos.iss`.
2. Rodar `.\build_windows.ps1 -Clean`.
3. Testar `dist\TrackConcursos\TrackConcursos.exe`.
4. Compilar `installer\TrackConcursos.iss`.
5. Testar o instalador em uma máquina limpa.
