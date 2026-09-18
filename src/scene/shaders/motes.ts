// Partículas de luz flutuando devagar (1 draw call, animadas só na GPU).
// Ficam num volume que se repete em volta da câmera: acompanham o jogador sem custo.

export const motesVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  uniform float uRange;
  uniform float uEyeHeight;
  uniform float uPixelRatio;

  attribute float aSeed;

  varying float vAlpha;

  void main() {
    vec3 local = position;
    local.y = mod(local.y + uTime * (0.12 + aSeed * 0.18), uHeight);
    local.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.6;
    local.z += cos(uTime * 0.25 + aSeed * 23.0) * 0.6;

    // Repete o volume em torno da câmera (quadrado de lado 2 * uRange).
    vec2 relative = mod(local.xz - cameraPosition.xz + uRange, 2.0 * uRange) - uRange;
    vec3 world = vec3(cameraPosition.x + relative.x, cameraPosition.y - uEyeHeight + local.y, cameraPosition.z + relative.y);

    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float depth = max(-mvPosition.z, 0.1);
    gl_PointSize = min((1.5 + aSeed * 2.5) * (18.0 / depth), 4.0) * uPixelRatio;

    // Some no chão, no topo e perto da borda do volume (sem "pulos" ao repetir); pisca devagar.
    float edges = smoothstep(0.0, 0.8, local.y) * (1.0 - smoothstep(uHeight - 1.5, uHeight, local.y));
    float fade = 1.0 - smoothstep(uRange * 0.55, uRange * 0.95, length(relative));
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 90.0);
    vAlpha = edges * fade * twinkle;
  }
`;

export const motesFragmentShader = /* glsl */ `
  uniform vec3 uColor;

  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * glow * vAlpha * 0.8, 1.0);

    #include <colorspace_fragment>
  }
`;
