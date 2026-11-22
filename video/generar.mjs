// Generador de la composición HyperFrames.
// Lee guion.txt + assets/transcript.json (tiempos de cada palabra) y escribe:
//   index.html, compositions/mundo.html, compositions/subtitulos.html
// Uso: node generar.mjs [--hasta 8.5] [--sin-subtitulos]
import fs from "node:fs";
import { execSync } from "node:child_process";
const durMedia = (f) => +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim();

const args = process.argv.slice(2);
const HASTA = args.includes("--hasta") ? parseFloat(args[args.indexOf("--hasta") + 1]) : null;
const SIN_SUBS = args.includes("--sin-subtitulos");

// ---------- tiempos de la voz ----------
const W = JSON.parse(fs.readFileSync("assets/transcript.json", "utf8"));
const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");
function wavDur(f) {
  const b = fs.readFileSync(f);
  let o = 12, rate = 0, size = 0;
  while (o < b.length) {
    const id = b.toString("ascii", o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === "fmt ") rate = b.readUInt32LE(o + 16);
    if (id === "data") { size = len; break; }
    o += 8 + len + (len % 2);
  }
  return size / rate;
}
fs.mkdirSync("assets", { recursive: true });
fs.copyFileSync("voz.wav", "assets/voz.wav");
const VOZ = wavDur("voz.wav");
const D = +(HASTA ? Math.min(HASTA, VOZ) : VOZ).toFixed(3);
/** P("palabra", n): cuándo EMPIEZA la n-ésima vez que se dice esa palabra */
function P(palabra, n = 1) {
  const k = norm(palabra);
  let c = 0;
  for (const w of W) if (norm(w.text) === k && ++c === n) return w.start;
  throw new Error(`P("${palabra}", ${n}): no está en la voz`);
}
/** E("palabra", n): cuándo TERMINA */
function E(palabra, n = 1) {
  const k = norm(palabra);
  let c = 0;
  for (const w of W) if (norm(w.text) === k && ++c === n) return w.end;
  throw new Error(`E("${palabra}", ${n})`);
}
const F = (i) => W.find((w) => w.frase === i).start; // inicio de la frase i (0-based)
const FE = (i) => W.filter((w) => w.frase === i).at(-1).end;

// ---------- utilidades ----------
const icon = (name, cls = "") =>
  fs
    .readFileSync(`assets/icons/${name}.svg`, "utf8")
    .replace("<svg ", `<svg class="ico ${cls}" `);
const r3 = (x) => +x.toFixed(3);
let js = []; // líneas de GSAP
const at = (t) => r3(Math.max(0, t));
const push = (s) => js.push(s);

// ---------- personajes SVG ----------
function personaje(id, c) {
  // c: {camisa, pantalon, piel, pelo, extra}
  return `
<div class="pj" id="${id}"><div class="pj-in" id="${id}-in">
<svg viewBox="0 0 200 360" width="230" height="414" overflow="visible">
  <ellipse cx="100" cy="352" rx="62" ry="9" fill="rgba(0,0,0,.45)"/>
  <g id="${id}-legL"><rect x="70" y="226" width="26" height="118" rx="13" fill="${c.pantalon}"/><ellipse cx="80" cy="346" rx="20" ry="10" fill="#f1f1f1"/></g>
  <g id="${id}-legR"><rect x="104" y="226" width="26" height="118" rx="13" fill="${c.pantalon}"/><ellipse cx="120" cy="346" rx="20" ry="10" fill="#f1f1f1"/></g>
  <g id="${id}-torso">
    <g id="${id}-armL"><rect x="34" y="148" width="24" height="96" rx="12" fill="${c.camisa}"/><circle cx="46" cy="246" r="13" fill="${c.piel}"/></g>
    <rect x="52" y="138" width="96" height="112" rx="38" fill="${c.camisa}"/>
    <rect x="52" y="214" width="96" height="16" fill="rgba(0,0,0,.12)"/>
    <g id="${id}-armR"><rect x="142" y="148" width="24" height="96" rx="12" fill="${c.camisa}"/><circle cx="154" cy="246" r="13" fill="${c.piel}"/></g>
    <g id="${id}-head">
      <rect x="88" y="124" width="24" height="22" fill="${c.piel}"/>
      <circle cx="100" cy="90" r="52" fill="${c.piel}"/>
      ${c.pelo}
      <g id="${id}-eyes"><ellipse cx="82" cy="94" rx="6.5" ry="9" fill="#111"/><ellipse cx="118" cy="94" rx="6.5" ry="9" fill="#111"/></g>
      ${c.extra || ""}
      <path id="${id}-smile" d="M84 116 Q100 130 116 116" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path id="${id}-sad" d="M84 124 Q100 110 116 124" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
  </g>
</svg></div></div>`;
}
const NOVATO = {
  camisa: "#ef4444", pantalon: "#334155", piel: "#f5c9a5",
  pelo: `<path d="M48 82 Q52 30 100 34 Q150 30 152 82 L140 66 L128 78 L118 60 L104 76 L92 58 L80 76 L66 62 Z" fill="#5b3a29"/>
         <path d="M44 74 Q100 20 156 74 L156 64 Q100 6 44 64 Z" fill="#b91c1c"/><rect x="40" y="66" width="80" height="12" rx="6" fill="#991b1b"/>`,
};
const PRO = {
  camisa: "#22c55e", pantalon: "#1e293b", piel: "#c98e66",
  pelo: `<path d="M48 84 Q46 34 100 32 Q156 34 152 84 Q140 52 100 54 Q62 52 48 84 Z" fill="#1f1611"/>`,
  extra: `<g fill="none" stroke="#111" stroke-width="4"><rect x="66" y="82" width="30" height="24" rx="8"/><rect x="104" y="82" width="30" height="24" rx="8"/><path d="M96 92 H104"/></g>`,
};

// rig: respiración, parpadeo, andar/correr
function vida(id, semilla) {
  const n = Math.ceil(D / 1.7) + 1;
  push(`tl.fromTo("#${id}-torso",{y:0},{y:-3,duration:1.7,ease:"sine.inOut",yoyo:true,repeat:${n}},0);`);
  push(`tl.fromTo("#${id}-head",{rotation:-1.5},{rotation:1.5,svgOrigin:"100 140",duration:2.3,ease:"sine.inOut",yoyo:true,repeat:${Math.ceil(D / 2.3) + 1}},0);`);
  push(`tl.fromTo("#${id}-armL",{rotation:3},{rotation:-3,svgOrigin:"46 154",duration:1.9,ease:"sine.inOut",yoyo:true,repeat:${Math.ceil(D / 1.9) + 1}},0);`);
  push(`tl.fromTo("#${id}-armR",{rotation:-3},{rotation:4,svgOrigin:"154 154",duration:2.1,ease:"sine.inOut",yoyo:true,repeat:${Math.ceil(D / 2.1) + 1}},0);`);
  let t = 0.9 + semilla * 0.7, k = semilla;
  while (t < D) {
    push(`tl.to("#${id}-eyes",{scaleY:0.1,svgOrigin:"100 94",duration:0.06,ease:"power1.in",yoyo:true,repeat:1},${r3(t)});`);
    k = (k * 7 + 3) % 11;
    t += 2.4 + k * 0.17;
  }
}
function andar(id, t0, t1, ciclo = 0.32, amp = 32) {
  const n = Math.max(1, Math.round((t1 - t0) / ciclo));
  const d = (t1 - t0) / n / 2;
  push(`tl.fromTo("#${id}-legL",{rotation:-${amp}},{rotation:${amp},immediateRender:false,svgOrigin:"83 230",duration:${r3(d)},ease:"sine.inOut",yoyo:true,repeat:${2 * n - 1}},${at(t0)});`);
  push(`tl.fromTo("#${id}-legR",{rotation:${amp}},{rotation:-${amp},immediateRender:false,svgOrigin:"117 230",duration:${r3(d)},ease:"sine.inOut",yoyo:true,repeat:${2 * n - 1}},${at(t0)});`);
  push(`tl.fromTo("#${id}-in",{y:0},{y:-14,immediateRender:false,duration:${r3(d / 2)},ease:"sine.out",yoyo:true,repeat:${4 * n - 1}},${at(t0)});`);
  push(`tl.to(["#${id}-legL","#${id}-legR"],{rotation:0,duration:0.15,ease:"power2.out"},${at(t1)});`);
}
function cara(id, t, triste) {
  push(`tl.to("#${id}-smile",{opacity:${triste ? 0 : 1},duration:0.15},${at(t)});`);
  push(`tl.to("#${id}-sad",{opacity:${triste ? 1 : 0},duration:0.15},${at(t)});`);
}
function brazo(id, lado, rot, t, dur = 0.3) {
  const o = lado === "L" ? "46 154" : "154 154";
  push(`tl.to("#${id}-arm${lado}",{rotation:${rot},svgOrigin:"${o}",duration:${dur},ease:"back.out(1.6)"},${at(t)});`);
}

// rodillo de números (cuenta que gira)
function rodillo(id, digitos) {
  let s = `<span class="rod" id="${id}" data-layout-ignore>`;
  for (let i = 0; i < digitos; i++) {
    s += `<span class="rod-c"><span class="rod-s" id="${id}-${i}">${[...Array(10).keys()].map((d) => `<b>${d}</b>`).join("")}</span></span>`;
  }
  return s + `</span>`;
}
function rodar(id, digitos, valor, t, dur = 0.8) {
  const s = String(valor).padStart(digitos, "0");
  for (let i = 0; i < digitos; i++) {
    push(`tl.to("#${id}-${i}",{yPercent:${-10 * +s[i]},duration:${dur + i * 0.15},ease:"power3.out"},${at(t)});`);
  }
}

// ---------- cámara ----------
// La cámara mira al punto (cx,cy) del mundo con zoom s. El mundo se mueve al revés.
const cam = { cx: 540, cy: 960, s: 1 };
const camXY = (cx, cy, s) => ({ x: r3(540 - cx * s), y: r3(960 - cy * s) });
function camSet(cx, cy, s) {
  Object.assign(cam, { cx, cy, s });
  const p = camXY(cx, cy, s);
  push(`tl.set("#mundo",{x:${p.x},y:${p.y},scale:${s},transformOrigin:"0 0"},0);`);
  push(`tl.set("#paralaje",{x:${r3(p.x * 0.35)},y:${r3(p.y * 0.35)}},0);`);
}
function camTo(t, cx, cy, s, dur, { ease = "power2.inOut", blur = 0 } = {}) {
  const p = camXY(cx, cy, s);
  push(`tl.to("#mundo",{x:${p.x},y:${p.y},scale:${s},duration:${r3(dur)},ease:"${ease}"},${at(t)});`);
  push(`tl.to("#paralaje",{x:${r3(p.x * 0.35)},y:${r3(p.y * 0.35)},duration:${r3(dur)},ease:"${ease}"},${at(t)});`);
  if (blur) {
    push(`tl.to("#mundo",{filter:"blur(${blur}px)",duration:${r3(dur * 0.45)},ease:"power2.in"},${at(t)});`);
    push(`tl.to("#mundo",{filter:"blur(0px)",duration:${r3(dur * 0.55)},ease:"power2.out"},${at(t + dur * 0.45)});`);
    sfx.push({ f: "whoosh", t: t + dur * 0.3 });
  }
  Object.assign(cam, { cx, cy, s });
}
const sfx = []; // efectos de sonido {f, t}

// ---------- MUNDO ----------
// Coordenadas del mundo (px). La pantalla útil (fuera de zonas seguras) es x 60..1020, y 420..1500
// cuando la cámara está a zoom 1 y centrada.
let html = [];
const add = (s) => html.push(s);

// --- Estación 0: gancho ---
const tareasNov = [
  "Responder correos", "Llamar al banco", "Comprar pan", "Ir al gimnasio",
  "Pagar facturas", "Hacer el informe", "Ordenar cajones", "Lavar el coche",
  "Pedir cita", "Regar plantas", "Leer un libro", "Revisar gastos",
];
add(`
<div class="card app" id="app0" style="left:210px;top:430px;width:660px;height:640px">
  <div class="app-h">${icon("list-checks-fill", "ico-h")}<span>Mis tareas</span>
    <span class="badge rojo" id="b0">${rodillo("r0", 2)}</span></div>
  <div class="app-list"><div class="app-scroll" id="sc0">
    ${tareasNov.map((t, i) => `<div class="row" id="row0-${i}"><span class="chk"></span>${t}</div>`).join("")}
  </div></div>
</div>
${[0, 1, 2, 3, 4].map((i) => `<div class="chip" data-layout-allow-occlusion id="cae${i}" style="left:${330 + (i % 2) * 60}px;top:${640 + i * 70}px">${tareasNov[(i * 5 + 2) % 12]}</div>`).join("")}
<div class="app-clock" id="clk0" style="left:790px;top:560px">${icon("clock-fill")}</div>
<div class="pos" id="nov-pos" style="left:425px;top:1085px">${personaje("nov", NOVATO)}</div>
<div class="pos" id="pro-pos" style="left:640px;top:1085px">${personaje("pro", PRO)}</div>
<div class="tag rojo" id="tag-nov" style="left:200px;top:965px">NOVATO</div>
<div class="tag verde" id="tag-pro" style="left:680px;top:965px">PRO</div>
`);

// --- Estación 1: cabecera del duelo 1 ---
const S1 = { x: 540, y: 2620 };
add(`
<div class="card duelo" id="h1" style="left:${S1.x - 450}px;top:${S1.y - 190}px;width:900px;height:380px">
  <div class="num" id="h1-num">1</div>
  <div class="h-txt"><div class="h-sub">DUELO</div>
    <div class="h-word" id="h1-word">APUNTAR</div>
    <div class="h-line" id="h1-line"></div></div>
  <div class="lapiz" id="h1-lapiz">${icon("pencil-simple-fill")}</div>
</div>`);

// camino que une las estaciones
const camino = `M 540 1530 C 540 1760, 980 1760, 980 2000 S 540 2240, 540 2430`;
add(`<svg class="camino" width="3000" height="6000" viewBox="0 0 3000 6000" overflow="visible">
  <path id="camino" d="${camino}" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round" stroke-dasharray="1 0"/>
  <path id="camino-glow" d="${camino}" fill="none" stroke="#22c55e" stroke-opacity=".25" stroke-width="40" stroke-linecap="round"/>
</svg>`);

// ---------- ANIMACIÓN ----------
// Frase 1 (gancho): "Tu lista de tareas te está haciendo perder el tiempo."
camSet(540, 960, 1.0);
push(`tl.fromTo("#app0",{scale:1.3,rotation:-8,clipPath:"inset(0% 0% 0% 0% round 44px)"},{scale:1,rotation:0,duration:0.6,ease:"expo.out"},0);`);
sfx.push({ f: "impact", t: 0.02 });
push(`tl.fromTo("#app0 .row",{x:-60},{x:0,duration:0.4,stagger:0.04,ease:"power3.out"},0);`);
push(`tl.fromTo("#nov-in",{y:0},{y:0},0);`);
// "lista": la lista empieza a bajar sin fin y el contador gira
push(`tl.to("#sc0",{y:-460,duration:${r3(P("perder") - P("lista"))},ease:"power1.in"},${at(P("lista"))});`);
rodar("r0", 2, 40, P("lista"), 1.4);
sfx.push({ f: "pop", t: P("lista") });
// "tareas": el novato mira hacia arriba, preocupado
push(`tl.to("#nov-head",{rotation:-12,svgOrigin:"100 140",duration:0.3,ease:"power2.out",overwrite:"auto"},${at(P("tareas"))});`);
cara("nov", P("tareas"), true);
// "perder": las tareas se salen de la app y le caen encima
[0, 1, 2, 3, 4].forEach((i) => {
  const t = P("perder") + i * 0.07;
  push(`tl.fromTo("#cae${i}",{opacity:0,scale:0.6,x:0,y:0,rotation:0},{opacity:1,scale:1,x:${(i % 2 ? 1 : -1) * 30 + 40 - i * 6},y:${560 - i * 62},rotation:${(i % 2 ? 1 : -1) * (8 + i * 4)},duration:0.55,ease:"power2.in"},${at(t)});`);
});
push(`tl.to("#nov-in",{scaleY:0.82,scaleX:1.1,transformOrigin:"50% 100%",duration:0.12,ease:"power2.in"},${at(P("perder") + 0.5)});`);
push(`tl.to("#nov-in",{scaleY:1,scaleX:1,duration:0.4,ease:"elastic.out(1,0.45)"},${at(P("perder") + 0.62)});`);
sfx.push({ f: "pop2", t: P("perder") + 0.5 });
push(`tl.to("#app0",{rotation:-3,duration:0.3,ease:"power2.out"},${at(P("perder"))});`);
// "tiempo": el reloj gira loco y se pone rojo
push(`tl.fromTo("#clk0",{scale:0,rotation:-90},{scale:1,rotation:0,duration:0.35,ease:"back.out(2)"},${at(P("tiempo"))});`);
push(`tl.to("#clk0 svg",{rotation:720,duration:1.2,ease:"power2.inOut"},${at(P("tiempo") + 0.1)});`);

// Frase 2: "Mira la diferencia entre un novato y un pro."
camTo(P("mira") - 0.15, 540, 990, 0.9, 0.9, { ease: "power3.inOut" });
push(`tl.to("#app0",{rotation:0,clipPath:"inset(0% 0% 47.2% 0% round 44px)",duration:0.6,ease:"power3.inOut"},${at(P("mira"))});`);
// el novato se aparta a la izquierda (con las tareas encima)
push(`tl.to(["#nov-pos","#cae0","#cae1","#cae2","#cae3","#cae4"],{x:"-=215",duration:0.7,ease:"power2.inOut"},${at(P("mira") + 0.1)});`);
andar("nov", P("mira") + 0.1, P("mira") + 0.8, 0.35, 22);
push(`tl.fromTo("#tag-nov",{scale:0,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"back.out(2.2)"},${at(P("novato"))});`);
sfx.push({ f: "pop", t: P("novato") });
brazo("nov", "R", -150, P("novato")); // saluda/levanta la mano
brazo("nov", "R", -4, P("novato") + 0.6, 0.4);
// el pro entra corriendo y frena justo en "pro"
push(`tl.fromTo("#pro-pos",{x:800},{x:0,duration:${r3(P("pro") - P("entre") + 0.05)},ease:"power2.out"},${at(P("entre"))});`);
andar("pro", P("entre"), P("pro") + 0.05, 0.22, 38);
push(`tl.fromTo("#pro-in",{rotation:0},{rotation:-6,transformOrigin:"50% 100%",duration:0.12,yoyo:true,repeat:1,ease:"power2.out"},${at(P("pro"))});`);
push(`tl.fromTo("#tag-pro",{scale:0,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"back.out(2.2)"},${at(P("pro"))});`);
sfx.push({ f: "pop", t: P("pro") });
brazo("pro", "L", 140, P("pro") + 0.1);
// el novato mira al pro
push(`tl.to("#nov-head",{rotation:10,svgOrigin:"100 140",duration:0.35,ease:"power2.out",overwrite:"auto"},${at(P("pro"))});`);

// Frase 3: "Duelo uno: apuntar." — el camino se dibuja y la cámara viaja
const tViaje = P("duelo", 1) - 0.1, dViaje = P("apuntar") - tViaje;
push(`tl.fromTo("#camino",{strokeDashoffset:"var(--L)"},{strokeDashoffset:0,duration:${r3(dViaje)},ease:"power2.inOut"},${at(tViaje)});`);
push(`tl.fromTo("#camino-glow",{strokeDashoffset:"var(--L)"},{strokeDashoffset:0,duration:${r3(dViaje)},ease:"power2.inOut"},${at(tViaje)});`);
camTo(tViaje, S1.x, S1.y + 30, 1, dViaje, { ease: "power2.inOut", blur: 6 });
push(`tl.fromTo("#h1",{scale:0.7,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"expo.out"},${at(P("duelo", 1) + 0.15)});`);
push(`tl.fromTo("#h1-num",{scale:0,rotation:-180},{scale:1,rotation:0,duration:0.45,ease:"back.out(1.8)"},${at(P("uno"))});`);
sfx.push({ f: "pop", t: P("uno") });
// "apuntar": la palabra se escribe con el lápiz
const dEsc = Math.max(0.45, E("apuntar") - P("apuntar"));
push(`tl.fromTo("#h1-word",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:${r3(dEsc)},ease:"none"},${at(P("apuntar"))});`);
push(`tl.fromTo("#h1-lapiz",{x:0,y:0,rotation:0},{x:430,y:0,duration:${r3(dEsc)},ease:"none"},${at(P("apuntar"))});`);
push(`tl.fromTo("#h1-lapiz",{rotation:-6},{rotation:6,duration:0.08,yoyo:true,repeat:${Math.round(dEsc / 0.08)},ease:"sine.inOut"},${at(P("apuntar"))});`);
push(`tl.to("#h1-lapiz",{scale:0,opacity:0,duration:0.25,ease:"power3.in"},${at(P("apuntar") + dEsc + 0.05)});`);
push(`tl.fromTo("#h1-line",{scaleX:0},{scaleX:1,transformOrigin:"0 50%",duration:0.35,ease:"power3.out"},${at(E("apuntar"))});`);
sfx.push({ f: "teclas", t: P("apuntar") });


// =====================================================================
// RESTO DEL VÍDEO: duelos 1-3, clímax y llamada a la acción
// =====================================================================

// --- utilidades de escena ---
const segs = [];
function segmento(id, d) {
  segs.push(`<path class="seg" id="${id}" d="${d}" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round"/>
  <path class="seg" id="${id}-g" d="${d}" fill="none" stroke="#22c55e" stroke-opacity=".25" stroke-width="40" stroke-linecap="round"/>`);
}
function dibujar(id, t, dur) {
  push(`tl.fromTo(["#${id}","#${id}-g"],{strokeDashoffset:(i,el)=>el.getTotalLength()},{strokeDashoffset:0,duration:${r3(dur)},ease:"power2.inOut"},${at(t)});`);
}
let nWhoosh = 0;
const WH = ["whoosh", "whoosh2", "whoosh3"];
function viaje(t, dur, cx, cy, s, seg, blur = 6) {
  if (seg) dibujar(seg, t, dur);
  camTo(t, cx, cy, s, dur, { ease: "power2.inOut", blur });
  if (blur) sfx[sfx.length - 1].f = WH[nWhoosh++ % 3];
}
function fila(id, texto, { pill = "", cls = "" } = {}) {
  return `<div class="row ${cls}" id="${id}"><span class="chk" id="${id}-c">${icon("check-bold", "chk-i")}</span><span class="rt">${texto}<i class="strike" id="${id}-s"></i></span>${pill ? `<span class="pill" id="${id}-p">${pill}</span>` : ""}</div>`;
}
function tachar(id, t) {
  push(`tl.to("#${id}-c",{backgroundColor:"#22c55e",borderColor:"#22c55e",duration:0.15},${at(t)});`);
  push(`tl.fromTo("#${id}-c .chk-i",{scale:0,opacity:1},{scale:1,opacity:1,duration:0.3,ease:"back.out(2.5)"},${at(t)});`);
  push(`tl.fromTo("#${id}-s",{scaleX:0,opacity:1},{scaleX:1,opacity:1,transformOrigin:"0 50%",duration:0.25,ease:"power2.out"},${at(t + 0.05)});`);
  push(`tl.to("#${id} .rt",{color:"#9ca3af",duration:0.2},${at(t + 0.05)});`);
  sfx.push({ f: "click", t });
}
function cabecera(id, x, y, simbolo, sub, palabra, numCls = "") {
  const fsz = Math.round(Math.min(112, 560 / (palabra.length * 0.68)));
  add(`<div class="card duelo" id="${id}" style="left:${x - 470}px;top:${y - 190}px;width:940px;height:380px">
  <div class="num ${numCls}" id="${id}-num">${simbolo}</div>
  <div class="h-txt"><div class="h-sub">${sub}</div><div class="h-word" id="${id}-word" style="font-size:${fsz}px">${palabra}</div><div class="h-line" id="${id}-line"></div></div>
</div>`);
}
function animCabecera(id, tNum, tPal, tFin) {
  push(`tl.fromTo("#${id}",{scale:0.7,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"expo.out"},${at(tNum - 0.3)});`);
  push(`tl.fromTo("#${id}-num",{scale:0,rotation:-180},{scale:1,rotation:0,duration:0.45,ease:"back.out(1.8)"},${at(tNum)});`);
  sfx.push({ f: "pop", t: tNum });
  const d = Math.max(0.4, tFin - tPal);
  push(`tl.fromTo("#${id}-word",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:${r3(d)},ease:"power1.inOut"},${at(tPal)});`);
  push(`tl.fromTo("#${id}-line",{scaleX:0},{scaleX:1,transformOrigin:"0 50%",duration:0.35,ease:"power3.out"},${at(tPal + d * 0.6)});`);
  sfx.push({ f: "teclas", t: tPal });
}
const pj = (id, c, x, y) => add(`<div class="pos" id="${id}-pos" style="left:${x}px;top:${y}px">${personaje(id, c)}</div>`);
const vivos = ["nov", "pro"];
const persona = (id, c, x, y) => { pj(id, c, x, y); vivos.push(id); };
function cursorEn(id, x0, y0, x1, y1, t, dur = 0.45) {
  push(`tl.fromTo("#${id}",{x:${x0},y:${y0},opacity:0},{x:${x1},y:${y1},opacity:1,duration:${dur},ease:"power3.out"},${at(t)});`);
  push(`tl.to("#${id}",{scale:0.82,duration:0.08,yoyo:true,repeat:1,ease:"power2.inOut"},${at(t + dur)});`);
  sfx.push({ f: "click", t: t + dur });
}

// geometría de cada duelo
const DY = [0, 2620, 5120, 7620];
const panelN = (k) => ({ cx: 540, cy: DY[k] + 1250 });
const panelP = (k) => ({ cx: 1640, cy: DY[k] + 1250 });
const tl0 = (p) => ({ x: p.cx - 480, y: p.cy - 540 }); // esquina sup. izq. del encuadre
for (const k of [1, 2, 3]) {
  const Y = DY[k], n = tl0(panelN(k)), p = tl0(panelP(k));
  segmento(`s${k}a`, `M 540 ${Y + 190} C 540 ${Y + 330}, 560 ${Y + 420}, 540 ${n.y + 10}`);
  segmento(`s${k}b`, `M ${n.x + 940} ${n.y + 380} C ${n.x + 1080} ${n.y + 300}, ${p.x + 160} ${p.y + 460}, ${p.x + 300} ${p.y + 380}`);
  if (k < 3) segmento(`s${k}c`, `M ${p.x + 620} ${p.y + 1040} C ${p.x + 620} ${p.y + 1320}, 560 ${DY[k + 1] - 600}, 540 ${DY[k + 1] - 190}`);
}
const Y4 = 10500, Y5 = Y4 + 2750;
segmento("s3c", `M ${tl0(panelP(3)).x + 620} ${tl0(panelP(3)).y + 1040} C 1800 ${Y4 - 700}, 560 ${Y4 - 600}, 540 ${Y4 - 190}`);
segmento("s4a", `M 540 ${Y4 + 190} C 540 ${Y4 + 330}, 540 ${Y4 + 450}, 540 ${Y4 + 600}`);
segmento("s4b", `M 960 ${Y4 + 1150} C 1100 ${Y4 + 1050}, 1200 ${Y4 + 1250}, 1400 ${Y4 + 1150}`);
segmento("s4c", `M 1640 ${Y4 + 1690} C 1640 ${Y4 + 1950}, 1700 ${Y5 - 700}, 1640 ${Y5 - 520}`);

// ---------------- DUELO 1 ----------------
{
  const k = 1, N = panelN(k), Pp = panelP(k), n = tl0(N), p = tl0(Pp);
  const lista = ["Responder correos", "Llamar al banco", "Comprar pan", "Ir al gimnasio", "Pagar facturas", "Hacer el informe",
    "Ordenar cajones", "Lavar el coche", "Pedir cita", "Regar plantas", "Leer un libro", "Revisar gastos", "Cortar el pelo", "Arreglar la silla"];
  add(`<div class="card app" id="a1" style="left:${n.x + 300}px;top:${n.y + 20}px;width:640px;height:760px">
  <div class="app-h">${icon("list-checks-fill", "ico-h")}<span>Todo</span><span class="badge rojo">${rodillo("r1", 2)}</span></div>
  <div class="app-list"><div class="app-scroll" id="sc1">${lista.map((t, i) => fila(`f1-${i}`, t)).join("")}</div></div></div>`);
  persona("nov1", NOVATO, n.x + 40, n.y + 620);
  add(`<div class="card app" id="b1" style="left:${p.x + 300}px;top:${p.y + 60}px;width:640px;height:620px">
  <div class="app-h">${icon("star-fill", "ico-h ico-oro")}<span>Hoy</span><span class="badge verde">${rodillo("r1b", 1)}</span></div>
  <div class="app-list">${["Hacer el informe", "Llamar al banco", "Pagar facturas"].map((t, i) => `<div class="row big3" id="g1-${i}"><span class="estrella" id="g1-${i}-e">${icon("star-fill")}</span>${t}</div>`).join("")}</div></div>
  <div class="cursor" id="cur1" style="left:${p.x + 840}px;top:${p.y + 220}px">${icon("cursor-fill")}</div>`);
  persona("pro1", PRO, p.x + 40, p.y + 620);

  // frase 4: novato
  const t4 = Math.max(E("apuntar") + 0.05, F(3) - 0.4);
  viaje(t4, P("novato", 2) + 0.1 - t4, N.cx, N.cy, 1, "s1a", 4);
  push(`tl.fromTo("#a1",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(P("novato", 2) - 0.2)});`);
  const tA = P("apunta", 1), tC = P("cuarenta");
  lista.forEach((_, i) => {
    const t = tA + (i * (tC - tA)) / lista.length;
    push(`tl.fromTo("#f1-${i}",{opacity:0,x:-50},{opacity:1,x:0,duration:0.2,ease:"power3.out"},${at(t)});`);
    if (i >= 6) push(`tl.to("#sc1",{y:${-92 * (i - 5)},duration:0.18,ease:"power2.out"},${at(t)});`);
  });
  sfx.push({ f: "teclas", t: tA });
  rodar("r1", 2, 40, P("todo"), Math.max(0.6, tC - P("todo")));
  push(`tl.to("#a1",{boxShadow:"0 0 0 10px #ef4444, 0 30px 80px rgba(0,0,0,.5)",duration:0.25},${at(tC)});`);
  push(`tl.fromTo("#a1",{rotation:0},{rotation:2,duration:0.07,yoyo:true,repeat:5,ease:"sine.inOut"},${at(P("cosas"))});`);
  sfx.push({ f: "pop", t: tC });
  cara("nov1", P("sola"), true);
  brazo("nov1", "R", -40, tA, 0.3);
  push(`tl.to("#nov1-head",{rotation:-14,svgOrigin:"100 140",duration:0.3,ease:"power2.out"},${at(tC)});`);

  // frase 5: pro
  viaje(F(4) - 0.35, 0.6, Pp.cx, Pp.cy, 1, "s1b", 4);
  push(`tl.fromTo("#b1",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(4) - 0.1)});`);
  cursorEn("cur1", 140, 260, 0, 0, P("elige") - 0.2);
  [0, 1, 2].forEach((i) => {
    const t = P("tres", 1) + i * 0.12;
    push(`tl.fromTo("#g1-${i}",{opacity:0,scale:0.8},{opacity:1,scale:1,duration:0.3,ease:"back.out(1.8)"},${at(t)});`);
    push(`tl.fromTo("#g1-${i}-e",{scale:0,rotation:-120,color:"#d1d5db"},{scale:1,rotation:0,color:"#f59e0b",duration:0.4,ease:"back.out(2.4)"},${at(P("importantes") + i * 0.1)});`);
  });
  sfx.push({ f: "pop", t: P("tres", 1) });
  sfx.push({ f: "pop2", t: P("importantes") });
  rodar("r1b", 1, 3, P("tres", 1), 0.6);
  push(`tl.to("#cur1",{opacity:0,duration:0.2},${at(P("importantes"))});`);
  push(`tl.fromTo("#b1",{boxShadow:"0 0 0 0px #22c55e, 0 30px 80px rgba(0,0,0,.5)"},{boxShadow:"0 0 0 10px #22c55e, 0 30px 80px rgba(0,0,0,.5)",duration:0.25},${at(P("hoy"))});`);
  brazo("pro1", "R", -150, P("hoy"));
  push(`tl.fromTo("#pro1-in",{y:0},{y:-30,duration:0.18,yoyo:true,repeat:1,ease:"power2.out"},${at(P("hoy"))});`);
  // se aleja para enseñar el duelo entero
  camTo(P("hoy") + 0.3, 1090, DY[1] + 800, 0.46, 0.5, { ease: "power2.inOut" });
}

// ---------------- DUELO 2 ----------------
cabecera("h2", 540, DY[2], "2", "DUELO", "EMPEZAR");
{
  const k = 2, N = panelN(k), Pp = panelP(k), n = tl0(N), p = tl0(Pp);
  viaje(P("duelo", 2) - 0.1, P("empezar") - P("duelo", 2) + 0.1, 540, DY[2] + 30, 1, "s1c", 7);
  animCabecera("h2", P("dos", 1), P("empezar"), E("empezar"));
  const faciles = ["Comprar pan", "Regar plantas", "Ordenar cajones", "Pedir cita"];
  add(`<div class="card app" id="a2" style="left:${n.x + 300}px;top:${n.y + 20}px;width:640px;height:760px">
  <div class="app-h">${icon("list-checks-fill", "ico-h")}<span>Hoy</span></div>
  <div class="app-list"><div class="row grande" id="f2-big"><span class="flag">${icon("flag-fill")}</span><span class="rt">EL INFORME</span></div>
  ${faciles.map((t, i) => fila(`f2-${i}`, t)).join("")}</div></div>`);
  persona("nov2", NOVATO, n.x + 40, n.y + 620);
  add(`<div class="bloque" id="blk2" style="left:${p.x + 300}px;top:${p.y + 60}px">${icon("barbell-fill", "ico-blk")}<span>EL INFORME</span>
  <div class="barra"><i id="bar2"></i></div><div class="ok" id="ok2">${icon("check-circle-fill")}</div></div>
  <div class="movil" id="mov2" style="left:${p.x + 740}px;top:${p.y + 560}px">${icon("device-mobile-fill")}</div>
  ${["Nuevo mensaje", "3 me gusta", "Oferta"].map((t, i) => `<div class="noti" id="n2-${i}" style="left:${p.x + 290}px;top:${p.y + 560 + i * 100}px">${icon("bell-fill")}<span>${t}</span></div>`).join("")}`);
  persona("pro2", PRO, p.x + 40, p.y + 620);

  // frase 7: novato empieza por lo fácil
  viaje(Math.max(E("empezar") + 0.05, F(6) - 0.4), 0.6, N.cx, N.cy, 1, "s2a", 4);
  push(`tl.fromTo("#a2",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(6) - 0.15)});`);
  faciles.forEach((_, i) => tachar(`f2-${i}`, P("facil") + i * 0.28));
  cara("nov2", P("facil"), false);
  brazo("nov2", "R", -140, P("productivo"));
  push(`tl.fromTo("#f2-big",{scale:1,backgroundColor:"#ffffff",color:"#0b0d12"},{scale:1.08,backgroundColor:"#ef4444",color:"#ffffff",duration:0.6,ease:"power2.out"},${at(P("empieza"))});`);
  push(`tl.to("#f2-big",{scale:1.16,duration:0.35,yoyo:true,repeat:3,ease:"sine.inOut"},${at(P("sentirse"))});`);

  // frase 8: el pro hace primero lo difícil
  viaje(F(7) - 0.35, 0.6, Pp.cx, Pp.cy, 1, "s2b", 4);
  push(`tl.fromTo("#blk2",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(7) - 0.1)});`);
  push(`tl.fromTo("#mov2",{scale:0,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"back.out(2)"},${at(F(7) - 0.1)});`);
  brazo("pro2", "R", -75, P("hace", 1), 0.3);
  brazo("pro2", "L", 75, P("hace", 1), 0.3);
  push(`tl.to("#pro2-in",{rotation:8,transformOrigin:"50% 100%",duration:0.3,ease:"power2.out"},${at(P("primero"))});`);
  push(`tl.fromTo("#bar2",{scaleX:0},{scaleX:1,transformOrigin:"0 50%",duration:${r3(P("dificil") - P("primero"))},ease:"power1.inOut"},${at(P("primero"))});`);
  push(`tl.fromTo("#ok2",{scale:0,rotation:-90},{scale:1,rotation:0,duration:0.4,ease:"back.out(2.2)"},${at(P("dificil"))});`);
  sfx.push({ f: "pop", t: P("dificil") });
  push(`tl.to("#pro2-in",{rotation:0,duration:0.3,ease:"power2.out"},${at(P("dificil") + 0.1)});`);
  [0, 1, 2].forEach((i) => {
    const t = P("antes", 1) + i * 0.18;
    push(`tl.fromTo("#n2-${i}",{opacity:0,y:-60,scale:0.8},{opacity:1,y:0,scale:1,duration:0.3,ease:"back.out(1.8)"},${at(t)});`);
    sfx.push({ f: "noti", t });
  });
  push(`tl.fromTo("#mov2",{rotation:0},{rotation:8,duration:0.05,yoyo:true,repeat:9,ease:"sine.inOut"},${at(P("antes", 1))});`);
  // en "móvil" lo pone boca abajo y las notificaciones se apagan
  push(`tl.to("#mov2",{rotation:180,color:"#475569",duration:0.4,ease:"back.out(1.6)"},${at(P("movil"))});`);
  push(`tl.to(["#n2-0","#n2-1","#n2-2"],{opacity:0.25,scale:0.9,duration:0.3},${at(P("movil"))});`);
  push(`tl.to("#pro2-head",{rotation:-12,svgOrigin:"100 140",duration:0.3,ease:"power2.out"},${at(P("movil"))});`);
  brazo("pro2", "R", -4, P("movil"), 0.4);
  brazo("pro2", "L", 4, P("movil"), 0.4);
  camTo(E("movil") + 0.1, 1090, DY[2] + 800, 0.46, 0.45, { ease: "power2.inOut" });
}

// ---------------- DUELO 3 ----------------
cabecera("h3", 540, DY[3], "3", "DUELO", "LO PEQUEÑO");
{
  const k = 3, N = panelN(k), Pp = panelP(k), n = tl0(N), p = tl0(Pp);
  viaje(P("duelo", 3) - 0.1, P("pequeno") - P("duelo", 3) + 0.1, 540, DY[3] + 30, 1, "s2c", 7);
  animCabecera("h3", P("tres", 2), P("lo", 3), E("pequeno"));
  const peques = ["Decir «ok»", "Guardar", "Mover cita", "Tirar papel", "Cerrar web"];
  add(`<div class="card app" id="a3" style="left:${n.x + 300}px;top:${n.y + 20}px;width:640px;height:760px">
  <div class="app-h">${icon("list-checks-fill", "ico-h")}<span>Pendiente</span></div>
  <div class="app-list">${peques.map((t, i) => fila(`f3-${i}`, t, { pill: "1 min", cls: "conpill" })).join("")}</div></div>`);
  persona("nov3", NOVATO, n.x + 40, n.y + 620);
  add(`<div class="card crono" id="cr3" style="left:${p.x + 300}px;top:${p.y + 20}px;width:640px;height:520px">
  <div class="cr-t" id="cr3-t">REGLA DE LOS</div>
  <div class="cr-n">${icon("timer-fill", "ico-cr")}${rodillo("rm", 1)}<b>:</b>${rodillo("rs", 2)}</div>
  <div class="cr-sub">MINUTOS</div></div>
  <div class="chip2" id="ch3" style="left:${p.x + 320}px;top:${p.y + 600}px"><span class="chk" id="ch3-c">${icon("check-bold", "chk-i")}</span>Decir «ok»</div>`);
  persona("pro3", PRO, p.x + 40, p.y + 620);

  // frase 10: el novato lo apunta todo
  viaje(Math.max(E("pequeno") + 0.05, F(9) - 0.4), 0.6, N.cx, N.cy, 1, "s3a", 4);
  push(`tl.fromTo("#a3",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(9) - 0.15)});`);
  const tA = P("apunta", 2), tM = P("minuto");
  peques.forEach((_, i) => {
    const t = tA + (i * (tM - tA)) / peques.length;
    push(`tl.fromTo("#f3-${i}",{opacity:0,y:-120},{opacity:1,y:0,duration:0.3,ease:"bounce.out"},${at(t)});`);
    sfx.push({ f: "pop2", t });
  });
  push(`tl.to("#a3 .pill",{backgroundColor:"#ef4444",color:"#ffffff",scale:1.15,duration:0.25,stagger:0.05,ease:"back.out(2)"},${at(tM)});`);
  cara("nov3", P("hasta"), true);
  push(`tl.to("#nov3-in",{scaleY:0.9,scaleX:1.05,transformOrigin:"50% 100%",duration:0.3,ease:"power2.out"},${at(tM)});`);

  // frase 11: regla de los dos minutos
  viaje(F(10) - 0.35, 0.6, Pp.cx, Pp.cy, 1, "s3b", 4);
  push(`tl.fromTo("#cr3",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(10) - 0.1)});`);
  push(`tl.fromTo("#cr3-t",{opacity:0,y:20},{opacity:1,y:0,duration:0.3,ease:"power3.out"},${at(P("regla"))});`);
  rodar("rm", 1, 2, P("dos", 2), 0.5);
  sfx.push({ f: "pop", t: P("dos", 2) });
  push(`tl.fromTo("#ch3",{opacity:0,x:120},{opacity:1,x:0,duration:0.35,ease:"power3.out"},${at(P("si"))});`);
  push(`tl.to("#ch3-c",{backgroundColor:"#22c55e",borderColor:"#22c55e",duration:0.15},${at(P("ya"))});`);
  push(`tl.fromTo("#ch3-c .chk-i",{scale:0,opacity:1},{scale:1,opacity:1,duration:0.3,ease:"back.out(2.5)"},${at(P("ya"))});`);
  push(`tl.to("#ch3",{backgroundColor:"#dcfce7",duration:0.2},${at(P("ya"))});`);
  sfx.push({ f: "click", t: P("ya") });
  brazo("pro3", "R", -150, P("ya"));
  push(`tl.fromTo("#pro3-in",{y:0},{y:-30,duration:0.18,yoyo:true,repeat:1,ease:"power2.out"},${at(P("ya"))});`);
}

// ---------------- CLÍMAX ----------------
// frase 12: "Y ahora, el truco más potente." — la cámara enseña todo el camino y salta al truco
camTo(P("ahora") - 0.1, 1090, 5600, 0.16, 0.65, { ease: "power3.inOut" });
cabecera("h4", 540, Y4, icon("lightning-fill"), "AHORA", "EL TRUCO", "num-oro");
viaje(P("truco") - 0.05, P("potente") - P("truco") + 0.05, 540, Y4 + 30, 1, "s3c", 9);
push(`tl.fromTo("#h4",{scale:0.6,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"expo.out"},${at(P("truco") + 0.15)});`);
push(`tl.fromTo("#h4-num",{scale:0,rotation:-180},{scale:1,rotation:0,duration:0.45,ease:"back.out(1.8)"},${at(P("mas", 2))});`);
push(`tl.fromTo("#h4-word",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.45,ease:"power1.inOut"},${at(P("potente"))});`);
push(`tl.fromTo("#h4-line",{scaleX:0},{scaleX:1,transformOrigin:"0 50%",duration:0.35,ease:"power3.out"},${at(P("potente") + 0.3)});`);
sfx.push({ f: "riser", t: P("ahora") });
sfx.push({ f: "impact2", t: P("potente") });

// frases 13-14: el cerebro y el efecto Zeigarnik
add(`<div class="cerebro" id="br" style="left:350px;top:${Y4 + 610}px">${icon("brain-fill")}</div>
<div class="card tarea" id="tm" style="left:160px;top:${Y4 + 1060}px;width:760px;height:220px">
  <div class="tm-h">${icon("flag-fill", "ico-flag")}<span>El informe</span><b id="tm-pc">${rodillo("rp", 2)}%</b></div>
  <div class="barra"><i id="bar4"></i></div></div>
<div class="card zeig" id="zg" style="left:110px;top:${Y4 + 1340}px;width:860px;height:300px">
  <div class="zg-a" id="zg-a">EFECTO</div><div class="zg-b" id="zg-b">ZEIGARNIK</div></div>`);
viaje(F(12) - 0.4, 0.6, 540, Y4 + 1150, 1, "s4a", 4);
push(`tl.fromTo("#br",{scale:0,rotation:-20},{scale:1,rotation:0,duration:0.55,ease:"back.out(1.7)"},${at(P("cerebro"))});`);
sfx.push({ f: "pop", t: P("cerebro") });
push(`tl.fromTo("#br",{filter:"drop-shadow(0 0 0px #f472b6)"},{filter:"drop-shadow(0 0 40px #f472b6)",duration:0.5,yoyo:true,repeat:5,ease:"sine.inOut"},${at(P("recordar"))});`);
push(`tl.fromTo("#tm",{opacity:0,y:40},{opacity:1,y:0,duration:0.4,ease:"power3.out"},${at(P("dejas"))});`);
push(`tl.fromTo("#bar4",{scaleX:0},{scaleX:0.5,transformOrigin:"0 50%",duration:0.6,ease:"power2.out"},${at(P("medias"))});`);
rodar("rp", 2, 50, P("medias"), 0.6);
sfx.push({ f: "pop2", t: P("medias") });
push(`tl.fromTo("#zg",{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.35,ease:"power3.out"},${at(P("efecto"))});`);
push(`tl.fromTo("#zg-b",{opacity:0,scale:2.2,rotation:-6},{opacity:1,scale:1,rotation:-2,duration:0.35,ease:"power4.in"},${at(P("zeigarnik") - 0.25)});`);
push(`tl.fromTo("#zg",{y:0},{y:10,duration:0.05,yoyo:true,repeat:5,ease:"sine.inOut"},${at(P("zeigarnik") + 0.1)});`);
sfx.push({ f: "impact", t: P("zeigarnik") + 0.1 });

// frase 15: el pro deja escrita la primera acción de mañana
const NT = { cx: 1640, cy: Y4 + 1150 }, nt = tl0(NT);
const nota = "1. Abrir el informe y escribir el título";
add(`<div class="card nota" id="nt" style="left:${nt.x + 300}px;top:${nt.y + 80}px;width:640px;height:640px">
  <div class="app-h">${icon("chat-teardrop-text-fill", "ico-h")}<span>Notas</span><span class="badge verde" id="nt-b">MAÑANA</span></div>
  <div class="nt-txt">${(() => { let i = 0; return nota.split(" ").map((w) => `<span class="nw">${[...w].map((c) => `<span class="lt" id="lt${i++}">${c}</span>`).join("")}</span>`).join(" "); })()}<span class="caret" id="caret"></span></div>
  <div class="ok ok-nt" id="ok4">${icon("check-circle-fill")}</div></div>`);
persona("pro4", PRO, nt.x + 40, nt.y + 620);
viaje(F(14) - 0.35, 0.6, NT.cx, NT.cy, 1, "s4b", 4);
push(`tl.fromTo("#nt",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(14) - 0.1)});`);
{
  const t0 = P("escrita"), t1 = P("antes", 2);
  [...nota.replace(/ /g, "")].forEach((_, i) => push(`tl.fromTo("#lt${i}",{opacity:0},{opacity:1,duration:0.01},${at(t0 + (i * (t1 - t0)) / nota.replace(/ /g, "").length)});`));
  push(`tl.fromTo("#caret",{opacity:1},{opacity:0,duration:0.25,yoyo:true,repeat:${Math.ceil((t1 - t0) / 0.25) + 3},ease:"steps(1)"},${at(t0)});`);
  sfx.push({ f: "teclas", t: t0 });
  sfx.push({ f: "teclas", t: t0 + 1.2 });
  brazo("pro4", "R", -60, t0, 0.3);
}
push(`tl.fromTo("#nt-b",{scale:0},{scale:1,duration:0.35,ease:"back.out(2.2)"},${at(P("manana"))});`);
sfx.push({ f: "pop", t: P("manana") });
push(`tl.fromTo("#ok4",{scale:0,rotation:-90},{scale:1,rotation:0,duration:0.4,ease:"back.out(2.2)"},${at(P("cerrar"))});`);
brazo("pro4", "R", -150, P("cerrar"));
sfx.push({ f: "pop2", t: P("cerrar") });

// ---------------- LLAMADA A LA ACCIÓN ----------------
const CT = { cx: 1640, cy: Y5 }, ct = tl0(CT);
add(`<div class="card coment" id="cm" style="left:${ct.x + 60}px;top:${ct.y + 40}px;width:840px;height:250px">
  <div class="cm-av">${icon("chat-circle-fill")}</div>
  <div class="cm-in"><span class="cm-ph" id="cm-ph">Añade un comentario…</span><span class="cm-tx">${[..."LISTA"].map((c, i) => `<b id="cl${i}">${c}</b>`).join("")}</span></div>
  <div class="cm-send" id="cm-send">${icon("paper-plane-tilt-fill")}</div></div>
<div class="card burbuja" id="bb" style="left:${ct.x + 60}px;top:${ct.y + 330}px;width:540px;height:180px">
  <span class="bb-tx">LISTA</span><span class="bb-h" id="bb-h">${icon("heart-fill")}</span></div>
<div class="avion" id="av" style="left:${ct.x + 700}px;top:${ct.y + 360}px">${icon("paper-plane-tilt-fill")}</div>
<div class="cursor" id="cur5" style="left:${ct.x + 820}px;top:${ct.y + 190}px">${icon("cursor-fill")}</div>`);
persona("nov5", NOVATO, ct.x + 250, ct.y + 620);
persona("pro5", PRO, ct.x + 520, ct.y + 620);
viaje(F(15) - 0.45, 0.65, CT.cx, CT.cy, 1, "s4c", 5);
push(`tl.fromTo("#cm",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"expo.out"},${at(F(15) - 0.15)});`);
push(`tl.to("#cm-ph",{opacity:0,duration:0.1},${at(P("lista", 3))});`);
[..."LISTA"].forEach((_, i) => push(`tl.fromTo("#cl${i}",{opacity:0,y:10},{opacity:1,y:0,duration:0.08},${at(P("lista", 3) + i * 0.07)});`));
sfx.push({ f: "teclas", t: P("lista", 3) });
cursorEn("cur5", 120, 160, 0, 0, P("lista", 3), 0.35);
push(`tl.fromTo("#bb",{opacity:0,scale:0.6,y:-60},{opacity:1,scale:1,y:0,duration:0.4,ease:"back.out(1.8)"},${at(P("y", 3))});`);
push(`tl.fromTo("#bb-h",{scale:0},{scale:1,duration:0.35,ease:"back.out(3)"},${at(P("y", 3) + 0.25)});`);
sfx.push({ f: "pop", t: P("y", 3) });
push(`tl.fromTo("#av",{opacity:0,x:-200,y:60,rotation:-10},{opacity:1,x:0,y:0,rotation:0,duration:0.4,ease:"power3.out"},${at(P("mandaselo") - 0.1)});`);
push(`tl.to("#av",{x:420,y:-260,scale:0.6,opacity:0,duration:0.6,ease:"power3.in"},${at(P("mandaselo") + 0.45)});`);
sfx.push({ f: "whoosh2", t: P("mandaselo") + 0.5 });
push(`tl.to("#cur5",{opacity:0,duration:0.2},${at(P("mandaselo"))});`);
brazo("nov5", "R", -150, P("siempre"));
brazo("pro5", "L", 150, P("siempre") + 0.1);
cara("nov5", P("siempre"), false);
push(`tl.fromTo(["#nov5-in","#pro5-in"],{y:0},{y:-36,duration:0.2,yoyo:true,repeat:3,stagger:0.12,ease:"power2.out"},${at(P("tiempo", 2))});`);
camTo(P("tiempo", 2) + 0.2, CT.cx, CT.cy + 30, 0.92, Math.max(0.5, D - P("tiempo", 2) - 0.25), { ease: "power1.inOut" });

html.unshift(`<svg class="camino" width="3000" height="15000" viewBox="0 0 3000 15000" overflow="visible">${segs.join("\n")}</svg>`);

// la estación del gancho ya no vuelve a verse: se oculta fuera de cámara
push(`tl.set(["#app0","#clk0","#cae0","#cae1","#cae2","#cae3","#cae4","#tag-nov","#tag-pro"],{opacity:0},${at(P("apunta", 1))});`);
// personajes vivos
vivos.forEach((id, i) => vida(id, i % 5));

// partículas del fondo (paralaje)
let part = "";
for (let i = 0; i < 150; i++) {
  const x = (i * 397) % 2600 - 300, y = (i * 709) % 14500 - 300, s = 6 + (i % 5) * 4;
  part += `<i class="pt" id="pt${i}" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"></i>`;
  push(`tl.fromTo("#pt${i}",{y:0},{y:${-30 - (i % 4) * 15},duration:${3 + (i % 3)},ease:"sine.inOut",yoyo:true,repeat:${Math.ceil(D / 3) + 1}},0);`);
}

// ---------- escribir mundo.html ----------
const mundo = `<template>
<style>
#root{position:absolute;inset:0;overflow:hidden;background:#07080c;font-family:Inter,sans-serif}
#fondo-glow{position:absolute;inset:0;background:radial-gradient(120% 45% at 50% 108%,rgba(34,197,94,.30),rgba(34,197,94,.08) 45%,transparent 70%)}
#paralaje{position:absolute;left:0;top:0;width:10px;height:10px}
.pt{position:absolute;border-radius:50%;background:rgba(255,255,255,.10)}
#mundo{position:absolute;left:0;top:0;width:3000px;height:15000px;
  background-image:linear-gradient(rgba(255,255,255,.055) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.055) 2px,transparent 2px);
  background-size:90px 90px;background-position:-600px -600px}
#rejilla{position:absolute;left:-2400px;top:-2400px;width:8000px;height:20000px;background-image:inherit;background-size:inherit;background-position:0 0}
.card{position:absolute;background:#fff;border-radius:44px;box-shadow:0 30px 80px rgba(0,0,0,.5);color:#0b0d12}
.app{overflow:hidden}
.app-h{display:flex;align-items:center;gap:22px;height:150px;padding:0 40px;font-weight:900;font-size:62px;border-bottom:4px solid #eef0f3}
.ico{width:1em;height:1em;flex:none}
.ico-h{color:#0b0d12;font-size:64px}
.badge{margin-left:auto;border-radius:999px;padding:6px 26px;font-size:56px;color:#fff}
.rojo{background:#ef4444}.verde{background:#22c55e}
.rod{display:inline-flex;line-height:1.1em;height:1.1em}
.rod-c{display:inline-block;height:1.1em;overflow:hidden}
.rod-s{display:flex;flex-direction:column}.rod-s b{height:1.1em;font-weight:900}
.app-clock{position:absolute;width:150px;height:150px;border-radius:50%;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:110px;box-shadow:0 14px 40px rgba(239,68,68,.5);z-index:3}
.app-list{position:absolute;left:0;right:0;top:154px;bottom:0;overflow:hidden}
.row{display:flex;align-items:center;gap:26px;height:92px;padding:0 40px;font-size:48px;font-weight:700;border-bottom:3px solid #f1f3f6}
.chk{width:46px;height:46px;border-radius:12px;border:5px solid #c4c9d2;flex:none}
.chip{position:absolute;background:#fff;color:#0b0d12;font-weight:700;font-size:46px;padding:18px 30px;border-radius:24px;border-left:14px solid #ef4444;box-shadow:0 14px 40px rgba(0,0,0,.45);white-space:nowrap;opacity:0;z-index:6}
.pos{position:absolute;width:230px;height:414px;z-index:4}
.pj,.pj-in{position:absolute;inset:0}
.tag{position:absolute;color:#fff;font-weight:900;font-size:64px;padding:10px 34px;border-radius:22px;opacity:0;z-index:7;letter-spacing:.02em}
.duelo{display:flex;align-items:center;gap:44px;padding:0 60px}
.num{width:210px;height:210px;border-radius:50%;background:#0b0d12;color:#fff;font-size:150px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}
.h-sub{font-size:52px;font-weight:700;color:#6b7280;letter-spacing:.12em}
.h-word{font-size:112px;font-weight:900;line-height:1.05;letter-spacing:-.02em;white-space:nowrap}
.h-line{height:14px;width:470px;border-radius:7px;background:#22c55e;margin-top:8px}
.lapiz{position:absolute;left:330px;top:150px;font-size:110px;color:#f59e0b;filter:drop-shadow(0 8px 14px rgba(0,0,0,.3))}
.rt{position:relative;white-space:nowrap}
.strike{position:absolute;left:-6px;right:-6px;top:50%;height:6px;margin-top:-3px;background:#9ca3af;border-radius:3px;opacity:0}
.chk{display:flex;align-items:center;justify-content:center;color:#fff}
.chk-i{font-size:30px;opacity:0}
.pill{margin-left:auto;background:#fef3c7;color:#92400e;font-size:46px;font-weight:900;padding:2px 18px;border-radius:999px;white-space:nowrap}
.ico-oro{color:#f59e0b}
.row.big3{height:150px;font-size:54px;font-weight:900;gap:28px}
.estrella{font-size:64px;color:#d1d5db;display:flex}
.row.grande{height:140px;font-size:60px;font-weight:900;gap:26px;border-radius:24px;margin:10px 16px;border:4px solid #fecaca}
.flag{color:#ef4444;font-size:60px;display:flex}
.bloque{position:absolute;width:640px;height:460px;border-radius:44px;background:#1e293b;color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;font-size:78px;font-weight:900;border:4px solid #334155}
.ico-blk{font-size:130px;color:#f59e0b}
.barra{width:80%;height:34px;border-radius:17px;background:#334155;overflow:hidden}
.barra i{display:block;height:100%;background:#22c55e;border-radius:17px}
.tarea .barra{background:#e5e7eb;margin:0 auto}
.ok{position:absolute;right:-40px;top:-40px;font-size:150px;color:#22c55e;background:#fff;border-radius:50%;display:flex;line-height:0;box-shadow:0 14px 40px rgba(0,0,0,.4)}
.movil{position:absolute;font-size:200px;color:#e5e7eb;display:flex;line-height:0;z-index:3}
.noti{position:absolute;display:flex;align-items:center;gap:18px;background:#fff;color:#0b0d12;font-size:46px;font-weight:700;padding:14px 28px;border-radius:24px;box-shadow:0 14px 40px rgba(0,0,0,.45);white-space:nowrap;z-index:5}
.noti .ico{color:#f59e0b}
.cursor{position:absolute;font-size:110px;color:#0b0d12;display:flex;line-height:0;z-index:9;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 3px #fff) drop-shadow(0 8px 10px rgba(0,0,0,.4))}
.crono{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.cr-t{font-size:60px;font-weight:900;color:#6b7280;letter-spacing:.06em}
.cr-n{display:flex;align-items:center;gap:10px;font-size:190px;font-weight:900;line-height:1}
.ico-cr{font-size:150px;color:#22c55e;margin-right:16px}
.cr-sub{font-size:60px;font-weight:900;color:#22c55e;letter-spacing:.1em}
.chip2{position:absolute;display:flex;align-items:center;gap:24px;background:#fff;color:#0b0d12;font-size:56px;font-weight:900;padding:26px 40px;border-radius:30px;box-shadow:0 14px 40px rgba(0,0,0,.45);white-space:nowrap}
.cerebro{position:absolute;font-size:380px;color:#f472b6;display:flex;line-height:0}
.tarea{display:flex;flex-direction:column;justify-content:center;gap:30px;padding:0 50px}
.tm-h{display:flex;align-items:center;gap:22px;font-size:60px;font-weight:900}
.tm-h b{margin-left:auto;display:flex;color:#ef4444}
.ico-flag{color:#ef4444}
.zeig{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#facc15}
.zg-a{font-size:64px;font-weight:900;letter-spacing:.14em;color:#713f12}
.zg-b{font-size:120px;font-weight:900;letter-spacing:-.02em;line-height:1}
.nota{overflow:visible}
.nota .badge{font-size:44px;padding:4px 20px}
.nt-txt{padding:40px 44px;font-size:64px;font-weight:900;line-height:1.3}
.nw{display:inline-block;white-space:nowrap}.lt{display:inline}
.caret{display:inline-block;width:8px;height:66px;background:#22c55e;margin-left:6px;vertical-align:-8px}
.ok-nt{right:-30px;top:auto;bottom:-30px}
.coment{display:flex;align-items:center;gap:26px;padding:0 34px}
.cm-av{font-size:110px;color:#22c55e;display:flex;line-height:0}
.cm-in{flex:1;height:130px;border-radius:65px;background:#f1f3f6;display:flex;align-items:center;padding:0 40px;position:relative;font-size:64px;font-weight:900}
.cm-ph{position:absolute;left:40px;color:#9ca3af;font-size:46px;font-weight:700;white-space:nowrap}
.cm-tx{display:flex;letter-spacing:.06em}
.cm-send{width:130px;height:130px;border-radius:50%;background:#22c55e;color:#fff;font-size:72px;display:flex;align-items:center;justify-content:center}
.burbuja{display:flex;align-items:center;gap:30px;padding:0 50px;font-size:96px;font-weight:900;border-radius:44px 44px 44px 10px}
.bb-h{margin-left:auto;color:#ef4444;font-size:96px;display:flex}
.avion{position:absolute;font-size:150px;color:#22c55e;display:flex;line-height:0;z-index:8}
.num-oro{background:#facc15;color:#0b0d12}
.camino{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
#camino,#camino-glow{--L:2200}
</style>
<div id="root" data-composition-id="mundo" data-width="1080" data-height="1920">
  <div id="fondo-glow"></div>
  <div id="paralaje">${part}</div>
  <div id="mundo" data-layout-allow-overflow data-layout-allow-overlap>
<div id="rejilla" data-layout-ignore></div>
${html.join("\n")}
  </div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
// longitud real del camino para dibujarlo
document.querySelectorAll("#camino,#camino-glow,.seg").forEach(p=>{const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.setProperty("--L",L);p.style.strokeDashoffset=L;});
${js.join("\n")}
window.__timelines["mundo"] = tl;
</script>
</template>`;

// ---------- SUBTÍTULOS ----------
const CLAVE = {
  lista: "ama", tareas: "ama", tiempo: "rojo", novato: "rojo", pro: "verde", uno: "ama", apuntar: "ama",
  cuarenta: "rojo", tres: "verde", dos: "ama", empezar: "ama", facil: "rojo", dificil: "verde", movil: "rojo",
  pequeno: "ama", minuto: "rojo", minutos: "verde", truco: "ama", cerebro: "ama", medias: "ama",
  zeigarnik: "verde", manana: "verde", comenta: "ama", mandaselo: "verde", potente: "ama",
};
const grupos = [];
const frases = [...new Set(W.map((w) => w.frase))];
for (const f of frases) {
  const ws = W.filter((w) => w.frase === f);
  const n = Math.ceil(ws.length / 3);
  let i = 0;
  for (let g = 0; g < n; g++) {
    const k = Math.round(((g + 1) * ws.length) / n) - Math.round((g * ws.length) / n);
    grupos.push(ws.slice(i, i + k));
    i += k;
  }
}
let subHtml = "", subJs = [];
grupos.forEach((g, gi) => {
  if (g[0].start >= D) return;
  const ini = Math.max(0.1, g[0].start - 0.05);
  const next = grupos[gi + 1];
  const fin = next && next[0].frase === g[0].frase ? next[0].start - 0.05 : Math.min(g.at(-1).end + 0.25, next ? next[0].start - 0.05 : D);
  const chars = g.map((w) => w.text).join(" ").length;
  const fs_ = Math.round(Math.max(50, Math.min(82, 900 / (chars * 0.62))));
  subHtml += `<div class="sg" id="sg${gi}" style="font-size:${fs_}px">${g
    .map((w) => {
      const c = CLAVE[norm(w.text)];
      const t = w.text.replace(/[.,:;]$/, "");
      return `<span class="sw${c ? " k " + c : ""}" id="${w.id}">${t.toUpperCase()}</span>`;
    })
    .join(" ")}</div>`;
  subJs.push(`tl.set("#sg${gi}",{opacity:1,visibility:"visible"},${at(ini)});`);
  g.forEach((w) =>
    subJs.push(`tl.fromTo("#${w.id}",{opacity:0,scale:0.7,y:12},{opacity:1,scale:1,y:0,duration:0.14,ease:"back.out(2)"},${at(w.start)});`),
  );
  subJs.push(`tl.to("#sg${gi}",{opacity:0,duration:0.1,ease:"power2.in"},${at(fin - 0.1)});`);
  subJs.push(`tl.set("#sg${gi}",{opacity:0,visibility:"hidden"},${at(fin)});`);
});
const subtitulos = `<template>
<style>
#root{position:absolute;inset:0;pointer-events:none;font-family:Inter,sans-serif}
.sg{position:absolute;left:60px;right:60px;top:240px;text-align:center;font-weight:900;color:#fff;line-height:1.25;opacity:0;visibility:hidden;
  text-shadow:0 4px 18px rgba(0,0,0,.85);letter-spacing:-.01em}
.sw{display:inline-block;margin:0 .1em}
.k{padding:0 .22em;border-radius:.2em;text-shadow:none}
.k.ama{background:#facc15;color:#0b0d12}.k.verde{background:#22c55e;color:#0b0d12}.k.rojo{background:#ef4444;color:#fff}
</style>
<div id="root" data-composition-id="subtitulos" data-width="1080" data-height="1920">
${subHtml}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${subJs.join("\n")}
window.__timelines["subtitulos"] = tl;
</script>
</template>`;

// ---------- AUDIO (efectos) ----------
const SFX = {
  whoosh: ["assets/sfx/whoosh.mp3", 0.5],
  impact: ["assets/sfx/impact-bass-1.mp3", 0.7],
  pop: ["assets/sfx/pop.mp3", 0.45],
  pop2: ["assets/sfx/pop.mp3", 0.35],
  teclas: ["assets/sfx/typing.mp3", 0.3, 0, 1.2],
  whoosh2: ["assets/sfx/whoosh-short.mp3", 0.5],
  whoosh3: ["assets/sfx/whoosh-cinematic.mp3", 0.4, 1.9, 1.2, 0.6],
  click: ["assets/sfx/click.mp3", 0.5],
  noti: ["assets/sfx/notification.mp3", 0.3, 0, 0.8],
  riser: ["assets/sfx/riser.mp3", 0.35, 2.0, 1.5, 0],
  impact2: ["assets/sfx/impact-bass-2.mp3", 0.6, 0, 1.6],
};
const audioTags = sfx
  .map((x) => ({ ...x, d: SFX[x.f] }))
  .filter((x) => x.d && fs.existsSync(x.d[0]))
  .map((x) => {
    const [file, vol, ms = 0, maxD = null, off = 0] = x.d;
    if (x.f === "riser") x.t = P("truco") - 1.47;
    const t = Math.max(0, x.t - off);
    const dur = Math.min(durMedia(file) - ms, maxD ?? 99, D - t);
    return { t, file, vol, ms, dur };
  })
  .filter((x) => x.t < D - 0.05 && x.dur > 0.05)
  .map((x, i) => `<audio id="sfx${i}" class="clip" src="${x.file}" data-start="${r3(x.t)}" data-duration="${r3(x.dur)}"${x.ms ? ` data-media-start="${x.ms}"` : ""} data-track-index="${10 + (i % 6)}" data-volume="${x.vol}"></audio>`).join("\n      ");

const index = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #07080c; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
      <div id="mundo-host" data-composition-id="mundo" data-composition-src="compositions/mundo.html"
        data-start="0" data-duration="${D}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
      ${SIN_SUBS ? "" : `<div id="subtitulos" data-composition-id="subtitulos" data-composition-src="compositions/subtitulos.html"
        data-start="0" data-duration="${D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index:5"></div>`}
      <audio id="voz" class="clip" src="assets/voz.wav" data-start="0" data-duration="${D}" data-track-index="3" data-volume="1"></audio>
      ${fs.existsSync("assets/musica.wav") ? `<audio id="musica" class="clip" src="assets/musica.wav" data-start="0" data-duration="${D}" data-track-index="4" data-volume="0.12" data-fade-out="1.5"></audio>` : ""}
      ${audioTags}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>`;

fs.mkdirSync("compositions", { recursive: true });
fs.writeFileSync("compositions/mundo.html", mundo);
fs.writeFileSync("compositions/subtitulos.html", subtitulos);
fs.writeFileSync("index.html", index);
console.log(`OK · duración ${D}s (voz ${VOZ.toFixed(2)}s) · ${js.length} tweens · ${grupos.length} grupos de subtítulos · ${sfx.length} efectos`);
