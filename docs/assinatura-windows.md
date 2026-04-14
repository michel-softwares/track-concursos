# Assinatura de codigo no Windows

## O que ja ficou pronto no projeto

O projeto agora tem um fluxo de release em:

- `release_windows.ps1`

Esse script:

- gera o build do app
- compila o instalador
- localiza o `signtool.exe`
- assina `TrackConcursos.exe`
- assina `TrackConcursos-Setup.exe`

## Como assinar

### Opcao 1: certificado no repositorio de certificados do Windows

```powershell
.\release_windows.ps1 -Sign -CertThumbprint "SEU_THUMBPRINT"
```

### Opcao 2: certificado `.pfx`

```powershell
.\release_windows.ps1 -Sign -PfxPath "C:\caminho\certificado.pfx" -PfxPassword "SUA_SENHA"
```

## Observacao importante

Assinar tecnicamente nao e o mesmo que ter confianca publica.

- Certificado de teste ou autoassinado: serve para validar o pipeline de assinatura, mas o Windows ainda pode mostrar editor nao confiavel.
- Certificado de code signing emitido por autoridade certificadora: e o caminho correto para distribuicao publica.
- Certificado EV code signing: tende a oferecer melhor reputacao inicial no SmartScreen.

## Comando sem assinatura

```powershell
.\release_windows.ps1
```

## Com limpeza total

```powershell
.\release_windows.ps1 -Clean
```

## Recomendacao pratica

Se a ideia e distribuir para usuarios finais sem alertas fortes do Windows, o proximo passo real e obter um certificado de code signing OV ou EV e plugar no script acima.
