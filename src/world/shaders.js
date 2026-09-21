import * as THREE from "three";

// Shared hand-written shader pipeline for the museum.  Three.js still owns
// geometry, cameras, textures and skinning; all visible opaque surfaces use
// the GLSL below instead of one of Three's built-in surface materials.

const vertexShader = /* glsl */`
  #include <common>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <fog_pars_vertex>

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;

    vec3 objectNormal = normal;
    #include <morphinstance_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>

    vec3 transformed = position;
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const surfaceFragment = /* glsl */`
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform sampler2D uDetailMap;
  uniform float uUseMap;
  uniform float uUseDetail;
  uniform float uRoughness;
  uniform float uMetalness;
  uniform float uOpacity;
  uniform float uDetailStrength;
  uniform vec3 uKeyDirection;
  uniform vec3 uFillDirection;
  uniform vec3 uKeyColor;
  uniform vec3 uFillColor;
  uniform float uSpotEnabled;
  uniform vec3 uSpotPositionA;
  uniform vec3 uSpotTargetA;
  uniform vec3 uSpotColorA;
  uniform float uSpotStrengthA;
  uniform vec3 uSpotPositionB;
  uniform vec3 uSpotTargetB;
  uniform vec3 uSpotColorB;
  uniform float uSpotStrengthB;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  #include <common>
  #include <fog_pars_fragment>

  void main() {
    vec4 texel = vec4(1.0);
    if (uUseMap > 0.5) texel = sRGBTransferEOTF(texture2D(uMap, vUv));
    vec3 albedo = uColor * texel.rgb;

    // Stone uses its granular map as actual shader-driven surface variation.
    if (uUseDetail > 0.5) {
      float grain = texture2D(uDetailMap, vUv * 3.0).r - 0.5;
      albedo *= 1.0 + grain * uDetailStrength;
    }

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L1 = normalize(uKeyDirection);
    vec3 L2 = normalize(uFillDirection);
    float n1 = max(dot(N, L1), 0.0);
    float n2 = max(dot(N, L2), 0.0);
    vec3 H = normalize(L1 + V);

    float gloss = mix(90.0, 7.0, clamp(uRoughness, 0.0, 1.0));
    float specular = pow(max(dot(N, H), 0.0), gloss);
    vec3 f0 = mix(vec3(0.04), albedo, uMetalness);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 5.0);

    vec3 diffuse = albedo * (0.28 + uKeyColor * n1 * 0.72 + uFillColor * n2 * 0.28);
    // Leave headroom on the monument so a passing spotlight reads as light,
    // rather than adding more white to stone that is already fully lit.
    diffuse *= mix(1.0, 0.72, uSpotEnabled);
    diffuse *= 1.0 - uMetalness * 0.55;
    vec3 reflectionTint = mix(vec3(0.30, 0.38, 0.52), vec3(1.0, 0.78, 0.38),
      clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
    vec3 color = diffuse + f0 * specular * (1.2 - uRoughness)
      + reflectionTint * f0 * (0.08 + 0.32 * fresnel) * uMetalness;

    // Two moving, uniform-driven spotlights used by the statue.  Keeping
    // this calculation in our GLSL means the animated beams remain visible
    // even though the stone no longer uses MeshStandardMaterial.
    if (uSpotEnabled > 0.5) {
      vec3 toA = uSpotPositionA - vWorldPosition;
      vec3 toB = uSpotPositionB - vWorldPosition;
      float distA = length(toA);
      float distB = length(toB);
      vec3 LA = toA / max(distA, 0.001);
      vec3 LB = toB / max(distB, 0.001);
      vec3 beamA = normalize(uSpotTargetA - uSpotPositionA);
      vec3 beamB = normalize(uSpotTargetB - uSpotPositionB);
      float coneA = smoothstep(0.955, 0.99, dot(normalize(vWorldPosition - uSpotPositionA), beamA));
      float coneB = smoothstep(0.91, 0.975, dot(normalize(vWorldPosition - uSpotPositionB), beamB));
      float focusA = 1.0 - smoothstep(0.24, 1.12, distance(vWorldPosition, uSpotTargetA));
      float focusB = 1.0 - smoothstep(0.45, 1.50, distance(vWorldPosition, uSpotTargetB));
      float attenA = 1.0 / (1.0 + 0.055 * distA * distA);
      float attenB = 1.0 / (1.0 + 0.060 * distB * distB);
      float litA = max(dot(N, LA), 0.0) * coneA * focusA * attenA * uSpotStrengthA;
      float litB = max(dot(N, LB), 0.0) * coneB * focusB * attenB * uSpotStrengthB;
      float shineA = pow(max(dot(N, normalize(LA + V)), 0.0), 18.0) * coneA * focusA * attenA;
      float shineB = pow(max(dot(N, normalize(LB + V)), 0.0), 14.0) * coneB * focusB * attenB;
      color += albedo * (uSpotColorA * litA + uSpotColorB * litB);
      color += uSpotColorA * shineA * uSpotStrengthA * 0.35;
      color += uSpotColorB * shineB * uSpotStrengthB * 0.25;
    }

    gl_FragColor = vec4(color, texel.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function commonUniforms(options = {}) {
  return {
    // ShaderMaterial does not merge Three's fog uniforms automatically.
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 1 },
    fogFar: { value: 1000 },
    uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
    uMap: { value: options.map ?? null },
    uDetailMap: { value: options.detailMap ?? null },
    uUseMap: { value: options.map ? 1 : 0 },
    uUseDetail: { value: options.detailMap ? 1 : 0 },
    uRoughness: { value: options.roughness ?? options.rough ?? 0.65 },
    uMetalness: { value: options.metalness ?? 0 },
    uOpacity: { value: options.opacity ?? 1 },
    uDetailStrength: { value: options.detailStrength ?? 0.22 },
    uKeyDirection: { value: new THREE.Vector3(-0.35, 0.82, 0.45).normalize() },
    uFillDirection: { value: new THREE.Vector3(0.65, 0.35, -0.55).normalize() },
    uKeyColor: { value: new THREE.Color(1.0, 0.93, 0.80) },
    uFillColor: { value: new THREE.Color(0.48, 0.62, 0.90) },
    uSpotEnabled: { value: 0 },
    uSpotPositionA: { value: new THREE.Vector3() },
    uSpotTargetA: { value: new THREE.Vector3() },
    uSpotColorA: { value: new THREE.Color(1, 0.92, 0.76) },
    uSpotStrengthA: { value: 0 },
    uSpotPositionB: { value: new THREE.Vector3() },
    uSpotTargetB: { value: new THREE.Vector3() },
    uSpotColorB: { value: new THREE.Color(0.55, 0.70, 1) },
    uSpotStrengthB: { value: 0 },
  };
}

export function createSurfaceMaterial(options = {}) {
  const material = new THREE.ShaderMaterial({
    name: options.name ?? "GallerySurfaceShader",
    uniforms: commonUniforms(options),
    vertexShader,
    fragmentShader: surfaceFragment,
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? (options.opacity ?? 1) < 1,
    depthWrite: options.depthWrite ?? (options.opacity ?? 1) >= 1,
    fog: true,
  });
  return material;
}

export function createMetalMaterial(options = {}) {
  return createSurfaceMaterial({
    roughness: 0.25,
    metalness: 0.92,
    ...options,
    name: options.name ?? "MuseumMetalShader",
  });
}

export function createStoneMaterial(options = {}) {
  return createSurfaceMaterial({
    roughness: 0.84,
    metalness: 0.02,
    detailStrength: 0.28,
    ...options,
    name: options.name ?? "StoneStatueShader",
  });
}

// A faint, additive light shaft makes the moving statue spotlight readable
// in a bright gallery. This is presentation geometry, not a replacement for
// the actual light calculated on the stone surface above.
export function createSpotlightBeamMaterial(color) {
  return new THREE.ShaderMaterial({
    name: "SpotlightBeamShader",
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */`
      varying vec2 vBeamUv;
      void main() {
        vBeamUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying vec2 vBeamUv;
      void main() {
        float tipFade = 1.0 - smoothstep(0.65, 0.98, vBeamUv.y);
        float baseFade = smoothstep(0.0, 0.28, vBeamUv.y);
        float edgeFade = pow(1.0 - abs(vBeamUv.x * 2.0 - 1.0), 0.65);
        float alpha = 0.065 * tipFade * baseFade * edgeFade;
        gl_FragColor = vec4(uColor * 0.35, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createPaintingBlendMaterial(oldMap, newMap) {
  const uniforms = commonUniforms({ roughness: 0.72 });
  uniforms.uOldMap = { value: oldMap };
  uniforms.uNewMap = { value: newMap };
  uniforms.uBlend = { value: 0 };
  const fragmentShader = surfaceFragment
    .replace("uniform sampler2D uMap;", "uniform sampler2D uMap;\nuniform sampler2D uOldMap;\nuniform sampler2D uNewMap;\nuniform float uBlend;")
    .replace("if (uUseMap > 0.5) texel = sRGBTransferEOTF(texture2D(uMap, vUv));",
      "texel = sRGBTransferEOTF(mix(texture2D(uOldMap, vUv), texture2D(uNewMap, vUv), smoothstep(0.0, 1.0, uBlend)));");
  return new THREE.ShaderMaterial({
    name: "PaintingBlendShader", uniforms, vertexShader, fragmentShader, fog: true,
  });
}

export function createClothMaterial(map, seed, timeUniform) {
  const uniforms = commonUniforms({ map, roughness: 0.82 });
  uniforms.uTime = timeUniform;
  uniforms.uSeed = { value: seed };
  const clothVertex = vertexShader
    .replace("#include <fog_pars_vertex>", "#include <fog_pars_vertex>\nuniform float uTime;\nuniform float uSeed;")
    .replace("vec3 objectNormal = normal;", `
      float slack = pow(1.0 - uv.y, 1.35);
      float edge = 0.45 + 0.55 * abs(uv.x - 0.5) * 2.0;
      float a = uv.x * 7.0 + uv.y * 2.2 - uTime * 1.7 + uSeed;
      float b = uv.x * 3.1 - uv.y * 4.0 + uTime * 1.15 + uSeed * 1.7;
      float wave = (sin(a) * 0.42 + sin(b) * 0.58) * slack * edge * 0.12;
      float dx = (cos(a) * 7.0 * 0.42 + cos(b) * 3.1 * 0.58) * slack * edge * 0.12;
      float dy = (cos(a) * 2.2 * 0.42 - cos(b) * 4.0 * 0.58) * slack * edge * 0.12;
      vec3 objectNormal = normalize(vec3(-dx, -dy, 1.0));`)
    .replace("vec3 transformed = position;", "vec3 transformed = position; transformed.z += wave; transformed.y -= abs(wave) * 0.25 * pow(1.0 - uv.y, 2.0);");
  return new THREE.ShaderMaterial({
    name: "AnimatedClothShader", uniforms, vertexShader: clothVertex,
    fragmentShader: surfaceFragment, side: THREE.DoubleSide, fog: true,
  });
}
