# Zip Telecom — Sistema de Hotspot com Captação de Leads

Sistema completo de Wi-Fi Hotspot com captação de leads via SMS, integração MikroTik e painel administrativo.

## Funcionalidades

- **Portal Hotspot** — página de login com identidade visual Zip Telecom
- **Validação por SMS** — via Zenvia, código OTP de 6 dígitos
- **Integração MikroTik** — liberação automática de acesso via API RouterOS
- **Painel Admin** — dashboard, gerenciamento de leads, sessões e configurações
- **Exportação CSV** — exporta lista de leads para Excel

---

## Requisitos do Servidor

- Linux (Ubuntu 20.04+ recomendado)
- Node.js 18+
- Acesso de rede ao MikroTik (porta 8728)

---

## Instalação Rápida

```bash
# Clone ou extraia os arquivos no servidor
cd zip-hotspot

# Execute o instalador
sudo bash install.sh
```

---

## Configuração Manual

### 1. Instalar dependências

```bash
cd backend
npm install --production
```

### 2. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Preencha:

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3000) |
| `JWT_SECRET` | Chave secreta JWT (string aleatória longa) |
| `ADMIN_USERNAME` | Usuário admin (padrão: admin) |
| `ADMIN_PASSWORD` | Senha admin inicial |
| `ZENVIA_TOKEN` | Token de API da Zenvia |
| `ZENVIA_FROM` | Nome do remetente SMS |
| `MIKROTIK_HOST` | IP do MikroTik na rede |
| `MIKROTIK_PORT` | Porta API MikroTik (padrão: 8728) |
| `MIKROTIK_USER` | Usuário API MikroTik |
| `MIKROTIK_PASSWORD` | Senha do usuário MikroTik |
| `MIKROTIK_HOTSPOT_SERVER` | Nome do servidor hotspot |

### 3. Iniciar o servidor

```bash
# Com PM2 (recomendado)
npm install -g pm2
pm2 start backend/src/app.js --name zip-hotspot
pm2 save && pm2 startup

# Ou diretamente
node backend/src/app.js
```

### 4. Com Docker (alternativo)

```bash
cp backend/.env.example backend/.env
# Edite o .env
docker-compose up -d
```

---

## Configuração MikroTik

Veja o arquivo `mikrotik/configurar-hotspot.rsc` para o passo a passo completo.

### Resumo:
1. Ative a API em **IP → Services → api** (porta 8728)
2. Crie um usuário com permissão **write**
3. Configure o Hotspot em **IP → Hotspot**
4. No perfil do hotspot, defina o **Login Page**:
   ```
   http://IP_DO_SERVIDOR:3000/?mac=$(mac)&ip=$(ip)&dst=$(link-orig)
   ```
5. Adicione o IP do servidor ao **Walled Garden**

---

## Acesso

| URL | Descrição |
|---|---|
| `http://IP:3000/` | Portal hotspot (visto pelo cliente) |
| `http://IP:3000/admin` | Painel administrativo |

**Login padrão:** `admin` / `zip@2024` — **Mude após o primeiro acesso!**

---

## Fluxo de Uso

```
Cliente conecta ao Wi-Fi
        ↓
MikroTik redireciona para o portal
        ↓
Cliente informa nome e telefone
        ↓
Sistema envia SMS com código OTP (Zenvia)
        ↓
Cliente digita o código de 6 dígitos
        ↓
Sistema valida e cria lead no banco de dados
        ↓
Sistema autoriza o cliente no MikroTik via API
        ↓
Cliente recebe acesso à internet por X minutos
```

---

## Suporte Técnico

**Zip Telecom** — Salinas, MG  
WhatsApp: (38) 98809-6055  
Instagram: @zip.telecom
