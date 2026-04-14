# Track Concursos v1.0.0

## Download

- Instalador: `TrackConcursos-Setup.exe`
- Checksum SHA-256: `TrackConcursos-Setup.exe.sha256.txt`

## O que mudou nesta release

- instalador `.exe` para Windows
- executável desktop empacotado com `PyInstaller`
- dados do usuário em `%LOCALAPPDATA%\Track Concursos`
- migração automática de instalações portáteis antigas
- detecção de ausência do WebView2 com orientação para instalação
- melhorias na confiabilidade do primeiro uso

## Aviso importante sobre o Windows

Esta versão está sendo distribuída sem assinatura digital paga.

Por isso, o Windows pode mostrar aviso como:

- `Unknown publisher`
- `O Windows protegeu o computador`

Se isso acontecer:

1. Clique em `Mais informações`
2. Clique em `Executar assim mesmo`

## Verificação de integridade

SHA-256 do instalador:

```text
6A4D97A6EE04F386EC8A86894A8F141EB51B7E0E78BD2D88083FFEC504EF746C
```

## Requisitos

- Windows 10 ou Windows 11
- Microsoft Edge WebView2 Runtime

Se o WebView2 não estiver instalado, o próprio app e o instalador exibem a orientação de download.
