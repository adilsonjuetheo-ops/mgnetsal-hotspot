const RouterOSAPI = require('node-routeros').RouterOSAPI;

function createClient() {
  return new RouterOSAPI({
    host: process.env.MIKROTIK_HOST || '192.168.88.1',
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
    port: parseInt(process.env.MIKROTIK_PORT) || 8728,
    timeout: 10
  });
}

async function authorizeUser(macAddress, ipAddress, phone, freeTimeMinutes) {
  const client = createClient();
  const server = process.env.MIKROTIK_HOTSPOT_SERVER || 'hotspot1';
  const username = `lead_${phone.replace(/\D/g, '')}`;
  const password = generatePassword();
  const timeLimit = `${freeTimeMinutes || 60}m`;

  try {
    await client.connect();

    // Remove usuário antigo com mesmo nome se existir
    try {
      const existing = await client.write('/ip/hotspot/user/print', [
        `?name=${username}`
      ]);
      if (existing && existing.length > 0) {
        await client.write('/ip/hotspot/user/remove', [
          `=.id=${existing[0]['.id']}`
        ]);
      }
    } catch (_) {}

    // Cria o usuário hotspot
    await client.write('/ip/hotspot/user/add', [
      `=name=${username}`,
      `=password=${password}`,
      `=server=${server}`,
      `=mac-address=${macAddress || ''}`,
      `=limit-uptime=${timeLimit}`,
      `=comment=Lead-${phone}`
    ]);

    // Faz login do usuário via API
    if (ipAddress) {
      try {
        await client.write('/ip/hotspot/active/login', [
          `=user=${username}`,
          `=password=${password}`,
          `=ip=${ipAddress}`,
          `=mac-address=${macAddress || ''}`
        ]);
      } catch (_) {
        // Nem todos os MikroTik suportam active/login via API — cliente faz login pelo browser
      }
    }

    client.close();
    return { success: true, username, password };
  } catch (error) {
    console.error('Erro MikroTik:', error.message);
    client.close();
    throw new Error('Não foi possível conectar ao MikroTik: ' + error.message);
  }
}

async function getActiveSessions() {
  const client = createClient();
  try {
    await client.connect();
    const sessions = await client.write('/ip/hotspot/active/print');
    client.close();
    return sessions;
  } catch (error) {
    client.close();
    console.error('Erro ao buscar sessões MikroTik:', error.message);
    return [];
  }
}

async function disconnectUser(macAddress) {
  const client = createClient();
  try {
    await client.connect();
    const active = await client.write('/ip/hotspot/active/print', [
      `?mac-address=${macAddress}`
    ]);
    if (active && active.length > 0) {
      await client.write('/ip/hotspot/active/remove', [
        `=.id=${active[0]['.id']}`
      ]);
    }
    client.close();
    return { success: true };
  } catch (error) {
    client.close();
    throw new Error('Erro ao desconectar usuário: ' + error.message);
  }
}

async function testConnection() {
  const client = createClient();
  try {
    await client.connect();
    const identity = await client.write('/system/identity/print');
    client.close();
    return { success: true, identity: identity[0]?.name || 'MikroTik' };
  } catch (error) {
    client.close();
    return { success: false, error: error.message };
  }
}

function generatePassword() {
  return Math.random().toString(36).slice(2, 10);
}

module.exports = { authorizeUser, getActiveSessions, disconnectUser, testConnection };
