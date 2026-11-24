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
def visitor_route(name, code):
    is_shop = name == 'index.astro'
    selector = 'bz-load-status' if is_shop else 'bo-result'
    fallback = """
<div id="preview-load-error" role="alert" hidden>
  <p>{L(lang,{ko:'화면을 불러오지 못했습니다. 다시 시도해 주세요.',fr:'Impossible de charger la page. Veuillez réessayer.'})}</p>
  <button type="button">{L(lang,{ko:'다시 시도',fr:'Réessayer'})}</button>
</div>
<script is:inline>
  (() => {
    const status = document.getElementById('STATUS_ID');
    const error = document.getElementById('preview-load-error');
    function failed() {
      status.hidden = true;
      error.hidden = false;
    }
    const timer = setTimeout(failed, 5000);
    error.querySelector('button').addEventListener('click', () => location.reload());
    document.addEventListener('preview-loaded', () => {
      clearTimeout(timer);
      status.hidden = STATUS_HIDDEN;
      error.hidden = true;
    });
    document.addEventListener('preview-load-failed', () => {
      clearTimeout(timer);
      failed();
    });
  })();
</script>
"""
    fallback = fallback.replace('STATUS_ID', selector).replace('STATUS_HIDDEN', 'true' if name == 'index.astro' else 'false')
    status_line = rf'(^[^\S\n]*<[^\n]+ id="{selector}"[^\n]*$)'
    code, count = re.subn(status_line, lambda match: match[0] + fallback, code, count=1, flags=re.M)
    if not count:
        raise ValueError(f'Visitor status element is missing: {name}')
    if is_shop:
        code = code.replace(
            '  render();\n }catch(error){',
            "  render();\n  document.dispatchEvent(new Event('preview-loaded'));\n }catch(error){",
        )
        code = re.sub(
            r'  if\(!event.status\)\{\n[^}]+\n  }(?=\n }finally\{reading=false;})',
            "  document.dispatchEvent(new Event('preview-load-failed'));",
            code,
        )
        code = code.replace('주문 접수 메일을 발송합니다. 이메일이 도착하지 않으면 아래 주문 확인 링크를 꼭 저장해 주세요.', '모의 주문입니다. 실제로 송금하지 마세요. 이메일은 발송되지 않습니다.')
        code = code.replace('Un e-mail récapitulatif sera envoyé. Conservez le lien de suivi ci-dessous.', 'Commande fictive. Ne faites aucun virement. Aucun e-mail ne sera envoyé.')
        code = code.replace("<p>${t('모의 주문입니다.", """${request.pickupNote && String(request.pickupNote).trim()?`<p style="white-space:pre-wrap;overflow-wrap:anywhere">${t('판매자에게 전달할 사항','Informations complémentaires pour le retrait')}: ${h(String(request.pickupNote).trim())}</p>`:''}<p>${t('모의 주문입니다.""")
    else:
        code = code.replace('\nload();', """void load().then(() => document.dispatchEvent(new Event('preview-loaded')));""")
        code = code.replace("panel.textContent=err?.message||'Error';}}", "panel.textContent=t('이 탭에서 주문 확인 링크를 다시 열어 주세요.','Rouvrez le lien de suivi dans le même onglet.');}}")
        code = code.replace('이메일의 주문 확인 링크를 이용해 주세요.', '같은 브라우저 탭에서 모의 주문을 접수한 뒤 주문 확인 링크를 이용해 주세요.')
        code = code.replace('Utilisez le lien de suivi figurant dans votre e-mail.', 'Passez une commande fictive dans ce même onglet et utilisez le lien de suivi.')
    if "new Event('preview-loaded')" not in code:
        raise ValueError(f'Visitor load completion hook is missing: {name}')
    return code

for name,code in saved.items():
    path=bazaar/name
    path.parent.mkdir(parents=True,exist_ok=True)
    code=re.sub(r"import\s*\{\s*onAuthStateChanged\s*\}\s*from\s*['\"]firebase/auth['\"];?", "import {onAuthStateChanged} from '../../../lib/bazaar/api';",code)
    path.write_text(visitor_route(name, code) if name != 'admin.astro' else code)
shutil.copy(tools/'mock.ts',root/'src/lib/bazaar/api.ts')
layout=root/'src/layouts/Base.astro'
code=layout.read_text()
code=re.sub(r'<script\b[^>]*>(.*?)</script>',lambda m:'' if 'firebase' in m[1] else m[0],code,flags=re.S)
code=code.replace('<head>',"""<head>
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; form-action 'none'; object-src 'none'; base-uri 'none'">""")
code=re.sub(r'<body[^>]*>',lambda m:m[0]+f'<div style="padding:10px;text-align:center;background:#f5e6c6"><a href="{base}">미리보기 홈</a> · {ref} · <code>{commit}</code> · 예시 데이터 / Démonstration</div>',code,count=1)
layout.write_text(code)
# Exclude the production public directory and permit only the preview image and the site favicon.
member_preview=root/'public/member-management-test/index.html'
member_html=member_preview.read_text() if member_preview.is_file() else None
favicon=(root/'public/favicon.svg').read_bytes()
shutil.rmtree(root/'public')
(root/'public').mkdir()
(root/'public/favicon.svg').write_bytes(favicon)
if member_html is not None:
    if "connect-src 'none'" not in member_html or "form-action 'none'" not in member_html:
        raise ValueError('Member preview isolation missing')
    target=root/'public/member-management-test/index.html'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(member_html)
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

# Build the PR's real administrator components behind a separate, mock-only URL.
admin_component=root/'src/lib/bazaar/admin/Screen.astro'
has_live_admin=admin_component.exists()
if has_live_admin:
    code=admin_component.read_text().replace("'bazaar/admin/'","'bazaar/test-admin/'").replace("+'/bazaar-export/'","+'/export/'")
    code=code.replace('<head>',"""<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; form-action 'none'">""")
    code=code.replace('</head>',f'<link rel="icon" href="{base}favicon.svg"></head>')
    code=code.replace('<body data-page={screen}>',f'<body data-page={{screen}}><div style="padding:10px;text-align:center;background:#f5e6c6"><a href="{base}">미리보기 홈</a> · {ref} · <code>{commit}</code> · 예시 데이터 · 이메일 발송 없음</div>')
    admin_component.write_text(code)
    app=admin_component.with_name('app.js')
    code=app.read_text().replace("from 'firebase/auth'","from '../api'").replace("replace(/admin\\/$/,'')","replace(/test-admin\\/$/,'')")
    app.write_text(code)
    for screen in ('main','products','orders','settlement'):
        path=bazaar/'test-admin'/('index.astro' if screen=='main' else screen+'/index.astro')
        path.parent.mkdir(parents=True,exist_ok=True)
        relative='../../../../' if screen=='main' else '../../../../../'
        path.write_text(f"""---
import Screen from '{relative}lib/bazaar/admin/Screen.astro';
import {{ langPaths, type Lang }} from '{relative}i18n/ui';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Lang;
---
<Screen lang={{lang}} screen="{screen}" />
""")

for locale in ('ko','fr'):
    target=root/'public'/locale/'bazaar/admin'
    shutil.copytree(tools/'handoff',target)
    for page in target.glob('*.html'):
        page.write_text(page.read_text().replace('승인 디자인 시안','승인 디자인 시안 · '+ref+' · '+commit)
                        .replace('href="index.html"',f'href="{base}{locale}/bazaar/admin/"'))
    # The approved HTML owns these URLs in preview only.
    (routes/'[lang]/bazaar/admin.astro').unlink(missing_ok=True)
for lang in ['', 'ko/', 'fr/']:
    target=routes/lang/'index.astro'
    target.parent.mkdir(parents=True,exist_ok=True)
    prefix=base+(lang or 'ko/')
    member_link=f'<a href="{base}member-management-test/">회원관리 독립 테스트</a>' if member_html is not None else ''
    test_link=f'<a href="{prefix}bazaar/test-admin/orders/">전화 주문·추가 구매 · 관리자 기능 미리보기</a>' if has_live_admin else ''
    target.write_text(f"""<!doctype html><html lang="{lang[:2] or 'ko'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>ASICC 미리보기</title>
<style>body{{font:17px system-ui;line-height:1.7;margin:40px auto;padding:0 16px;max-width:780px}}nav{{display:grid;gap:12px}}a{{color:#723346}}</style>
<h1>ASICC 개발 미리보기</h1><p>{ref} · <code>{commit}</code> · 예시 데이터만 사용합니다.</p>
<nav>{member_link}{test_link}<a href="{base}dashboard.html">이전 관리자 시안</a>
<a href="{prefix}bazaar/admin/">승인 디자인 · 바자회 관리자</a><a href="{base}table.html">관리자 구조 시안 · 기본 상품 / 행사 / 주문·정산</a>
<a href="{base}table.html#orders">업체별 발주 집계 시안 바로 보기</a>
<a href="{base}ko/bazaar/?event=bazaar-preview-demo">바자회 배너 · 한국어</a><a href="{base}fr/bazaar/?event=bazaar-preview-demo">Bazar · Français</a>
<a href="{prefix}bazaar/?event=bazaar-preview-closed">종료된 행사 / Vente terminée</a></nav></html>""")
