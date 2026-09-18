// Grama instanciada: uma única geometria de folha repetida na GPU (1 draw call).
// Vento e curvatura no vertex shader; translucidez contra o sol no fragment.

export const grassVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uWindDirection;

  attribute vec3 aOffset;  // base da folha no mundo (y já na altura do terreno)
  attribute vec4 aParams;  // yaw, altura, largura, aleatório

  varying float vHeight;
  varying float vRandom;
  varying vec3 vWorldPosition;

  #include <common>
  #include <fog_pars_vertex>

  void main() {
    float t = position.y;
    float yaw = aParams.x;
    float bladeHeight = aParams.y;
    float random = aParams.w;

    vec3 local = vec3(position.x * aParams.z, t * bladeHeight, 0.0);
    float c = cos(yaw);
    float s = sin(yaw);
    local = vec3(local.x * c, local.y, local.x * s);

    vec3 world = aOffset + local;

    // Vento: ondas largas lentas + tremor curto, mais forte na ponta.
    float wave = sin(uTime * 0.9 + world.x * 0.08 + world.z * 0.05);
    float gust = sin(uTime * 0.35 + world.x * 0.02 - world.z * 0.03) * 0.5 + 0.5;
    float flutter = sin(uTime * 2.7 + random * 6.2831 + world.x * 0.6) * 0.15;
    float bend = t * t * bladeHeight;
    float strength = 0.18 + 0.32 * gust * (0.6 + 0.4 * wave) + flutter;
    world.xz += uWindDirection * strength * bend;
    world.y -= bend * strength * 0.25;

    vHeight = t;
    vRandom = random;
    vWorldPosition = world;

    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

export const grassFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  varying float vHeight;
  varying float vRandom;
  varying vec3 vWorldPosition;

  #include <common>
  #include <fog_pars_fragment>

  void main() {
    vec3 color = mix(uBaseColor, uTipColor, smoothstep(0.0, 1.0, vHeight));
    color *= 0.75 + vRandom * 0.4;

    // Contraluz: pontas acendem quando o olhar vai na direção do sol.
    vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
    float backlight = pow(max(dot(viewDirection, uSunDirection), 0.0), 3.0);
    color += uSunColor * backlight * vHeight * vHeight * 0.3;

    // Oclusão na base.
    color *= mix(0.35, 1.0, vHeight);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;
