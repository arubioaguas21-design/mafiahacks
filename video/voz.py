"""Genera voz.wav frase a frase con Kokoro (voz ef_dora) y saca el momento de cada palabra.

Uso: python3 voz.py [--voz ef_dora] [--velocidad 0.87] [--pausa 0.25]

- Cada frase de guion.txt se sintetiza por separado y se une con una pausa fija (<= 0.25 s).
- El inicio de cada palabra se estima sintetizando lo que va antes y lo que va después
  (media de las dos estimaciones) y ajustándolo al valle de energía más cercano (±80 ms).
- Escribe voz.wav y assets/transcript.json ([{text, start, end, frase}]).
"""
import argparse, json, os, re, glob
import numpy as np
import soundfile as sf
import kokoro_onnx

ap = argparse.ArgumentParser()
ap.add_argument("--voz", default="ef_dora")
ap.add_argument("--velocidad", type=float, default=0.87)
ap.add_argument("--pausa", type=float, default=0.25)
ap.add_argument("--inicio", type=float, default=0.08)
a = ap.parse_args()

cache = os.path.expanduser("~/.cache/hyperframes/tts")
model = kokoro_onnx.Kokoro(glob.glob(f"{cache}/models/*.onnx")[0], glob.glob(f"{cache}/voices/*.bin")[0])

def synth(text):
    s, sr = model.create(text, voice=a.voz, speed=a.velocidad, lang="es")
    return np.asarray(s, dtype=np.float32), sr

def trim(s, sr, thr=0.012):
    idx = np.where(np.abs(s) > thr)[0]
    if len(idx) == 0:
        return s, 0
    lo = max(0, idx[0] - int(0.01 * sr)); hi = min(len(s), idx[-1] + int(0.02 * sr))
    return s[lo:hi], lo

def rms(s, sr, hop=0.005, win=0.02):
    h, w = int(hop * sr), int(win * sr)
    return np.array([np.sqrt(np.mean(s[i:i + w] ** 2) + 1e-12) for i in range(0, max(1, len(s) - w), h)]), hop

frases = [l.strip() for l in open("guion.txt", encoding="utf-8") if l.strip()]
partes, palabras, t = [], [], a.inicio
sr = 24000
partes.append(np.zeros(int(a.inicio * sr), dtype=np.float32))
for fi, frase in enumerate(frases):
    full, sr = synth(frase)
    full, _ = trim(full, sr)
    dur = len(full) / sr
    env, hop = rms(full, sr)
    toks = frase.split()
    starts = [0.0]
    for k in range(1, len(toks)):
        pre, _ = synth(" ".join(toks[:k]).rstrip(",:;"))
        suf, _ = synth(" ".join(toks[k:]))
        e_pre = len(trim(pre, sr)[0]) / sr          # lo que dura lo anterior
        e_suf = dur - len(trim(suf, sr)[0]) / sr    # frase completa menos lo que queda
        est = (e_pre + e_suf) / 2
        lo, hi = max(starts[-1] + 0.08, est - 0.08), min(dur - 0.05, est + 0.08)
        i0, i1 = int(lo / hop), int(hi / hop)
        if i1 > i0:
            est = (i0 + int(np.argmin(env[i0:i1]))) * hop
        starts.append(max(starts[-1] + 0.08, min(est, dur - 0.05)))
    for k, tok in enumerate(toks):
        end = starts[k + 1] if k + 1 < len(toks) else dur
        palabras.append({"text": tok, "start": round(t + starts[k], 3), "end": round(t + end, 3), "frase": fi})
    partes.append(full)
    t += dur
    if fi < len(frases) - 1:
        partes.append(np.zeros(int(a.pausa * sr), dtype=np.float32)); t += a.pausa
    print(f"{fi+1:2d}/{len(frases)}  {dur:5.2f}s  {frase}")

partes.append(np.zeros(int(0.35 * sr), dtype=np.float32))
audio = np.concatenate(partes)
sf.write("voz.wav", audio, sr)
os.makedirs("assets", exist_ok=True)
for i, w in enumerate(palabras):
    w["id"] = f"w{i}"
json.dump(palabras, open("assets/transcript.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"voz.wav: {len(audio)/sr:.2f}s · {len(palabras)} palabras")
