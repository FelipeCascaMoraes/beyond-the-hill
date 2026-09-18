const HILL_CURVE =
  "C 150 345 280 300 400 262 C 470 240 540 246 600 232 C 680 212 720 160 800 152 C 870 146 930 190 1010 250 C 1080 300 1250 330 1440 342";

/** Fundo da tela inicial: gradiente, silhueta da colina, granulação e vinheta. Sem imagens externas. */
export function TitleBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#1b1914_0%,#0b0a08_45%,#050505_100%)]" />

      <div data-title-hill className="invisible absolute inset-0">
        {/* Luz atrás da crista da colina. */}
        <div className="hill-glow absolute inset-x-0 bottom-0 h-[70vh] bg-[radial-gradient(ellipse_50%_45%_at_53%_72%,rgba(201,185,143,0.16),transparent_70%)]" />
        <svg
          className="absolute inset-x-0 bottom-0 h-[42vh] w-full"
          viewBox="0 0 1440 400"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <linearGradient id="title-hill-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#17150f" />
              <stop offset="1" stopColor="#050505" />
            </linearGradient>
          </defs>
          {/* Mesma silhueta da colina 3D (encosta longa, ombro à esquerda, árvore no cume):
              o jogador a reconhece ao despertar. */}
          <path
            d={`M0 400 L0 352 ${HILL_CURVE} L1440 400 Z`}
            fill="url(#title-hill-fill)"
          />
          <path
            d={`M0 352 ${HILL_CURVE}`}
            fill="none"
            stroke="#d8c9a0"
            strokeOpacity="0.12"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <g fill="#17150f">
            <path d="M797 154 L799.2 134 L800.8 134 L803 154 Z" />
            <ellipse cx="800" cy="128" rx="15" ry="7" />
            <ellipse cx="790" cy="132" rx="9" ry="5" />
            <ellipse cx="810" cy="131" rx="9" ry="5" />
          </g>
        </svg>
      </div>

      <div className="film-grain" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}
