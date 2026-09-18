// Partículas de luz flutuando devagar (1 draw call, animadas só na GPU).

export const motesVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  uniform float uPixelRatio;

  attribute float aSeed;

  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.12 + aSeed * 0.18), uHeight);
    p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.6;
    p.z += cos(uTime * 0.25 + aSeed * 23.0) * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float distance = -mvPosition.z;
    gl_PointSize = min((1.5 + aSeed * 2.5) * (18.0 / distance), 4.0) * uPixelRatio;

    // Some no chão, no topo e ao longe; pisca devagar.
    float edges = smoothstep(0.0, 0.8, p.y) * (1.0 - smoothstep(uHeight - 1.5, uHeight, p.y));
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 90.0);
    vAlpha = edges * twinkle * (1.0 - smoothstep(20.0, 45.0, distance));
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
