import os,re,shutil,sys
from pathlib import Path
from html import escape
tools=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve()
ref=escape(sys.argv[2]); commit=escape(sys.argv[3])
base='/asicc-preview/'
routes=root/'src/pages'
bazaar=root/'src/pages/[lang]/bazaar'
saved={n:(bazaar/n).read_text() for n in ['admin.astro','index.astro','commande.astro']}
shutil.rmtree(routes)
for name,code in saved.items():
    path=bazaar/name
    path.parent.mkdir(parents=True,exist_ok=True)
    code=re.sub(r"import\s*\{\s*onAuthStateChanged\s*\}\s*from\s*['\"]firebase/auth['\"];?", "import {onAuthStateChanged} from '../../../lib/bazaar/api';",code)
    path.write_text(code)
shutil.copy(tools/'mock.ts',root/'src/lib/bazaar/api.ts')
layout=root/'src/layouts/Base.astro'
code=layout.read_text()
code=re.sub(r'<script\b[^>]*>(.*?)</script>',lambda m:'' if 'firebase' in m[1] else m[0],code,flags=re.S)
code=code.replace('<head>',"""<head>
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; form-action 'none'; object-src 'none'; base-uri 'none'">""")
code=re.sub(r'<body[^>]*>',lambda m:m[0]+f'<div style="padding:10px;text-align:center;background:#f5e6c6"><a href="{base}">미리보기 홈</a> · {ref} · <code>{commit}</code> · 예시 데이터 / Démonstration</div>',code,count=1)
layout.write_text(code)
# Exclude the production public directory and permit only the preview image and the site favicon.
favicon=(root/'public/favicon.svg').read_bytes()
shutil.rmtree(root/'public')
(root/'public').mkdir()
(root/'public/favicon.svg').write_bytes(favicon)
shutil.copy(tools/'sample.jpg',root/'public/sample.jpg')
table=(tools/'table.html').read_text().replace('href="/"','href="/asicc-preview/"')
table=table.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src \'self\' data: blob:; form-action \'none\'">')
table=table.replace('디자인 검토용 시안',f'디자인 검토용 시안 · {ref} · {commit}')
(root/'public/table.html').write_text(table)
dashboard=(tools/'dashboard.html').read_text()
dashboard=dashboard.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; form-action \'none\'">')
(root/'public/dashboard.html').write_text(dashboard.replace('디자인 검토용 시안',f'디자인 검토용 시안 · {ref} · {commit}'))
shutil.copy(tools/'dashboard.js',root/'public/dashboard.js')
shutil.copytree(tools/'export',root/'public/export')

for lang in ['', 'ko/', 'fr/']:
    target=routes/lang/'index.astro'
    target.parent.mkdir(parents=True,exist_ok=True)
    prefix=base+(lang or 'ko/')
    target.write_text(f"""<!doctype html><html lang="{lang[:2] or 'ko'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>ASICC 미리보기</title>
<style>body{{font:17px system-ui;line-height:1.7;margin:40px auto;padding:0 16px;max-width:780px}}nav{{display:grid;gap:12px}}a{{color:#723346}}</style>
<h1>ASICC 개발 미리보기</h1><p>{ref} · <code>{commit}</code> · 예시 데이터만 사용합니다.</p>
<nav><a href="{base}dashboard.html">새 바자회 관리자 업무 시안</a>
<a href="{prefix}bazaar/admin/">바자회 관리자</a><a href="{base}table.html">관리자 구조 시안 · 기본 상품 / 행사 / 주문·정산</a>
<a href="{base}table.html#orders">업체별 발주 집계 시안 바로 보기</a>
<a href="{base}ko/bazaar/?event=bazaar-preview-demo">바자회 배너 · 한국어</a><a href="{base}fr/bazaar/?event=bazaar-preview-demo">Bazar · Français</a>
<a href="{prefix}bazaar/?event=bazaar-preview-closed">종료된 행사 / Vente terminée</a></nav></html>""")
