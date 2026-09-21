# Uso: python docs/design/restyle-2026/tools-extract-canvas.py <id-da-tela> [palavra-chave]
# Ex.:  python ...py 1d "Minhas"   -> imprime o HTML (sem SVG) do bloco da tela 1d ao redor da palavra.
# O canvas guarda o HTML num <script type="__bundler/template"> como string JSON.
import re, json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(here, 'Oryon-Reestilizacao-canvas.html'), encoding='utf-8').read()
m = re.search(r'<script type="__bundler/template">(.*?)</script>', s, re.S)
t = json.loads(m.group(1))
sid = sys.argv[1]
i = t.index('id="%s"' % sid)
nxt = [x.start() for x in re.finditer(r'id="(1a|1b|1c|1d|1e|2a|2b|2c|2d|2e|3d|3e|4a|5b|6a|6b|7a)"', t) if x.start() > i]
blk = t[i:(nxt[0] if nxt else i + 40000)]
blk = re.sub(r'<svg.*?</svg>', '<svg/>', blk, flags=re.S)
blk = re.sub(r'\s+', ' ', blk)
if len(sys.argv) > 2:
    k = blk.find(sys.argv[2])
    blk = blk[max(0, k - 1500): k + 2500]
print(blk)
