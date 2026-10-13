# Modelos dos personagens

O jogo procura estes arquivos, com exatamente estes nomes:

| Arquivo | Personagem | Altura no jogo |
|---|---|---|
| `aysha.glb` | Aysha | 1,70 m |
| `cassandra.glb` | Cassandra | 1,76 m (com o coque) |
| `victor.glb` | Victor | 1,96 m (com o chapéu) |

Basta colocar o arquivo aqui e recarregar a página: o personagem troca a figura
provisória pelo modelo. Enquanto um arquivo faltar, nada quebra — ele continua
com a figura provisória.

## O que cada arquivo precisa ter

- Formato **GLB** (glTF binário), com as texturas dentro do arquivo.
- O personagem **de pé, virado para +Z** (o padrão do glTF). A escala e a
  posição da origem não importam: o jogo mede o modelo e o ajusta à altura da
  tabela, com os pés no chão. Se vier virado, há um ajuste em
  `src/content/characterModels.ts` (`rotationY`).
- **Esqueleto e animações dentro do mesmo arquivo**, se houver. O jogo
  reconhece os clipes pelo nome: um que contenha `idle` (parado), `walk`
  (caminhada), `run` (corrida) e `talk` (fala). Sem animação, o modelo fica na
  pose em que foi exportado. A caminhada e a corrida devem ser "no lugar" (sem
  deslocar o personagem).
- Compressão **Meshopt**, se quiser comprimir. **Draco não** é suportado.
- Para o navegador: até ~20 mil triângulos e texturas de até 1024 px por
  personagem; o ideal é 1 a 2 MB por arquivo.

## A Aysha

`aysha.glb` não é copiado para cá à mão: é montado a partir do arquivo exportado
(`scripts/models/aysha.source.glb`), que vem deitado, com os ossos fora das
juntas e sem animação. Para refazer depois de trocar o arquivo de origem:

```
node scripts/models/build-aysha.mjs
```

## A Cassandra e o Victor

`cassandra.glb` e `victor.glb` não vêm de arquivo nenhum: o corpo, o rosto e a
roupa dos dois são modelados por `scripts/models/build-figure.mjs`, anel por
anel. Para mudar uma proporção, uma cor ou um traço do rosto, mexe-se nos
números do script. Não têm esqueleto: os dois esperam de pé. Para refazer:

```
node scripts/models/build-figure.mjs cassandra
node scripts/models/build-figure.mjs victor
```

Cada arquivo precisa ser registrado em `public/CREDITS.md` (autor, fonte e licença).
