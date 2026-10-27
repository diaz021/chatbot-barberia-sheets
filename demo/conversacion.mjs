/**
 * DEMO DE UNA CONVERSACIÓN COMPLETA
 *
 *     npm run demo:chat
 *
 * Un cliente ficticio agenda un turno y después lo cancela, hablando con el
 * bot REAL (src/services/messageHandler.js) sobre la hoja simulada. Lo que se
 * imprime son los mensajes exactos que el bot le habría mandado a Meta.
 *
 * Con `--json ruta.json` además guarda la conversación en un archivo, que es
 * de donde salen las capturas del README.
 */
import fs from 'node:fs';
import { sembrarTurnos, alEnviar } from './simulacion.mjs';

Object.assign(process.env, {
  API_TOKEN: 'demo', BUSINESS_PHONE: 'demo', API_VERSION: 'v21.0',
  SPREADSHEET_ID: 'hoja-de-demo', ADMIN_PRINCIPAL: '573005550199',
  PASSWORD_CAMILO: 'camilo123', PASSWORD_MATEO: 'mateo123',
  PASSWORD_SANTIAGO: 'santiago123', PASSWORD_PRUEBA: 'prueba123',
  GEMINI_API_KEY: 'demo-sin-uso',   // el asistente IA no se usa; solo calla el aviso
});

sembrarTurnos();

const CLIENTE = { telefono: '573001112233', nombre: 'Laura' };

// ── Lo que pasa en la conversación ─────────────────────────────────────
const conversacion = [];

alEnviar.push((data) => {
  if (data.status === 'read') return;   // el "visto" no es un mensaje

  const para = data.to || data.recipient;

  if (data.type === 'template') {
    conversacion.push({
      de: 'bot', tipo: 'plantilla', para,
      nombre: data.template.name,
      parametros: data.template.components[0].parameters.map(p => p.text),
    });
    return;
  }

  if (para !== CLIENTE.telefono) return;

  if (data.type === 'text') {
    conversacion.push({ de: 'bot', tipo: 'texto', texto: data.text.body });
  } else if (data.type === 'interactive' && data.interactive.type === 'button') {
    conversacion.push({
      de: 'bot', tipo: 'botones',
      texto: data.interactive.body.text,
      botones: data.interactive.action.buttons.map(b => b.reply),
    });
  } else if (data.type === 'interactive' && data.interactive.type === 'list') {
    conversacion.push({
      de: 'bot', tipo: 'lista',
      texto: data.interactive.body.text,
      boton: data.interactive.action.button,
      pie: data.interactive.footer?.text || '',
      secciones: data.interactive.action.sections,
    });
  } else if (data.type === 'location') {
    conversacion.push({ de: 'bot', tipo: 'ubicacion', nombre: data.location.name, direccion: data.location.address });
  }
});

// El bot escribe mucho en consola para depurar; aquí sobra.
const logOriginal = console.log;
const enSilencio = async (fn) => {
  console.log = () => {};
  try { await fn(); } finally { console.log = logOriginal; }
};

const { default: bot } = await import('../src/services/messageHandler.js');

let n = 0;
const contacto = { profile: { name: CLIENTE.nombre }, wa_id: CLIENTE.telefono };

const escribe = (texto) => enSilencio(async () => {
  conversacion.push({ de: 'cliente', tipo: 'texto', texto });
  await bot.handleIncomingMessage(
    { from: CLIENTE.telefono, id: `demo.${++n}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: texto } },
    contacto
  );
});

/** Toca una opción del último mensaje interactivo, por su id. */
const toca = (id) => enSilencio(async () => {
  const ultimo = [...conversacion].reverse().find(m => m.tipo === 'lista' || m.tipo === 'botones');
  const opciones = ultimo.tipo === 'lista' ? ultimo.secciones.flatMap(s => s.rows) : ultimo.botones;
  const elegida = opciones.find(o => o.id === id);
  if (!elegida) throw new Error(`No hay una opción "${id}" en la pantalla actual`);

  conversacion.push({ de: 'cliente', tipo: 'toque', texto: elegida.title });

  const interactive = ultimo.tipo === 'lista'
    ? { type: 'list_reply', list_reply: { id, title: elegida.title } }
    : { type: 'button_reply', button_reply: { id, title: elegida.title } };

  await bot.handleIncomingMessage(
    { from: CLIENTE.telefono, id: `demo.${++n}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'interactive', interactive },
    contacto
  );
});

const opcionesDe = (prefijo) => {
  const ultimo = [...conversacion].reverse().find(m => m.tipo === 'lista' || m.tipo === 'botones');
  const opciones = ultimo.tipo === 'lista' ? ultimo.secciones.flatMap(s => s.rows) : ultimo.botones;
  return opciones.filter(o => o.id.startsWith(prefijo));
};

// ── El guion ───────────────────────────────────────────────────────────

await escribe('Hola');
await toca('1');                                  // Agendar turno
await escribe(CLIENTE.nombre);
await toca('barbero_camilo');

// El primer día que tenga cupos
const fechas = opcionesDe('fecha_').filter(f => !f.description?.includes('sin cupos'));
await toca(fechas[0].id);

// Si el día no cabe en una lista, el bot pregunta la jornada primero
const jornadas = opcionesDe('jornada_');
if (jornadas.length) {
  const preferida = jornadas.find(j => j.id === 'jornada_tarde') || jornadas[0];
  await toca(preferida.id);
}

await toca(opcionesDe('hora_')[0].id);

const turnoAgendado = conversacion.length;

// Y ahora lo cancela
await escribe('menu');
await toca('2');                                  // Cancelar turno
await toca(opcionesDe('cancelar_')[0].id);
await toca('confirmar_si');

// ── Salida ─────────────────────────────────────────────────────────────

const comoTexto = (m) => {
  if (m.de === 'cliente') {
    return `\n👤 ${CLIENTE.nombre}:  ${m.tipo === 'toque' ? '▸ ' : ''}${m.texto}`;
  }
  if (m.tipo === 'plantilla') {
    return `\n🔔 Aviso al barbero (plantilla ${m.nombre}): ${m.parametros.join(' · ')}`;
  }
  let s = `\n🤖 Bot:\n   ${m.texto.split('\n').join('\n   ')}`;
  if (m.tipo === 'botones') s += `\n   ${m.botones.map(b => `[ ${b.title} ]`).join(' ')}`;
  if (m.tipo === 'lista') {
    s += `\n   ☰ ${m.boton}`;
    for (const sec of m.secciones) {
      s += `\n     ${sec.title}`;
      for (const r of sec.rows) s += `\n       · ${r.title}${r.description ? `  — ${r.description}` : ''}`;
    }
  }
  return s;
};

console.log('═'.repeat(64));
console.log('  Conversación con el bot real · hoja y WhatsApp simulados');
console.log('═'.repeat(64));
conversacion.slice(0, turnoAgendado).forEach(m => console.log(comoTexto(m)));
console.log(`\n${'─'.repeat(64)}\n  …y luego lo cancela\n${'─'.repeat(64)}`);
conversacion.slice(turnoAgendado).forEach(m => console.log(comoTexto(m)));
console.log();

const indice = process.argv.indexOf('--json');
if (indice > -1 && process.argv[indice + 1]) {
  fs.writeFileSync(process.argv[indice + 1], JSON.stringify({ cliente: CLIENTE, conversacion }, null, 2));
  console.log(`Guardada en ${process.argv[indice + 1]}`);
}
