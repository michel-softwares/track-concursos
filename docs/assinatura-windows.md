# Assinatura de código no Windows

## O que já ficou pronto no projeto

O projeto agora tem um fluxo de release em:

- [release_windows.ps1](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/release_windows.ps1:1)

Esse script:

- gera o build do app
- compila o instalador
- localiza o `signtool.exe`
- assina `TrackConcursos.exe`
- assina `TrackConcursos-Setup.exe`

## Como assinar

### Opção 1: certificado no repositório de certificados do Windows

```powershell
.\release_windows.ps1 -Sign -CertThumbprint "SEU_THUMBPRINT"
```

### Opção 2: certificado `.pfx`

```powershell
.\release_windows.ps1 -Sign -PfxPath "C:\caminho\certificado.pfx" -PfxPassword "SUA_SENHA"
```

## Observação importante

Assinar tecnicamente não é o mesmo que ter confiança pública.

- Certificado de teste ou autoassinado: serve para validar o pipeline de assinatura, mas o Windows ainda pode mostrar editor não confiável.
- Certificado de code signing emitido por autoridade certificadora: é o caminho correto para distribuição pública.
- Certificado EV code signing: tende a oferecer melhor reputação inicial no SmartScreen.

## Comando sem assinatura

```powershell
.\release_windows.ps1
```

## Com limpeza total

```powershell
.\release_windows.ps1 -Clean
```

## Recomendação prática

Se a ideia é distribuir para usuários finais sem alertas fortes do Windows, o próximo passo real é obter um certificado de code signing OV ou EV e plugar no script acima.
