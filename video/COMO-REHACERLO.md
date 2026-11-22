# Cómo rehacer el vídeo

Vídeo vertical 1080×1920, 30 fps, 52,5 s. Hecho con HyperFrames (HTML + GSAP → MP4).

## Requisitos
- Node 22 o superior, Python 3 y ffmpeg
- Voz local: `pip install kokoro-onnx soundfile` (el modelo se descarga solo la primera vez con `npx hyperframes tts`)

## Archivos
| Archivo | Qué es |
|---|---|
| `guion.txt` | El guion: una frase por línea, sin saltos dentro de una frase |
| `voz.py` | Genera `voz.wav` frase a frase (voz `ef_dora`) y `assets/transcript.json` con el momento de cada palabra |
| `musica.py` | Genera la música de fondo (`assets/musica.wav`), un pad suave hecho en local |
| `generar.mjs` | Lee los tiempos de la voz y escribe `index.html`, `compositions/mundo.html` y `compositions/subtitulos.html`. Dentro, `P("palabra", n)` devuelve cuándo empieza la n-ésima vez que se dice esa palabra |
| `render.sh` | Comprueba, renderiza las dos versiones y deja el audio a −14 LUFS |
| `assets/sfx/` | Efectos (Pixabay, ver `CREDITS.md`) |
| `assets/icons/` | Iconos Phosphor (MIT) |

## Rehacerlo todo
```bash
cd video
python3 voz.py                      # 1. voz + tiempos de cada palabra
python3 musica.py 52.5              # 2. música (pon la duración de la voz)
./render.sh                         # 3. video-FINAL.mp4 y video-SIN-SUBTITULOS.mp4
```

## Si cambias el guion
1. Edita `guion.txt`.
2. `python3 voz.py` → mira la duración que imprime y `python3 musica.py <duración>`.
3. Si cambias palabras que usa la animación (`P("palabra")` en `generar.mjs`), cámbialas también ahí: si una palabra ya no está, el generador avisa con un error.
4. `./render.sh`

Para una prueba rápida de solo unos segundos: `node generar.mjs --hasta 8.6 && npx hyperframes render -o prueba.mp4`.

## Otras opciones
- Otra voz: `python3 voz.py --voz em_alex` (hombre) · más lenta o rápida: `--velocidad 0.9`.
- Ver la composición en el navegador: `npx hyperframes preview`.
- Capturas para revisar: `npx hyperframes snapshot --at 1,10,20,30,40,50`.

## Comprobaciones hechas
- `npx hyperframes check`: sin errores.
- Sin fotogramas en negro (`ffmpeg ... blackdetect`).
- Duración 52,5 s = la de la voz.
- Volumen integrado −14,4 LUFS.
