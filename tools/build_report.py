# Builds report/report.html from report_content.py and the screenshots in report/shots.
import html
import re
import struct
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
REPORT = TOOLS.parent / "report"
SHOTS = REPORT / "shots"
sys.path.insert(0, str(TOOLS))
from report_content import META, SECTIONS, TITLE  # noqa: E402


def inline(text: str) -> str:
    out = html.escape(text, quote=False).replace("&lt;br&gt;", "<br>")
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"(https://[^\s<]+[^\s<.])", r'<a href="\1">\1</a>', out)
    return out


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


def shot(names: list[str], caption: str) -> str:
    imgs = []
    for name in names:
        path = SHOTS / name
        if not path.exists():
            raise FileNotFoundError(path)
        w, h = png_size(path)
        imgs.append(f'<img src="shots/{name}" width="{w}" height="{h}" alt="{html.escape(name)}">')
    return f'<div class="shot">{"".join(imgs)}<p class="caption">{inline(caption)}</p></div>'


def main() -> None:
    body = [f"<h1>{html.escape(TITLE)}</h1>", '<p class="meta">']
    body.append("<br>".join(inline(line) for line in META))
    body.append("</p>")

    for title, blocks in SECTIONS:
        body.append(f"<section><h2>{html.escape(title)}</h2>")
        for block in blocks:
            kind = block[0]
            if kind == "p":
                body.append(f"<p>{inline(block[1])}</p>")
            elif kind == "h3":
                body.append(f"<h3>{inline(block[1])}</h3>")
            elif kind == "lines":
                body.append("<p>" + "<br>".join(inline(line) for line in block[1]) + "</p>")
            elif kind == "shot":
                body.append(shot(block[1], block[2]))
            elif kind == "table":
                head, *rows = block[1]
                cells = "".join(f"<th>{inline(c)}</th>" for c in head)
                for row in rows:
                    cells += "</tr><tr>" + "".join(f"<td>{inline(c)}</td>" for c in row)
                body.append(f"<table><tr>{cells}</tr></table>")
        body.append("</section>")

    css = """
@page { size: A4 landscape; margin: 10mm 12mm; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; margin: 0; }
h1 { font-size: 16pt; margin: 0 0 2mm; }
h2 { font-size: 14pt; margin: 0 0 2mm; break-after: avoid; }
h3 { font-size: 12pt; margin: 4mm 0 1.5mm; break-after: avoid; }
p { margin: 0 0 2mm; }
p.meta { margin-bottom: 5mm; }
section + section { break-before: page; }
code { font-family: Consolas, monospace; font-size: 0.95em; }
a { color: #000; }
.shot { break-inside: avoid; margin: 0 0 4mm; }
.shot img { display: block; width: auto; height: auto; max-width: 100%; max-height: 142mm; margin: 0 0 1mm; }
.caption { font-size: 10.5pt; margin: 0; }
table { border-collapse: collapse; margin: 0 0 4mm; font-size: 10pt; }
th, td { border: 1px solid #555; padding: 1mm 2mm; text-align: left; vertical-align: top; }
"""
    doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        "<title>6788117_lab12</title>"
        f"<style>{css}</style></head><body>{''.join(body)}</body></html>"
    )
    out = REPORT / "report.html"
    out.write_text(doc, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
