# Reconstructing brand PNGs from base64 parts

Each asset is stored as split base64 text:

- `{name}.nparts.txt` — number of parts (N)
- `{name}.part1.txt` … `{name}.partN.txt` — consecutive base64 chunks

To rebuild a PNG:

1. Concatenate `part1` through `partN` in order (plain text, no extra newlines).
2. Base64-decode the concatenated string.
3. Write the bytes to `public/brand/{name}.png`.

| Parts prefix | Output |
| --- | --- |
| `name` | `public/brand/name.png` |
| `subtitle` | `public/brand/subtitle.png` |
| `footer` | `public/brand/footer.png` |

Carousel placeholder lives in `public/carousel/_b64/` and reconstructs to `public/carousel/placeholder.png`.

```bash
# from public/brand/_b64 — example for name.png
cat name.part1.txt name.part2.txt | base64 -d > ../name.png

# generic (N from nparts file)
n=$(cat name.nparts.txt)
for i in $(seq 1 "$n"); do cat "name.part${i}.txt"; done | base64 -d > ../name.png
```
