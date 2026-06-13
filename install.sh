#!/bin/bash
# Script de instalação do sistema Hotspot Zip Telecom
# Execute como root: sudo bash install.sh

set -e

echo ""
echo "============================================"
echo "   Instalação — Zip Telecom Hotspot System"
echo "============================================"
echo ""

# Verifica Node.js
if ! command -v node &> /dev/null; then
  echo "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node.js: $(node -v)"
echo "NPM: $(npm -v)"

# Instala dependências
echo ""
echo "Instalando dependências..."
cd backend
npm install --production
cd ..

# Cria pasta de dados
mkdir -p backend/data

# Copia .env se não existir
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo ""
  echo "⚠️  Arquivo .env criado. EDITE antes de continuar:"
  echo "   nano backend/.env"
  echo ""
  echo "Configure obrigatoriamente:"
  echo "  - JWT_SECRET (gere uma string aleatória)"
  echo "  - ADMIN_PASSWORD"
  echo "  - ZENVIA_TOKEN"
  echo "  - MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD"
  echo ""
fi

# Instala PM2 para gerenciar o processo
if ! command -v pm2 &> /dev/null; then
  echo "Instalando PM2..."
  npm install -g pm2
fi

echo ""
echo "Iniciando servidor com PM2..."
pm2 start backend/src/app.js --name "zip-hotspot" --env production
pm2 save
pm2 startup

echo ""
echo "============================================"
echo "✅ Instalação concluída!"
echo ""
echo "   Portal Hotspot: http://$(hostname -I | awk '{print $1}'):3000/"
echo "   Painel Admin:   http://$(hostname -I | awk '{print $1}'):3000/admin"
echo ""
echo "   Login padrão: admin / zip@2024"
echo "   (MUDE A SENHA imediatamente!)"
echo ""
echo "   Comandos úteis:"
echo "   pm2 status          — ver status"
echo "   pm2 logs zip-hotspot — ver logs"
echo "   pm2 restart zip-hotspot — reiniciar"
echo "============================================"
