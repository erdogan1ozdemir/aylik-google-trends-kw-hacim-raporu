# -*- coding: utf-8 -*-
"""DataForSEO kimlik bilgisini MCP yapılandırmasından okuyup 600 izinli bir curl
yapılandırma dosyasına yazar. Değer argv'ye, ekrana ya da depoya girmez.

Dosya oturumun geçici dizinine yazılır ve çekimden sonra silinir; kalıcı
kimlik dosyası tutulmaz.

Kullanım: python3 kimlik.py <hedef/.curlrc>"""
import json, os, sys, base64

hedef = sys.argv[1]
c = json.load(open(os.path.expanduser('~/.claude.json'), encoding='utf-8'))
env = (c.get('mcpServers', {}).get('dfs-mcp') or {}).get('env') or {}
k, p = env.get('DATAFORSEO_USERNAME'), env.get('DATAFORSEO_PASSWORD')
if not (k and p):
    sys.exit('dfs-mcp kimlik bilgisi ~/.claude.json içinde bulunamadı (mcpServers/dfs-mcp/env).')
jeton = base64.b64encode(f'{k}:{p}'.encode()).decode()
fd = os.open(hedef, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write(f'header = "Authorization: Basic {jeton}"\nheader = "Content-Type: application/json"\n')
print('yazıldı (600):', hedef)
