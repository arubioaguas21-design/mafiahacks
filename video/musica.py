"""Música de fondo muy suave, generada en local (sin descargas): un pad de acordes
(La m - Fa - Do - Sol) a 96 bpm con un pulso de bajo discreto. Escribe assets/musica.wav.
Uso: python3 musica.py [duración_en_segundos]
"""
import sys
import numpy as np
import soundfile as sf

dur = float(sys.argv[1]) if len(sys.argv) > 1 else 60.0
sr = 44100
t = np.arange(int(dur * sr)) / sr
bpm = 96.0
beat = 60.0 / bpm
compas = 4 * beat
def f(n):  # nota MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)
acordes = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]  # Am F C G
bajos = [45, 41, 48, 43]
pad = np.zeros_like(t)
bajo = np.zeros_like(t)
idx = (t // compas).astype(int) % 4
pos = t % compas
env = np.minimum(1, pos / 0.6) * np.minimum(1, (compas - pos) / 0.4)  # entrada y salida suaves de cada acorde
for k in range(4):
    m = idx == k
    for n in acordes[k]:
        for det in (-0.12, 0.12):  # dos voces un poco desafinadas = coro
            ph = 2 * np.pi * f(n + det / 1.0) * t[m]
            pad[m] += np.sin(ph) + 0.25 * np.sin(2 * ph)
    pb = t[m] % beat
    eb = np.exp(-pb * 5.0)
    bajo[m] = np.sin(2 * np.pi * f(bajos[k]) * t[m]) * eb + 0.4 * np.sin(4 * np.pi * f(bajos[k]) * t[m]) * eb
pad *= env
# brillo muy leve con trémolo lento
pad *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
mix = 0.10 * pad / np.max(np.abs(pad)) + 0.18 * bajo / np.max(np.abs(bajo))
# entrada y salida generales
fade = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 1.5)
mix *= fade
mix /= np.max(np.abs(mix)) * 1.12
sf.write("assets/musica.wav", np.stack([mix, mix], 1).astype(np.float32), sr)
print(f"assets/musica.wav · {dur:.1f}s")
