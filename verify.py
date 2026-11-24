import re,sys
from pathlib import Path
root=Path(sys.argv[1])
required=['index.html','ko/bazaar/index.html','fr/bazaar/index.html','ko/bazaar/admin/index.html','table.html','sample.jpg','dashboard.html','dashboard.js','export/pdf.js','export/xlsx.js']
required += [f'{lang}/bazaar/admin/{page}.html' for lang in ('ko','fr') for page in ('index','products','orders','settlement')]
if (root/'ko/bazaar/test-admin').exists():
    required += [f'{lang}/bazaar/test-admin/{screen}index.html' for lang in ('ko','fr') for screen in ('','products/','orders/','settlement/')]
    for path in required[-8:]:
        if "connect-src 'none'" not in (root/path).read_text():
            raise SystemExit(f'Mock administrator CSP missing: {path}')
for path in required:
    if not (root/path).is_file():raise SystemExit(f'Missing preview route: {path}')
member=root/'member-management-test/index.html'
if member.is_file():
    source=member.read_text()
    if "connect-src 'none'" not in source or "form-action 'none'" not in source:
        raise SystemExit('Member preview isolation missing')
    if '/asicc-preview/member-management-test/' not in (root/'index.html').read_text():
        raise SystemExit('Member preview navigation missing')
if (root/'CNAME').exists():raise SystemExit('Unexpected custom domain')
for path in root.rglob('*'):
    if path.suffix not in ('.html','.js','.css'):continue
    source=path.read_text()
    if re.search(r'asicc-member-space|firebaseio[.]com|cloudfunctions[.]net|firebasestorage[.]googleapis[.]com|firebaseapp[.]com|AIza[\w-]{35}',source,re.I):
        raise SystemExit(f'Production integration in {path}')
    if path.suffix!='.html':continue
    for target in re.findall(r'(?:src|href)="(/asicc-preview/[^"?#]*)',source):
        target=target.removeprefix('/asicc-preview/')
        if target.startswith('_astro/') and not (root/target).is_file():raise SystemExit(f'Broken asset {target}')
# Navigation outside the selected preview routes is shown without an active link.
# This also keeps the preview from opening production member or contact pages.
for path in root.rglob('*.html'):
    source=path.read_text()
    def keep_link(match):
        tag, href=match[0],match[1]
        if href.startswith('#'):return tag
        if href.startswith('/asicc-preview/'):
            name=re.split(r'[?#]',href.removeprefix('/asicc-preview/'),maxsplit=1)[0]
            target=root/name
            if target.is_dir():target=target/'index.html'
            if target.is_file():return tag
        return tag.replace(f'href="{href}"','aria-disabled="true"')
    path.write_text(re.sub(r'<a\b[^>]*\bhref="([^"]*)"[^>]*>',keep_link,source))
