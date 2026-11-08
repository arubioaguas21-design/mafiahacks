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

// personajes vivos
vida("nov", 0);
vida("pro", 1);

// partículas del fondo (paralaje)
let part = "";
for (let i = 0; i < 60; i++) {
  const x = (i * 397) % 2600 - 300, y = (i * 709) % 5200 - 300, s = 6 + (i % 5) * 4;
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
#mundo{position:absolute;left:0;top:0;width:3000px;height:6000px;
  background-image:linear-gradient(rgba(255,255,255,.055) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.055) 2px,transparent 2px);
  background-size:90px 90px;background-position:-600px -600px}
#rejilla{position:absolute;left:-2400px;top:-2400px;width:8000px;height:11000px;background-image:inherit;background-size:inherit;background-position:0 0}
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
.h-word{font-size:112px;font-weight:900;line-height:1.05;letter-spacing:-.02em}
.h-line{height:14px;width:470px;border-radius:7px;background:#22c55e;margin-top:8px}
.lapiz{position:absolute;left:330px;top:150px;font-size:110px;color:#f59e0b;filter:drop-shadow(0 8px 14px rgba(0,0,0,.3))}
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
document.querySelectorAll("#camino,#camino-glow").forEach(p=>{const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.setProperty("--L",L);p.style.strokeDashoffset=L;});
${js.join("\n")}
window.__timelines["mundo"] = tl;
</script>
</template>`;

// ---------- SUBTÍTULOS ----------
const CLAVE = {
  lista: "ama", tareas: "ama", tiempo: "rojo", novato: "rojo", pro: "verde", uno: "ama", apuntar: "ama",
  cuarenta: "rojo", tres: "verde", dos: "ama", empezar: "ama", facil: "rojo", dificil: "verde", movil: "rojo",
  pequeno: "ama", minuto: "rojo", minutos: "verde", truco: "ama", cerebro: "ama", medias: "ama",
  zeigarnik: "verde", manana: "verde",
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
  teclas: ["assets/sfx/typing.mp3", 0.3],
};
const audioTags = sfx
  .filter((s) => s.t < D && SFX[s.f] && fs.existsSync(SFX[s.f][0]))
  .map((s, i) => `<audio id="sfx${i}" class="clip" src="${SFX[s.f][0]}" data-start="${r3(s.t)}" data-duration="${r3(Math.min(durMedia(SFX[s.f][0]), D - s.t))}" data-track-index="${10 + (i % 4)}" data-volume="${SFX[s.f][1]}"></audio>`)
  .join("\n      ");

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
      ${fs.existsSync("assets/musica.mp3") ? `<audio id="musica" class="clip" src="assets/musica.mp3" data-start="0" data-duration="${D}" data-track-index="4" data-volume="0.12" data-fade-out="1.5"></audio>` : ""}
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
