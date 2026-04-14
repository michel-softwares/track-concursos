# Release sem assinatura

## Situação atual

O projeto pode ser distribuído normalmente sem assinatura digital.

O impacto principal é que o Windows pode exibir alertas de reputação e editor desconhecido.

## Como publicar no GitHub Releases

Anexe estes arquivos:

- [installer/output/TrackConcursos-Setup.exe](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/installer/output/TrackConcursos-Setup.exe)
- [installer/output/TrackConcursos-Setup.exe.sha256.txt](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/installer/output/TrackConcursos-Setup.exe.sha256.txt)
- [RELEASE_NOTES_v1.0.0.md](/C:/Users/miche/Desktop/Track%20Concursos%20Beta/RELEASE_NOTES_v1.0.0.md)

## Texto recomendado para a release

Use o conteúdo de `RELEASE_NOTES_v1.0.0.md` como base da publicação.

## Como reduzir desconfiança mesmo sem assinatura

- manter o código-fonte público
- publicar o checksum SHA-256
- publicar screenshots do programa
- usar instalador em vez de pasta solta
- manter nome, versão e publisher consistentes
- explicar no release que o aviso do Windows é esperado por falta de assinatura paga
