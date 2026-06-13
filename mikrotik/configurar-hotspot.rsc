# =============================================================
# Script de Configuração do Hotspot Zip Telecom no MikroTik
# Execute estes comandos no Terminal do MikroTik (New Terminal)
# =============================================================

# 1. HABILITAR A API (necessário para integração)
/ip service set api disabled=no port=8728
/ip service set api-ssl disabled=no port=8729

# 2. CRIAR USUÁRIO PARA API (substitua a senha!)
/user add name=hotspot-api password=SUA_SENHA_API group=full comment="Usuario API Hotspot"

# 3. CRIAR PERFIL DO HOTSPOT
/ip hotspot profile add name="zip-hotspot-profile" \
  html-directory=flash/hotspot \
  login-by=http-chap,http-pap \
  use-radius=no \
  http-cookie-lifetime=30m \
  keepalive-timeout=none \
  trial-user-profile=zip-default \
  hotspot-address=192.168.10.1

# 4. CRIAR PERFIL DE USUÁRIO PADRÃO
/ip hotspot user profile add name="zip-default" \
  session-timeout=1h \
  idle-timeout=10m \
  shared-users=1 \
  rate-limit="5M/5M" \
  add-mac-cookie=yes \
  mac-cookie-timeout=3d

# 5. CONFIGURAR O SERVIDOR HOTSPOT
# (adapte a interface de acordo com a sua rede — ex: ether2, wlan1, bridge-local)
/ip hotspot setup
# Siga o assistente e configure:
#   - Interface: wlan1 (ou a interface do hotspot)
#   - IP da rede hotspot: 192.168.10.1/24
#   - Pool DHCP: 192.168.10.10-192.168.10.200
#   - DNS: 8.8.8.8, 8.8.4.4

# 6. CONFIGURAR REDIRECIONAMENTO PARA PORTAL EXTERNO
# Substitua SEU_IP_SERVIDOR pelo IP do servidor onde o sistema está rodando
/ip hotspot profile set [find name="zip-hotspot-profile"] \
  login-page="http://SEU_IP_SERVIDOR:3000/?mac=$(mac)&ip=$(ip)&dst=$(link-orig)&username=$(username)"

# 7. WALLED GARDEN — liberar acesso ao servidor do portal antes do login
/ip hotspot walled-garden add dst-host="SEU_IP_SERVIDOR" comment="Servidor Hotspot Zip"
/ip hotspot walled-garden add dst-host="api.zenvia.com" comment="Zenvia SMS API"

# 8. REGRA DE FIREWALL — permitir tráfego do hotspot para o servidor
/ip firewall filter add chain=forward \
  src-address=192.168.10.0/24 \
  dst-address=SEU_IP_SERVIDOR \
  action=accept \
  comment="Hotspot para servidor Zip" \
  place-before=0

# 9. VERIFICAR SE O HOTSPOT ESTÁ ATIVO
/ip hotspot print

# =============================================================
# VERIFICAÇÕES ÚTEIS
# =============================================================

# Listar usuários hotspot:
# /ip hotspot user print

# Listar sessões ativas:
# /ip hotspot active print

# Listar walled garden:
# /ip hotspot walled-garden print

# Testar API na porta 8728 (de outro dispositivo na rede):
# telnet SEU_MIKROTIK_IP 8728
