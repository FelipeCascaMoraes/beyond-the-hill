// Feixe de luz (poeira iluminada) atravessando uma abertura. Aditivo, 1 draw call.
// A caixa vai da abertura (along = 0) até o fim do feixe (along = 1).

export const lightBeamVertexShader = /* glsl */ `
  uniform vec3 uSize;

  varying float vAlong;
  varying vec2 vAcross;

  void main() {
    vAlong = position.z / uSize.z + 0.5;
    vAcross = position.xy / (uSize.xy * 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const lightBeamFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying float vAlong;
  varying vec2 vAcross;

  void main() {
    float edges = smoothstep(1.0, 0.55, abs(vAcross.x)) * smoothstep(1.0, 0.55, abs(vAcross.y));
    float falloff = smoothstep(0.0, 0.06, vAlong) * pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.4);
    gl_FragColor = vec4(uColor * uIntensity * edges * falloff, 1.0);

    #include <colorspace_fragment>
  }
`;
