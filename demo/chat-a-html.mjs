/**
 * Convierte la conversación que guarda `npm run demo:chat -- --json` en una
 * página con aspecto de chat, lista para capturar.
 *
 *     node demo/chat-a-html.mjs conversacion.json salida.html [desde] [hasta]
 *
 * TODO el texto sale del archivo: son los mensajes exactos que el bot real
 * armó durante la demo. Aquí solo se decide cómo se dibujan.
 */
import fs from 'node:fs';

const [, , entrada, salida, desde = '0', hasta] = process.argv;

if (!entrada || !salida) {
  console.error('Uso: node demo/chat-a-html.mjs conversacion.json salida.html [desde] [hasta]');
  process.exit(1);
}

const { conversacion } = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const tramo = conversacion
  .slice(Number(desde), hasta ? Number(hasta) : undefined)
  .filter(m => m.tipo !== 'plantilla');   // la plantilla le llega al barbero, no al cliente

const logo = fs.readFileSync(new URL('../public/img/logo.svg', import.meta.url), 'utf8');

/** El formato de WhatsApp: *negrita*, _cursiva_, ~tachado~ y saltos de línea. */
function formato(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br>');
}

function burbuja(m) {
  if (m.de === 'cliente') {
    return `<div class="fila fila--cliente"><div class="burbuja burbuja--cliente">${formato(m.texto)}</div></div>`;
  }

  if (m.tipo === 'texto') {
    return `<div class="fila"><div class="burbuja">${formato(m.texto)}</div></div>`;
  }

  if (m.tipo === 'botones') {
    return `<div class="fila"><div class="grupo">
      <div class="burbuja burbuja--pegada">${formato(m.texto)}</div>
      ${m.botones.map(b => `<div class="boton">${formato(b.title)}</div>`).join('')}
    </div></div>`;
  }

  if (m.tipo === 'lista') {
    const secciones = m.secciones.map(s => `
      <div class="hoja__seccion">${formato(s.title)}</div>
      ${s.rows.map(r => `
        <div class="hoja__fila">
          <div><div class="hoja__titulo">${formato(r.title)}</div>
          ${r.description ? `<div class="hoja__desc">${formato(r.description)}</div>` : ''}</div>
          <span class="radio"></span>
        </div>`).join('')}`).join('');

    return `<div class="fila"><div class="grupo">
      <div class="burbuja burbuja--pegada">
        ${formato(m.texto)}
        ${m.pie ? `<div class="pie">${formato(m.pie)}</div>` : ''}
        <div class="abrir-lista">☰ ${formato(m.boton)}</div>
      </div>
      <div class="hoja">
        <div class="hoja__cabeza">${formato(m.boton)}</div>
        ${secciones}
      </div>
    </div></div>`;
  }

  return '';
}

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 400px;
    font-family: "Segoe UI", Roboto, Helvetica, Arial, "Segoe UI Emoji", sans-serif;
    font-size: 14.2px; line-height: 1.38; color: #111b21;
    background: #efeae2;
  }
  .cabeza {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; background: #1f2c34; color: #e9edef;
  }
  .cabeza svg { width: 38px; height: 38px; border-radius: 50%; }
  .cabeza b { display: block; font-size: 15.5px; font-weight: 600; }
  .cabeza small { font-size: 12px; color: #8696a0; }
  .chat { padding: 12px 10px 16px; display: flex; flex-direction: column; gap: 6px; }
  .fila { display: flex; }
  .fila--cliente { justify-content: flex-end; }
  .grupo { max-width: 86%; display: flex; flex-direction: column; gap: 2px; }
  .burbuja {
    max-width: 86%; padding: 7px 10px 8px; border-radius: 8px;
    background: #fff; box-shadow: 0 1px .5px rgba(11,20,26,.13);
    overflow-wrap: anywhere;
  }
  .grupo .burbuja { max-width: 100%; }
  .burbuja--cliente { background: #d9fdd3; }
  .burbuja--pegada { border-radius: 8px 8px 2px 2px; }
  .boton {
    background: #fff; color: #027eb5; text-align: center; font-weight: 500;
    padding: 9px; border-radius: 2px; box-shadow: 0 1px .5px rgba(11,20,26,.13);
  }
  .boton:last-child { border-radius: 2px 2px 8px 8px; }
  .pie { margin-top: 4px; font-size: 12.5px; color: #667781; }
  .abrir-lista {
    margin: 8px -10px -8px; padding: 9px; text-align: center;
    color: #027eb5; font-weight: 500; border-top: 1px solid #e9edef;
  }
  .hoja {
    margin-top: 6px; background: #fff; border-radius: 10px; overflow: hidden;
    box-shadow: 0 2px 6px rgba(11,20,26,.18);
  }
  .hoja__cabeza { padding: 12px 14px; font-weight: 600; text-align: center; border-bottom: 1px solid #e9edef; }
  .hoja__seccion { padding: 10px 14px 4px; font-size: 12.5px; color: #008069; font-weight: 600; }
  .hoja__fila {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding: 9px 14px; border-bottom: 1px solid #f0f2f5;
  }
  .hoja__titulo { font-size: 14.5px; }
  .hoja__desc { font-size: 12.5px; color: #667781; }
  .radio { flex: none; width: 18px; height: 18px; border: 2px solid #8696a0; border-radius: 50%; }
</style></head>
<body>
  <div class="cabeza">${logo}<div><b>Navaja Barber Club</b><small>demo · datos ficticios</small></div></div>
  <div class="chat">
    ${tramo.map(burbuja).join('\n')}
  </div>
</body></html>`;

fs.writeFileSync(salida, html);
console.log(`${tramo.length} mensajes → ${salida}`);
