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
          <path
            d="M0 400 L0 330 C 260 322 500 150 760 126 C 990 108 1170 250 1440 298 L1440 400 Z"
            fill="url(#title-hill-fill)"
          />
          <path
            d="M0 330 C 260 322 500 150 760 126 C 990 108 1170 250 1440 298"
            fill="none"
            stroke="#d8c9a0"
            strokeOpacity="0.12"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="film-grain" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}
