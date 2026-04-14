# Release sem assinatura

## Situacao atual

O projeto pode ser distribuido normalmente sem assinatura digital.

O impacto principal e que o Windows pode exibir alertas de reputacao e editor desconhecido.

## Como publicar no GitHub Releases

Anexe estes arquivos:

- `installer/output/TrackConcursos-Setup.exe`
- `installer/output/TrackConcursos-Setup.exe.sha256.txt`
- `RELEASE_NOTES_v1.0.0.md`

## Texto recomendado para a release

Use o conteudo de `RELEASE_NOTES_v1.0.0.md` como base da publicacao.

## Como reduzir desconfianca mesmo sem assinatura

- manter o codigo-fonte publico
- publicar o checksum SHA-256
- publicar screenshots do programa
- usar instalador em vez de pasta solta
- manter nome, versao e publisher consistentes
- explicar no release que o aviso do Windows e esperado por falta de assinatura paga
