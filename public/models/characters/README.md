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
  (caminhada) e `talk` (fala). Sem animação, o modelo fica na pose em que foi
  exportado. A caminhada deve ser "no lugar" (sem deslocar o personagem).
- Compressão **Meshopt**, se quiser comprimir. **Draco não** é suportado.
- Para o navegador: até ~20 mil triângulos e texturas de até 1024 px por
  personagem; o ideal é 1 a 2 MB por arquivo.

Cada arquivo precisa ser registrado em `public/CREDITS.md` (autor, fonte e licença).
