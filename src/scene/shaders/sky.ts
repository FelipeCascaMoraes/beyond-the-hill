// Céu em gradiente com halo do sol. Sem tone mapping: o horizonte precisa
// bater exatamente com a cor da neblina, que o three aplica no espaço de saída.

export const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const skyFragmentShader = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  // Ruído de tela para evitar banding no gradiente.
  float dither(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  }

  void main() {
    vec3 direction = normalize(vDirection);
    float height = direction.y;

    vec3 color = mix(uHorizonColor, uZenithColor, smoothstep(0.02, 0.55, height));

    float sun = max(dot(direction, uSunDirection), 0.0);
    color += uSunColor * (pow(sun, 6.0) * 0.28 + pow(sun, 48.0) * 0.35 + pow(sun, 600.0) * 0.5);

    color += dither(gl_FragCoord.xy) / 255.0;
    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
  }
`;
