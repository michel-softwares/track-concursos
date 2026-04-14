# Empacotamento Windows

## Diagnostico do projeto

O aplicativo e um desktop em Python com `pywebview`, carregando a interface local em `www/` e persistindo dados em JSON.

Pontos importantes para distribuicao:

- O entrypoint e `Track Concursos.pyw`.
- O nucleo desktop esta em `track_concursos_app.py`.
- A pasta `www/` precisa ir junto no build.
- Em modo instalado, os dados agora ficam em `%LOCALAPPDATA%\Track Concursos`, evitando erro de permissao em `Program Files`.
- Ha migracao automatica de instalacoes antigas portateis para a nova pasta de dados.

## Estrategia recomendada

Use `PyInstaller` em modo `onedir` e empacote o resultado com `Inno Setup`.

Por que `onedir`:

- e mais estavel com `pywebview`
- facilita depuracao
- evita extracao temporaria grande em toda abertura
- reduz chance de falso positivo de antivirus comparado a builds improvisados

## Arquivos adicionados

- `TrackConcursos.spec`: define o build do PyInstaller
- `build_windows.ps1`: cria venv de build e gera `dist/TrackConcursos`
- `installer/TrackConcursos.iss`: gera o instalador

## Como gerar o `.exe`

### 1. Gerar a pasta distribuivel

No PowerShell, na raiz do projeto:

```powershell
.\build_windows.ps1
```

Saida esperada:

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

Saida esperada:

```text
installer\output\TrackConcursos-Setup.exe
```

## Observacoes importantes

- O ambiente `venv/` atual do projeto aponta para um Python 3.7 em `D:\Programas` e esta inconsistente para build.
- O script `build_windows.ps1` ignora esse problema e cria um ambiente limpo em `.build-venv`.
- O runtime do Edge WebView2 costuma ja existir no Windows 11 e em muitas maquinas com Edge atualizado.
- Se quiser distribuicao ainda mais robusta, o proximo passo e acoplar a instalacao do WebView2 Runtime no instalador.

## Fluxo recomendado de release

1. Atualizar a versao no arquivo `installer/TrackConcursos.iss`.
2. Rodar `.\build_windows.ps1 -Clean`.
3. Testar `dist\TrackConcursos\TrackConcursos.exe`.
4. Compilar `installer\TrackConcursos.iss`.
5. Testar o instalador em uma maquina limpa.
