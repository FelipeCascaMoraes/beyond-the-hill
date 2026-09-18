import { ShaderChunk } from "three";
import { atmosphere } from "@/game/config/render";

// Neblina por altura: densa rente ao chão, mais rala no alto.
// Substitui os trechos de neblina do three uma única vez, antes de qualquer
// shader compilar; vale para os materiais padrão e para os nossos ShaderMaterials.
// Custo: algumas operações a mais por vértice/pixel, nenhum draw call extra.

const float = (value: number) => value.toFixed(5);

let installed = false;

export function installHeightFog(): void {
  if (installed) return;
  installed = true;

  ShaderChunk.fog_pars_vertex = /* glsl */ `
    #ifdef USE_FOG
      varying float vFogDepth;
      varying float vFogWorldY;
    #endif
  `;

  // Altura no mundo a partir da posição na câmera (inversa da rotação = transposta).
  ShaderChunk.fog_vertex = /* glsl */ `
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      vFogWorldY = ( transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) ).y;
    #endif
  `;

  ShaderChunk.fog_pars_fragment = /* glsl */ `
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying float vFogWorldY;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
      const float FOG_HEIGHT_FALLOFF = ${float(atmosphere.fogHeightFalloff)};
      const float FOG_MIN_FACTOR = ${float(atmosphere.fogMinFactor)};
    #endif
  `;

  // Usa a altura média do raio câmera→ponto: o cume fica nítido, a base some na névoa.
  ShaderChunk.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogRayHeight = max( 0.5 * ( vFogWorldY + cameraPosition.y ), 0.0 );
        float fogHeightDensity = fogDensity * mix( FOG_MIN_FACTOR, 1.0, exp( - fogRayHeight * FOG_HEIGHT_FALLOFF ) );
        float fogFactor = 1.0 - exp( - fogHeightDensity * fogHeightDensity * vFogDepth * vFogDepth );
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif
  `;
}
