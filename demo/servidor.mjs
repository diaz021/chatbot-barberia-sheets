/**
 * DEMO DEL SERVIDOR COMPLETO — web pública, panel y bot.
 *
 *     npm run demo
 *
 * Arranca el `src/app.js` real con Google y Meta simulados (ver
 * simulacion.mjs). Lo que el bot "manda" por WhatsApp sale en esta consola,
 * incluido el código para entrar al panel.
 */
import crypto from 'node:crypto';
import { sembrarTurnos, alEnviar } from './simulacion.mjs';

// Valores de demo. Van ANTES de cargar la app: la configuración se lee una
// sola vez, al arrancar.
const DEMO = {
  PORT: '3000',
  URL_PUBLICA: 'http://localhost:3000',
  ADMIN_PRINCIPAL: '573005550199',
  SESION_SECRETO: crypto.randomBytes(24).toString('hex'),
  SPREADSHEET_ID: 'hoja-de-demo',
  API_TOKEN: 'demo',
  BUSINESS_PHONE: 'demo',
  API_VERSION: 'v21.0',
  WEBHOOK_VERIFY_TOKEN: 'demo',
  PASSWORD_CAMILO: 'camilo123',
  PASSWORD_MATEO: 'mateo123',
  PASSWORD_SANTIAGO: 'santiago123',
  PASSWORD_PRUEBA: 'prueba123',
  // El asistente con IA está desconectado del menú: esta clave nunca se usa,
  // solo evita el aviso de la librería al arrancar.
  GEMINI_API_KEY: 'demo-sin-uso',
};

Object.assign(process.env, DEMO);

// Sin el secreto de Meta la verificación de firma queda apagada, como en
// desarrollo: así se le pueden mandar mensajes de prueba al webhook.
delete process.env.META_APP_SECRET;

const sembrados = sembrarTurnos();

// Cada mensaje que el bot "envía", en una línea legible.
alEnviar.push((data) => {
  const para = data.to || data.recipient || '';
  const texto = data.text?.body
    || data.interactive?.body?.text
    || (data.template ? `[plantilla ${data.template.name}]` : '')
    || (data.status === 'read' ? null : `[${data.type}]`);

  if (texto) {
    console.log(`\n💬 El bot le escribe a ${para}:\n   ${String(texto).split('\n').join('\n   ')}\n`);
  }
});

await import('../src/app.js');

console.log(`
┌──────────────────────────────────────────────────────────────┐
│  Navaja Barber Club — demo                                   │
├──────────────────────────────────────────────────────────────┤
│  Web:    http://localhost:3000                               │
│  Panel:  http://localhost:3000/panel                         │
│                                                              │
│  Para entrar al panel escribe el número   3005550199         │
│  y el código de 6 dígitos te va a salir AQUÍ, en la consola. │
│                                                              │
│  Hoja simulada con ${String(sembrados).padStart(2)} turnos ficticios.                    │
│  Nada sale a internet: Google y Meta están simulados.        │
└──────────────────────────────────────────────────────────────┘
`);
