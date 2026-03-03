# Generazione Icone PWA

Gli SVG placeholder in questa cartella devono essere convertiti in PNG prima del deploy.

**Comando suggerito (richiede Inkscape o ImageMagick):**

```bash
for size in 72 96 128 144 152 192 384 512; do
  inkscape --export-png=icon-${size}.png --export-width=${size} icon-${size}.svg
  # oppure
  convert -background none icon-${size}.svg -resize ${size}x${size} icon-${size}.png
done
```

**Strumenti online:**
- https://realfavicongenerator.net/
- https://maskable.app/editor
