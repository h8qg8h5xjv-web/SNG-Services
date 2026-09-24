// Night London made of windows (DEMO_MAP §7). Every amber, arched window is one
// of today's real free windows (lib/slots/windows.ts); rectangular bluish ones
// are just homes. Bloom on slot windows, the Thames with a planar reflection,
// fog, far skyline layers, landmarks. Paused off-screen, on other routes and in
// hidden tabs; three quality tiers with a frame-time governor; reduced motion
// renders single static frames, fully lit. Loaded lazily, home page only.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'

export type CityTier = 'high' | 'mid' | 'phone'
export type CitySlot = { id: string; cat: string | null; free: boolean }
export type CityHover = { id: string; x: number; y: number }
export type CityRect = { x: number; y: number; w: number; h: number }

export type CityOptions = {
  canvas: HTMLCanvasElement
  reduce: boolean
  tier: CityTier
  fine: boolean
  paneH: number
  onCount?: (n: number) => void
  onHover?: (h: CityHover | null) => void
  onPick?: (id: string) => void
}

export type CityApi = {
  sync(list: CitySlot[]): void
  setFirst(id: string | null): void
  setEmphasis(cats: string[] | null): void
  book(id: string): void
  unbook(id: string): void
  setFly(p: number): void
  setDetached(v: boolean): void
  targetRect(): CityRect | null
  resize(): void
  pause(): void
  resume(): void
  dispose(): void
}

type Box = { x: number; y: number; z: number; w: number; h: number; d: number; s?: number }
type Win = { x: number; y: number; z: number; ry: number; r: number }

function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  return /swiftshader|llvmpipe|softpipe|software/i.test(name)
}

export function pickTier(): CityTier {
  const cores = navigator.hardwareConcurrency || 4
  if (innerWidth <= 720 || cores <= 4) return 'phone'
  return innerWidth <= 1100 ? 'mid' : 'high'
}

export function createCity(o: CityOptions): CityApi | null {
  const { canvas, reduce } = o
  let tier = o.tier
  let renderer: THREE.WebGLRenderer
  // QA only: headless browsers render WebGL in software; this opt-in lets
  // screenshots show the city. Never set for real visitors.
  const allowSoftware = (() => {
    try {
      return localStorage.getItem('sng:city:allow-software') === '1'
    } catch {
      return false
    }
  })()
  try {
    // failIfMajorPerformanceCaveat: no city on software GL (no GPU, blocklisted
    // driver) — it would render on the CPU and freeze the page. The static
    // skyline stands in, with the same number of amber windows.
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      failIfMajorPerformanceCaveat: !allowSoftware,
    })
  } catch {
    return null
  }
  if (!allowSoftware && isSoftwareRenderer(renderer.getContext())) {
    renderer.dispose()
    renderer.forceContextLoss()
    return null
  }
  const V3 = THREE.Vector3
  const C = THREE.Color
  const dprFor = (t: CityTier) => Math.min(window.devicePixelRatio || 1, t === 'high' ? 1.75 : t === 'mid' ? 1.4 : 1.25)
  renderer.setPixelRatio(dprFor(tier))
  let bloomOn = tier !== 'phone'
  const cleanups: (() => void)[] = []
  const listen = <K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    fn: (e: WindowEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn))
  }

  const scene = new THREE.Scene()
  const sky = document.createElement('canvas')
  sky.width = 4
  sky.height = 512
  const sg = sky.getContext('2d')
  if (sg) {
    const grd = sg.createLinearGradient(0, 0, 0, 512)
    grd.addColorStop(0, '#050B1C')
    grd.addColorStop(0.24, '#0D1838')
    grd.addColorStop(0.4, '#1B2853')
    grd.addColorStop(0.49, '#2E3C68')
    grd.addColorStop(0.55, '#26325C')
    grd.addColorStop(1, '#0D152D')
    sg.fillStyle = grd
    sg.fillRect(0, 0, 4, 512)
  }
  const skyTex = new THREE.CanvasTexture(sky)
  skyTex.colorSpace = THREE.SRGBColorSpace
  scene.background = skyTex
  scene.fog = new THREE.FogExp2(0x28345f, 0.0088)

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 700)
  scene.add(new THREE.HemisphereLight(0x5a6aa6, 0x05070f, 2.4))
  const dl = new THREE.DirectionalLight(0x8c9ad0, 1.1)
  dl.position.set(-30, 40, 30)
  scene.add(dl)

  // mulberry32, fixed seed: the same city on every load.
  let seed = 20260923
  const rnd = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const phone = tier === 'phone'
  const riverN = (x: number) => -2.4 + Math.sin(x * 0.045 + 0.6) * 1.0
  const riverS = (x: number) => 11 + Math.sin(x * 0.03 + 1.8) * 1.6

  /* ── Buildings ── */
  const ROWS = phone ? 11 : 15
  const boxes: Box[] = []
  const roofs: Box[] = []
  const chims: Box[] = []
  const tanks: { x: number; y: number; z: number }[] = []
  const masts: { x: number; y: number; z: number; l: number }[] = []
  const faces: { x: number; z: number; w: number; d: number; h: number; r: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    const z0 = -6.8 - r * 7.2
    const half = 36 + r * 6.8
    const far = r / (ROWS - 1)
    let x = -half
    while (x < half) {
      if (rnd() < 0.06) {
        x += 2.5 + rnd() * 3
        continue
      }
      const terrace = r < 4 && rnd() < 0.6
      const w = terrace ? 1.6 + rnd() * 1.3 : 2 + rnd() * 3.2
      const d = 3 + rnd() * 2.4
      let h = terrace ? 2.4 + rnd() * 1.5 : 2.6 + rnd() * 3.4 + far * 4.5 * rnd()
      let tower = false
      if (!terrace && r > 3 && rnd() < 0.028) {
        h = 9 + rnd() * 10 + far * 9 * rnd()
        tower = true
      }
      if (Math.abs(x) < 12 && r < 2 && !terrace) h *= 0.78
      const bx = x + w / 2
      let bz = z0 - rnd() * 1.2
      if (r === 0) bz = Math.min(bz, riverN(bx) - 0.9 - d / 2)
      // keep a clearing for the London Eye
      if (r >= 2 && r <= 4 && bx > 20 && bx < 34) h = Math.min(h, 2.6)
      const shade = 0.9 + rnd() * 0.22
      boxes.push({ x: bx, y: 0, z: bz, w, h, d, s: shade })
      if (terrace) {
        roofs.push({ x: bx, y: h, z: bz, w: w + 0.08, h: 0.8 + rnd() * 0.5, d: d + 0.08, s: shade * 0.9 })
        if (rnd() < 0.85)
          chims.push({ x: bx + (rnd() - 0.5) * w * 0.6, y: h + 0.15, z: bz + (rnd() - 0.5) * 0.6, w: 0.26, h: 0.8 + rnd() * 0.5, d: 0.3 })
      } else if (tower) {
        const th = h * 0.12 + 0.6
        boxes.push({ x: bx, y: h, z: bz, w: w * 0.64, h: th, d: d * 0.64, s: shade })
        if (rnd() < 0.65) masts.push({ x: bx, y: h + th, z: bz, l: 2 + rnd() * 3 })
      } else if (rnd() < 0.2) {
        tanks.push({ x: bx + (rnd() - 0.5) * w * 0.4, y: h, z: bz + (rnd() - 0.5) * d * 0.4 })
      }
      faces.push({ x: bx, z: bz, w, d, h, r })
      x += w + 0.12 + (rnd() < 0.2 ? 0.8 : 0)
    }
  }
  const M = new THREE.Matrix4()
  const Q = new THREE.Quaternion()
  const S = new V3()
  const P = new V3()
  const E = new THREE.Euler()
  const bldMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
  const baseBld = new C('#18223F')
  const tmpC = new C()
  function instanced(geo: THREE.BufferGeometry, list: Box[], mat: THREE.Material, colorFn?: (b: Box) => THREE.Color) {
    const m = new THREE.InstancedMesh(geo, mat, list.length)
    list.forEach((b, i) => {
      P.set(b.x, b.y, b.z)
      S.set(b.w, b.h, b.d)
      Q.identity()
      M.compose(P, Q, S)
      m.setMatrixAt(i, M)
      if (colorFn) m.setColorAt(i, colorFn(b))
    })
    scene.add(m)
    return m
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  boxGeo.translate(0, 0.5, 0)
  instanced(boxGeo, boxes, bldMat, (b) => tmpC.copy(baseBld).multiplyScalar(b.s ?? 1))
  const prism = new THREE.BufferGeometry()
  {
    const A = [-0.5, 0, -0.5], B = [-0.5, 0, 0.5], Cc = [-0.5, 1, 0], D = [0.5, 0, -0.5], Ee = [0.5, 0, 0.5], F = [0.5, 1, 0]
    prism.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([A, B, Cc, Ee, D, F, B, Ee, F, B, F, Cc, D, A, Cc, D, Cc, F].flat(), 3),
    )
    prism.computeVertexNormals()
  }
  instanced(prism, roofs, bldMat, (b) => tmpC.copy(baseBld).multiplyScalar(b.s ?? 1))
  instanced(boxGeo, chims, bldMat, () => tmpC.set('#1A2444'))
  const tankGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.7, 8)
  tankGeo.translate(0, 0.35, 0)
  instanced(tankGeo, tanks.map((t) => ({ ...t, w: 1, h: 1, d: 1 })), bldMat, () => tmpC.set('#1B2546'))
  instanced(boxGeo, masts.map((m) => ({ x: m.x, y: m.y, z: m.z, w: 0.08, h: m.l, d: 0.08 })), bldMat, () => tmpC.set('#26315A'))

  /* ── Ground, river, embankment, bridges ── */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), new THREE.MeshLambertMaterial({ color: 0x0b1227 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.06, -200)
  scene.add(ground)
  const riverGeo = new THREE.BufferGeometry()
  {
    const seg = 140, x0 = -190, x1 = 190
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= seg; i++) {
      const x = x0 + ((x1 - x0) * i) / seg
      pos.push(x, -riverN(x), 0, x, -riverS(x), 0)
    }
    for (let i = 0; i < seg; i++) {
      const a = 2 * i, b = a + 1, c2 = a + 2, d = a + 3
      idx.push(a, b, c2, b, d, c2)
    }
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    riverGeo.setIndex(idx)
  }
  const WaterShader = {
    name: 'SNGWater',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; varying vec4 vUv; varying vec3 vW;
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        float t = uTime;
        float n = sin(vW.z * 9.0 + t * .8 + sin(vW.x * .9) * 1.5) * .6 + sin(vW.z * 17.0 - t * 1.1 + vW.x * .5) * .3 + sin(vW.x * 1.3 + t * .3) * .1;
        float band = .62 + .38 * sin(vW.z * 23.0 + t * 1.4 + sin(vW.x * 2.7) * 2.2);
        vec4 uv = vUv; uv.x += n * .004 * uv.w;
        float k = .011 * uv.w;
        vec3 c = texture2DProj(tDiffuse, uv).rgb * .3;
        c += texture2DProj(tDiffuse, uv + vec4(0., k, 0., 0.)).rgb * .2 + texture2DProj(tDiffuse, uv - vec4(0., k, 0., 0.)).rgb * .2;
        c += texture2DProj(tDiffuse, uv + vec4(0., 2.2 * k, 0., 0.)).rgb * .15 + texture2DProj(tDiffuse, uv - vec4(0., 2.2 * k, 0., 0.)).rgb * .15;
        float fres = smoothstep(40., 4., length(vW.xz - cameraPosition.xz));
        vec3 deep = vec3(.01, .017, .04);
        gl_FragColor = vec4(deep + c * color * band * (1.0 - fres * .35), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }
  const reflScale = phone ? 0.35 : 0.5
  const water = new Reflector(riverGeo, { textureWidth: 512, textureHeight: 512, clipBias: 0.003, color: new C(0.62, 0.66, 0.78), shader: WaterShader })
  water.rotation.x = -Math.PI / 2
  water.position.y = 0
  scene.add(water)
  const waterUniforms = (water.material as THREE.ShaderMaterial).uniforms
  const emb: { x: number; z: number; a: number }[] = []
  for (let x = -150; x < 150; x += 2) {
    for (const [f, side] of [[riverN, -1], [riverS, 1]] as const) {
      const z = f(x + 1), z2 = f(x + 2.05)
      emb.push({ x: x + 1, z: z + side * 0.16, a: Math.atan2(z2 - f(x), 2.05) })
    }
  }
  const embM = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x1a2446 }), emb.length)
  emb.forEach((e, i) => {
    P.set(e.x, -0.06, e.z)
    Q.setFromEuler(E.set(0, -e.a, 0))
    S.set(2.1, 0.5, 0.32)
    M.compose(P, Q, S)
    embM.setMatrixAt(i, M)
  })
  scene.add(embM)
  const lampPts: number[] = []
  const redPts: number[] = []
  for (let x = -140; x < 140; x += 2.6) lampPts.push(x, 0.95, riverN(x) - 0.2, 0)
  const bridges: Box[] = []
  for (const bx of [-25, 25]) {
    const zn = riverN(bx) - 0.8, zs = riverS(bx) + 0.8, len = zs - zn
    bridges.push({ x: bx, y: 0.9, z: (zn + zs) / 2, w: 2.8, h: 0.42, d: len })
    for (let k = 1; k < 4; k++) bridges.push({ x: bx, y: -0.05, z: zn + (len * k) / 4, w: 0.9, h: 1, d: 1.1 })
    for (let z = zn; z <= zs; z += 1.8) lampPts.push(bx - 1.3, 1.75, z, 0, bx + 1.3, 1.75, z, 0)
  }
  instanced(boxGeo, bridges, new THREE.MeshLambertMaterial({ color: 0x1d284b }))
  for (const m of masts) redPts.push(m.x, m.y + m.l + 0.1, m.z, rnd() * 6.28)

  /* ── Landmarks (stylised silhouettes, far) ── */
  const lmMat = new THREE.MeshLambertMaterial({ color: 0x1c2750 })
  const addM = (geo: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(geo, lmMat)
    m.position.set(x, y, z)
    m.rotation.y = ry
    scene.add(m)
    return m
  }
  addM(new THREE.ConeGeometry(3.4, 32, 4), 20, 16, -104, Math.PI / 4)
  redPts.push(20, 32.4, -104, 1.2)
  addM(new THREE.CylinderGeometry(0.85, 1.1, 26, 12), -28, 13, -116)
  for (let k = 0; k < 3; k++) addM(new THREE.CylinderGeometry(1.7, 1.7, 0.45, 16), -28, 20.5 + k * 1.3, -116)
  redPts.push(-28, 26.4, -116, 3.1)
  addM(new THREE.BoxGeometry(9, 5, 7), 3, 2.5, -95)
  addM(new THREE.CylinderGeometry(3, 3, 3.6, 20), 3, 6.8, -95)
  addM(new THREE.SphereGeometry(3.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 3, 8.6, -95)
  addM(new THREE.CylinderGeometry(0.45, 0.55, 2.4, 10), 3, 13, -95)
  const gh: THREE.Vector2[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    gh.push(new THREE.Vector2(Math.max(0.05, 3.1 * Math.sin(Math.PI * Math.pow(t, 0.82)) * (1 - t * 0.15)), t * 19))
  }
  addM(new THREE.LatheGeometry(gh, 20), 36, 0, -122)
  // London Eye
  const eye = new THREE.Group()
  eye.position.set(27, 7.4, -24)
  eye.rotation.y = -0.35
  scene.add(eye)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3e4c7c, fog: true })
  eye.add(new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.09, 6, 96), eyeMat))
  eye.add(new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.04, 4, 96), eyeMat))
  {
    const sp: number[] = []
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2
      sp.push(0, 0, 0, Math.cos(a) * 6.6, Math.sin(a) * 6.6, 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    eye.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2e3a66, transparent: true, opacity: 0.8 })))
  }
  const legs = new THREE.Group()
  legs.position.copy(eye.position)
  legs.rotation.y = eye.rotation.y
  scene.add(legs)
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.2, 0.18), lmMat)
    l.position.set(s * 2.3, -3.7, -0.6)
    l.rotation.z = s * 0.3
    legs.add(l)
  }
  {
    const podPos: number[] = []
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2
      podPos.push(Math.cos(a) * 6.8, Math.sin(a) * 6.8, 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(podPos, 3))
    eye.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc9d6ff, size: 0.28, transparent: true, opacity: 0.75, fog: true })))
  }

  /* ── Far skyline layers (depth) ── */
  function skylineTex(sd: number, dens: number) {
    const c = document.createElement('canvas')
    c.width = 2048
    c.height = 256
    const g = c.getContext('2d')
    let s2 = sd
    const r = () => {
      s2 = (s2 * 16807) % 2147483647
      return s2 / 2147483647
    }
    if (g) {
      let x = 0
      g.fillStyle = '#fff'
      while (x < 2048) {
        const w = 8 + r() * 36
        const hh = 20 + r() * 90 * dens * (r() < 0.07 ? 2.2 : 1)
        g.fillRect(x, 256 - hh, w, hh)
        x += w + (r() < 0.12 ? r() * 18 : 0)
      }
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  ;([
    [-150, '#1E2A55', 1.1, 900, 70],
    [-190, '#243060', 0.95, 1100, 80],
    [-235, '#2A3664', 0.8, 1300, 90],
  ] as const).forEach(([z, col, dn, w, h], i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new C(col), map: skylineTex(11 + i * 97, dn), transparent: true, alphaTest: 0.5, fog: true }),
    )
    m.position.set(0, h / 2 - 0.5, z)
    scene.add(m)
  })

  /* ── Windows ── */
  const WIN: Win[] = []
  const CAP = phone ? 9000 : 16000
  for (const b of faces) {
    const floors = Math.floor((b.h - 0.5) / 1.15)
    const cols = Math.max(1, Math.floor((b.w - 0.3) / 0.9))
    const x0 = b.x - (cols - 1) * 0.45
    for (let f = 0; f < floors && WIN.length < CAP; f++) {
      const y = 0.9 + f * 1.15
      if (y > b.h - 0.45) break
      for (let c = 0; c < cols; c++) WIN.push({ x: x0 + c * 0.9, y, z: b.z + b.d / 2 + 0.02, ry: 0, r: b.r })
      if (Math.abs(b.x) > 6) {
        const sc = Math.max(1, Math.floor((b.d - 0.3) / 0.9))
        const z0 = b.z - (sc - 1) * 0.45
        const sx = b.x + (b.x < 0 ? b.w / 2 + 0.02 : -b.w / 2 - 0.02)
        const ry = b.x < 0 ? Math.PI / 2 : -Math.PI / 2
        for (let c = 0; c < sc; c++) WIN.push({ x: sx, y, z: z0 + c * 0.9, ry, r: b.r })
      }
    }
  }
  // Candidate windows for slots: facing the camera, not too far. Best fly-in targets first.
  const aspect0 = innerWidth / Math.max(1, innerHeight)
  const portrait0 = aspect0 < 1
  const cam0 = new THREE.PerspectiveCamera(portrait0 ? 58 : 42, aspect0, 0.1, 700)
  if (portrait0) {
    cam0.position.set(0, 10.5, 40)
    cam0.lookAt(3, 10.5, -30)
  } else {
    cam0.position.set(0, 9.5, 36)
    cam0.lookAt(-5, 6, -30)
  }
  cam0.updateMatrixWorld()
  const pv = new V3()
  const onStage = (i: number) => {
    const w = WIN[i]
    pv.set(w.x, w.y, w.z).project(cam0)
    const sx = pv.x * 0.5 + 0.5, sy = -pv.y * 0.5 + 0.5
    return pv.z < 1 && sx > (portrait0 ? 0.03 : 0.53) && sx < 0.97 && sy > (portrait0 ? 0.63 : 0.14) && sy < (portrait0 ? 0.86 : 0.72)
  }
  const shuffle = (a: number[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // Occlusion: a slot window must be visible from the rest pose, not hidden behind a nearer building.
  const occluded = (i: number) => {
    const w = WIN[i]
    const ox = cam0.position.x, oy = cam0.position.y, oz = cam0.position.z
    const dx = w.x - ox, dy = w.y - oy, dz = w.z + 0.05 - oz
    for (const b of boxes) {
      if (b.z - b.d / 2 < w.z + 0.1 && b.z + b.d / 2 < w.z + 0.1) continue
      if (b.z - b.d / 2 > oz) continue
      let t0 = 0, t1 = 0.999
      for (const [o1, d1, lo, hi] of [
        [ox, dx, b.x - b.w / 2, b.x + b.w / 2],
        [oy, dy, b.y, b.y + b.h],
        [oz, dz, b.z - b.d / 2, b.z + b.d / 2],
      ]) {
        if (Math.abs(d1) < 1e-9) {
          if (o1 < lo || o1 > hi) {
            t0 = 2
            break
          }
          continue
        }
        let a = (lo - o1) / d1, c = (hi - o1) / d1
        if (a > c) [a, c] = [c, a]
        t0 = Math.max(t0, a)
        t1 = Math.min(t1, c)
        if (t0 > t1) break
      }
      if (t0 <= t1) return true
    }
    return false
  }
  const front: number[] = []
  const back: number[] = []
  WIN.forEach((w, i) => {
    if (w.ry === 0 && w.z > -64) (onStage(i) && !occluded(i) ? front : back).push(i)
  })
  const cand = [...shuffle(front), ...shuffle(back)]
  const goodScore = (i: number) => {
    const w = WIN[i]
    return w.r === 0 && w.y > 1.4 && w.y < 4.4 && w.x > -3 && w.x < 13 ? Math.abs(w.x - 5) + Math.abs(w.y - 2.6) * 0.6 : 1e9
  }
  const good = cand.filter((i) => goodScore(i) < 1e9).sort((a, b) => goodScore(a) - goodScore(b)).slice(0, 10)
  const pool = [...good, ...cand.filter((i) => !good.includes(i))].slice(0, Math.min(cand.length, 420))
  const isSlotWin = new Uint8Array(WIN.length)
  pool.forEach((i) => (isSlotWin[i] = 1))
  const HOMEW: Win[] = []
  WIN.forEach((w, i) => {
    if (!isSlotWin[i]) HOMEW.push(w)
  })

  // Ordinary homes
  const NH = HOMEW.length
  const hMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.44, 0.62), new THREE.MeshBasicMaterial({ color: 0xffffff }), NH)
  const DARK = ['#121B35', '#17213E', '#1C284A'].map((c) => new C(c))
  const HOME = ['#4F5779', '#625F7A', '#566285'].map((c) => new C(c))
  const TV = new C('#34508F')
  const hBase = new Float32Array(NH * 3)
  const hLit = new Float32Array(NH * 3)
  const hLevel = new Float32Array(NH)
  const hTarget = new Float32Array(NH)
  const hDelay = new Float32Array(NH)
  const hActive: number[] = []
  HOMEW.forEach((w, i) => {
    P.set(w.x, w.y, w.z)
    Q.setFromEuler(E.set(0, w.ry, 0))
    S.set(1, 1, 1)
    M.compose(P, Q, S)
    hMesh.setMatrixAt(i, M)
    DARK[(rnd() * 3) | 0].toArray(hBase, i * 3)
    hMesh.setColorAt(i, tmpC.fromArray(hBase, i * 3))
    hDelay[i] = 0.25 + Math.min(1, Math.hypot(w.x, w.z - 34) / 120) * 2.3 + rnd() * 0.35
    if (rnd() < 0.11) {
      ;(rnd() < 0.12 ? TV : HOME[(rnd() * 3) | 0]).toArray(hLit, i * 3)
      hTarget[i] = 1
      hActive.push(i)
    } else HOME[(rnd() * 3) | 0].toArray(hLit, i * 3)
  })
  if (hMesh.instanceColor) hMesh.instanceColor.needsUpdate = true
  scene.add(hMesh)

  // Slot windows: arched
  const arch = new THREE.Shape()
  arch.moveTo(-0.25, 0)
  arch.lineTo(0.25, 0)
  arch.lineTo(0.25, 0.45)
  arch.absarc(0, 0.45, 0.25, 0, Math.PI, false)
  arch.lineTo(-0.25, 0)
  const archGeo = new THREE.ShapeGeometry(arch, 8)
  archGeo.translate(0, -0.35, 0)
  const K = pool.length
  const sMesh = new THREE.InstancedMesh(archGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), K)
  const LAMP = ['#FFB547', '#FFC56E', '#FFA43F'].map((c) => new C(c))
  const sBase = new Float32Array(K * 3)
  const sLamp = new Float32Array(K * 3)
  const sLevel = new Float32Array(K)
  const sTarget = new Float32Array(K)
  const sDelay = new Float32Array(K)
  const sDrawn = new Float32Array(K).fill(-1)
  const sId: (string | null)[] = new Array(K).fill(null)
  const sCat: (string | null)[] = new Array(K).fill(null)
  const sFree = new Uint8Array(K)
  const sAnim: ({ t0: number; on: boolean } | null)[] = new Array(K).fill(null)
  const idx = new Map<string, number>()
  pool.forEach((wi, k) => {
    const w = WIN[wi]
    P.set(w.x, w.y, w.z + 0.005)
    Q.identity()
    S.set(1, 1, 1)
    M.compose(P, Q, S)
    sMesh.setMatrixAt(k, M)
    DARK[(rnd() * 3) | 0].toArray(sBase, k * 3)
    LAMP[(rnd() * 3) | 0].toArray(sLamp, k * 3)
    sMesh.setColorAt(k, tmpC.fromArray(sBase, k * 3))
    sDelay[k] = 0.3 + Math.min(1, Math.hypot(w.x, w.z - 34) / 120) * 2.2 + rnd() * 0.3
  })
  if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true
  sMesh.computeBoundingSphere()
  scene.add(sMesh)
  const slotPos = (k: number) => WIN[pool[k]]

  // Soft halos, used when bloom is off (phones)
  const gPos = new Float32Array(K * 3)
  const gA = new Float32Array(K)
  pool.forEach((wi, k) => {
    const w = WIN[wi]
    gPos[k * 3] = w.x
    gPos[k * 3 + 1] = w.y
    gPos[k * 3 + 2] = w.z + 0.08
  })
  const gGeo = new THREE.BufferGeometry()
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3))
  gGeo.setAttribute('aGlow', new THREE.BufferAttribute(gA, 1))
  const gMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new C('#FF9A3C') }, uScale: { value: 1300 }, uFade: { value: 1 } },
    vertexShader: `attribute float aGlow; varying float vA; uniform float uScale, uFade;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float dist = -mv.z; vA = uFade * aGlow * (1.0 - smoothstep(55.0, 130.0, dist)); gl_PointSize = min(uScale * (0.35 + 0.65 * aGlow) / dist, uScale / 18.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a * smoothstep(.04, .2, d); gl_FragColor = vec4(uColor, a * vA * 0.45); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const halos = new THREE.Points(gGeo, gMat)
  halos.visible = !bloomOn
  scene.add(halos)

  // Small lights: embankment lamps (cool white), aircraft lights (slow red blink)
  const dotMat = (blink: boolean) =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 420 }, uColor: { value: new C(blink ? '#FF5A4E' : '#D9E2FF') }, uBlink: { value: blink ? 1 : 0 } },
      vertexShader: `attribute float aPhase; uniform float uTime, uScale, uBlink; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float dist = -mv.z;
        float b = mix(1.0, smoothstep(.72, 1.0, sin(uTime * 2.4 + aPhase)), uBlink);
        vA = b * (1.0 - smoothstep(70.0, 190.0, dist)); gl_PointSize = clamp(uScale / dist, 1.5, uScale / 60.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(.5, .1, d); gl_FragColor = vec4(uColor, a * vA * .55); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  const pts = (arr: number[], mat: THREE.ShaderMaterial) => {
    const g = new THREE.BufferGeometry()
    const p: number[] = []
    const ph: number[] = []
    for (let i = 0; i < arr.length; i += 4) {
      p.push(arr[i], arr[i + 1], arr[i + 2])
      ph.push(arr[i + 3])
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1))
    scene.add(new THREE.Points(g, mat))
    return mat
  }
  const lampMat = pts(lampPts, dotMat(false))
  const redMat = pts(redPts, dotMat(true))

  /* ── Post-processing ── */
  let composer: EffectComposer | null = null
  let bloom: UnrealBloomPass | null = null
  function buildPost() {
    if (!bloomOn) {
      composer = null
      return
    }
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier === 'high' ? 4 : 0 })
    composer = new EffectComposer(renderer, rt)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.45, 0.42)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }
  buildPost()
  const lampGain = () => (bloomOn ? 1.1 : 1.0)

  /* ── State ── */
  let emph: Set<string> | null = null
  let first = -1
  let detachK = 0
  let detached = false
  let flyP = 0
  function retarget() {
    for (let k = 0; k < K; k++) {
      if (!sId[k] || !sFree[k]) {
        sTarget[k] = 0
        continue
      }
      sTarget[k] = !emph ? 1 : emph.has(sCat[k] ?? '') ? 1 : 0.12
    }
  }
  function sync(list: CitySlot[]) {
    const seen = new Set<string>()
    for (const s of list) {
      seen.add(s.id)
      let k = idx.get(s.id)
      if (k == null) {
        k = -1
        for (let j = good.length; j < K; j++)
          if (!sId[j]) {
            k = j
            break
          }
        if (k < 0)
          for (let j = 0; j < K; j++)
            if (!sId[j]) {
              k = j
              break
            }
        if (k < 0) continue
        sId[k] = s.id
        idx.set(s.id, k)
        sLevel[k] = 0
      }
      sCat[k] = s.cat
      sFree[k] = s.free ? 1 : 0
    }
    for (let k = 0; k < K; k++) {
      const id = sId[k]
      if (id && !seen.has(id)) {
        idx.delete(id)
        sId[k] = null
        sFree[k] = 0
      }
    }
    retarget()
    requestStatic()
  }
  function swap(a: number, b: number) {
    ;[sId[a], sId[b]] = [sId[b], sId[a]]
    ;[sCat[a], sCat[b]] = [sCat[b], sCat[a]]
    ;[sFree[a], sFree[b]] = [sFree[b], sFree[a]]
    ;[sLevel[a], sLevel[b]] = [sLevel[b], sLevel[a]]
    ;[sAnim[a], sAnim[b]] = [sAnim[b], sAnim[a]]
    const ia = sId[a], ib = sId[b]
    if (ia) idx.set(ia, a)
    if (ib) idx.set(ib, b)
  }
  function setFirst(id: string | null) {
    const k = id != null ? idx.get(id) : undefined
    if (k == null) {
      first = -1
      return
    }
    let g = -1
    for (const j of good) {
      const jk = pool.indexOf(j)
      if (jk < 0) continue
      if (!sId[jk] || sFree[jk] || jk === k) {
        g = jk
        break
      }
    }
    if (g >= 0 && g !== k) swap(g, k)
    first = g >= 0 ? g : k
    retarget()
    requestStatic()
  }
  const offCurve: [number, number][] = [[0, 1], [0.16, 0.42], [0.26, 0.86], [0.4, 0.3], [0.52, 0.5], [1, 0]]
  const onCurve: [number, number][] = [[0, 0], [0.18, 0.7], [0.28, 0.2], [0.46, 0.9], [0.58, 0.6], [1, 1]]
  const curve = (c: [number, number][], k: number) => {
    for (let i = 1; i < c.length; i++)
      if (k <= c[i][0]) {
        const [a, va] = c[i - 1], [b, vb] = c[i]
        return va + ((vb - va) * (k - a)) / (b - a)
      }
    return c[c.length - 1][1]
  }

  /* ── Camera ── */
  let mx = 0, my = 0, cx = 0, cy = 0, H = 1
  let t0 = performance.now()
  let started = false
  const restPos = new V3(), restLook = new V3(), camPos = new V3(), camLook = new V3(), T = new V3(), tmpV = new V3(), mid = new V3()
  if (!reduce && o.fine)
    listen(window, 'pointermove', (e) => {
      mx = (e.clientX / innerWidth) * 2 - 1
      my = (e.clientY / innerHeight) * 2 - 1
    }, { passive: true })
  const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
  function computeCamera(t: number) {
    const portrait = camera.aspect < 1
    if (portrait) {
      restPos.set(0, 10.5, 40)
      restLook.set(3, 10.5, -30)
    } else {
      restPos.set(0, 9.5, 36)
      restLook.set(-5, 6, -30)
    }
    const e = easeIO(flyP), pw = 1 - e
    const drift = reduce ? 0 : Math.sin(t * 0.05) * 1.2
    camPos.set(restPos.x + (cx * 2.4 + drift) * pw, restPos.y - cy * 1.2 * pw, restPos.z)
    camLook.set(restLook.x + (cx * 0.8 + drift * 0.5) * pw, restLook.y, restLook.z)
    if (flyP > 0 && first >= 0) {
      const w = slotPos(first)
      T.set(w.x, w.y, w.z)
      // At distance D the window's 0.7-unit height projects to exactly paneH px.
      const D = (0.7 * H) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (o.paneH || 156))
      tmpV.set(T.x, T.y, T.z + D)
      mid.copy(camPos).lerp(tmpV, 0.5)
      mid.y += 1.6
      const u = 1 - e
      camPos.set(
        u * u * camPos.x + 2 * u * e * mid.x + e * e * tmpV.x,
        u * u * camPos.y + 2 * u * e * mid.y + e * e * tmpV.y,
        u * u * camPos.z + 2 * u * e * mid.z + e * e * tmpV.z,
      )
      camLook.lerp(T, easeOut(Math.min(1, flyP * 1.2)))
    }
    camera.position.copy(camPos)
    camera.lookAt(camLook)
    camera.updateMatrixWorld()
  }
  let needResize = false
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    H = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = camera.aspect < 1 ? 58 : 42
    camera.updateProjectionMatrix()
    const pr = renderer.getPixelRatio()
    composer?.setSize(w, h)
    composer?.setPixelRatio(pr)
    water.getRenderTarget().setSize(Math.round(w * pr * reflScale), Math.round(h * pr * reflScale))
    gMat.uniforms.uScale.value = pr * 1300 * (h / 900)
    lampMat.uniforms.uScale.value = redMat.uniforms.uScale.value = pr * 260 * (h / 900)
    requestStatic()
  }
  listen(window, 'resize', () => {
    if (running || reduce) resize()
    else needResize = true
  })

  /* ── Frame ── */
  let frames = 0
  let lastCount = -1
  function countFree() {
    let n = 0
    for (let k = 0; k < K; k++) if (sId[k] && sFree[k] && (!emph || emph.has(sCat[k] ?? '')) && sLevel[k] > 0.55) n++
    return n
  }
  function step(now: number, instant: boolean, dt = 16.67) {
    const t = (now - t0) / 1000
    const kr = (r: number) => 1 - Math.pow(1 - r, Math.min(4, Math.max(0.25, dt / 16.67)))
    let dirtyH = false, dirtyS = false
    for (let a = 0; a < hActive.length; a++) {
      const i = hActive[a]
      const tg = !instant && t < hDelay[i] ? 0 : hTarget[i]
      const l = hLevel[i], d = tg - l
      if (Math.abs(d) > 0.003) {
        const nl = instant ? tg : l + d * kr(d > 0 ? 0.11 : 0.05)
        hLevel[i] = nl
        const q = i * 3
        tmpC.setRGB(
          hBase[q] + (hLit[q] - hBase[q]) * nl,
          hBase[q + 1] + (hLit[q + 1] - hBase[q + 1]) * nl,
          hBase[q + 2] + (hLit[q + 2] - hBase[q + 2]) * nl,
        )
        hMesh.setColorAt(i, tmpC)
        dirtyH = true
      }
    }
    detachK += ((detached ? 1 : 0) - detachK) * (instant ? 1 : kr(0.25))
    const gain = lampGain(), recede = 1 - 0.6 * easeIO(flyP)
    for (let k = 0; k < K; k++) {
      let l = sLevel[k]
      const anim = sAnim[k]
      if (anim) {
        const a = (now - anim.t0) / 480
        if (a >= 1 || instant) {
          l = anim.on ? sTarget[k] : 0
          sAnim[k] = null
        } else l = curve(anim.on ? onCurve : offCurve, a) * (anim.on ? Math.max(sTarget[k], 0.01) : 1)
      } else {
        const tg = !instant && t < sDelay[k] ? 0 : sTarget[k], d = tg - l
        if (Math.abs(d) > 0.002) l = instant ? tg : l + d * kr(d > 0 ? 0.1 : 0.07)
        else l = tg
      }
      sLevel[k] = l
      const shown = k === first ? l * (1 - detachK) : l * recede
      if (Math.abs(shown - sDrawn[k]) > 0.002) {
        sDrawn[k] = shown
        const q = k * 3
        tmpC.setRGB(
          sBase[q] + (sLamp[q] * gain - sBase[q]) * shown,
          sBase[q + 1] + (sLamp[q + 1] * gain - sBase[q + 1]) * shown,
          sBase[q + 2] + (sLamp[q + 2] * gain - sBase[q + 2]) * shown,
        )
        sMesh.setColorAt(k, tmpC)
        gA[k] = shown > 0.3 ? (shown - 0.3) / 0.7 : 0
        dirtyS = true
      }
    }
    if (dirtyH && hMesh.instanceColor) hMesh.instanceColor.needsUpdate = true
    if (dirtyS) {
      if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true
      gGeo.attributes.aGlow.needsUpdate = true
    }
    if (!reduce) {
      cx += (mx * (o.fine ? 1 : 0) - cx) * kr(0.035)
      cy += (my * (o.fine ? 1 : 0) - cy) * kr(0.035)
    }
    computeCamera(t)
    waterUniforms.uTime.value = t
    lampMat.uniforms.uTime.value = redMat.uniforms.uTime.value = t
    if (bloom) bloom.strength = 0.8 * (1 - 0.7 * easeIO(flyP))
    gMat.uniforms.uFade.value = 1 - easeIO(flyP)
    if (composer) composer.render()
    else renderer.render(scene, camera)
    frames++
    if (frames % 10 === 0 || instant) {
      const n = countFree()
      if (n !== lastCount) {
        lastCount = n
        o.onCount?.(n)
      }
    }
    if (hoverPending) doHover()
  }
  let running = false, raf = 0, last = 0, wantRun = false, disposed = false
  const dts: number[] = []
  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    const dt = now - last
    last = now
    if (dt > 0 && dt < 120) {
      dts.push(dt)
      if (dts.length >= 120) {
        governor()
        dts.length = 0
      }
    }
    step(now, false, dt)
  }
  // Frame-time governor: p90 over 20ms steps down one tier; never back up.
  function governor() {
    if (frames < 240 || tier === 'phone') return
    const s = [...dts].sort((a, b) => a - b), p90 = s[Math.floor(s.length * 0.9)]
    if (p90 > 20) setTier(tier === 'high' ? 'mid' : 'phone')
  }
  function setTier(t: CityTier) {
    tier = t
    renderer.setPixelRatio(dprFor(t))
    if (t === 'phone' && bloomOn) {
      bloomOn = false
      composer?.dispose()
      composer = null
      bloom = null
      halos.visible = true
      sDrawn.fill(-1)
    } else if (composer && t === 'mid') {
      composer.dispose()
      buildPost()
    }
    resize()
  }
  function start() {
    if (disposed || running || reduce || !wantRun || document.hidden) return
    if (needResize) {
      needResize = false
      resize()
    }
    if (!started) {
      started = true
      t0 = performance.now()
    }
    running = true
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }
  let staticQ = false
  function requestStatic() {
    if (!reduce || staticQ || disposed) return
    staticQ = true
    requestAnimationFrame((now) => {
      staticQ = false
      if (!disposed) step(now, true)
    })
  }
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))
  // Ambient life: an ordinary home switches on or off every ~1.5s. Slots never
  // flicker, so the counter stays true.
  if (!reduce) {
    const ambient = window.setInterval(() => {
      if (!running) return
      const i = (rnd() * NH) | 0
      if (hTarget[i] > 0) hTarget[i] = 0
      else {
        hTarget[i] = 1
        if (!hActive.includes(i)) hActive.push(i)
      }
    }, 1500)
    cleanups.push(() => window.clearInterval(ambient))
  }

  /* ── Hover / pick (fine pointers) ── */
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let hoverPending: PointerEvent | null = null
  let hovered: (CityHover & { k: number }) | null = null
  let downAt: [number, number] | null = null
  function doHover() {
    const e = hoverPending
    hoverPending = null
    if (!e) return
    if (flyP > 0.02) {
      setHover(null)
      return
    }
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObject(sMesh, false)[0]
    const k = hit && hit.instanceId != null ? hit.instanceId : -1
    const id = k >= 0 ? sId[k] : null
    if (k >= 0 && id && sFree[k] && sTarget[k] === 1 && sLevel[k] > 0.5) setHover({ k, id, x: e.clientX, y: e.clientY })
    else setHover(null)
  }
  function setHover(h: (CityHover & { k: number }) | null) {
    hovered = h
    canvas.style.cursor = h ? 'pointer' : ''
    o.onHover?.(h ? { id: h.id, x: h.x, y: h.y } : null)
  }
  if (o.fine) {
    const onMove = (e: PointerEvent) => {
      hoverPending = e
      if (!running) doHover()
    }
    const onLeave = () => {
      hoverPending = null
      setHover(null)
    }
    const onDown = (e: PointerEvent) => {
      downAt = [e.clientX, e.clientY]
    }
    const onUp = (e: PointerEvent) => {
      if (downAt && hovered && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) {
        const id = hovered.id
        setHover(null)
        o.onPick?.(id)
      }
      downAt = null
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    cleanups.push(() => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
    })
  }

  resize()
  sync([])
  return {
    sync,
    setFirst,
    setEmphasis(cats) {
      emph = cats && cats.length ? new Set(cats) : null
      retarget()
      lastCount = -1
      if (reduce) requestStatic()
      else if (!running) o.onCount?.(countFree())
    },
    book(id) {
      const k = idx.get(id)
      if (k == null) return
      sFree[k] = 0
      retarget()
      sAnim[k] = reduce ? null : { t0: performance.now(), on: false }
      requestStatic()
    },
    unbook(id) {
      let k = idx.get(id)
      if (k == null) {
        const current: CitySlot[] = []
        sId.forEach((x, j) => {
          if (x) current.push({ id: x, cat: sCat[j], free: !!sFree[j] })
        })
        sync([...current, { id, cat: null, free: true }])
        k = idx.get(id)
        if (k == null) return
      }
      sFree[k] = 1
      retarget()
      sAnim[k] = reduce ? null : { t0: performance.now(), on: true }
      requestStatic()
    },
    setFly(p) {
      if (reduce) return
      flyP = p
      if (!running) return
      computeCamera((performance.now() - t0) / 1000)
    },
    setDetached(v) {
      detached = v
    },
    targetRect() {
      if (first < 0) return null
      const w = slotPos(first), r = canvas.getBoundingClientRect()
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
      for (const [dx, dy] of [[-0.25, -0.35], [0.25, -0.35], [-0.25, 0.35], [0.25, 0.35]]) {
        tmpV.set(w.x + dx, w.y + dy, w.z).project(camera)
        const sx = r.left + (tmpV.x * 0.5 + 0.5) * r.width
        const sy = r.top + (-tmpV.y * 0.5 + 0.5) * r.height
        x0 = Math.min(x0, sx)
        x1 = Math.max(x1, sx)
        y0 = Math.min(y0, sy)
        y1 = Math.max(y1, sy)
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    },
    resize,
    pause() {
      wantRun = false
      stop()
      setHover(null)
    },
    resume() {
      wantRun = true
      if (reduce) requestStatic()
      else start()
    },
    dispose() {
      disposed = true
      stop()
      cleanups.forEach((f) => f())
      composer?.dispose()
      water.dispose()
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
      skyTex.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
