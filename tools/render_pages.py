# Render selected PDF pages to PNG for a visual check: render_pages.py <pdf> <outdir> <page> [<page>...]
import sys
import fitz

doc = fitz.open(sys.argv[1])
print("pages:", doc.page_count)
for n in map(int, sys.argv[3:]):
    page = doc[n - 1]
    page.get_pixmap(dpi=110).save(f"{sys.argv[2]}/page{n:02d}.png")
    print("saved page", n)
