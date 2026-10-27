/**
 * SIMULACIÓN PARA LA DEMO
 *
 * Reemplaza SOLO las dos puertas del sistema hacia internet:
 *
 *   - `googleapis` → una hoja de cálculo en memoria, con datos ficticios.
 *   - `axios`      → en vez de mandarle el mensaje a Meta, lo imprime.
 *
 * Todo lo demás es el código real del proyecto, sin tocar: el bot, el panel,
 * la caché, los bloqueos, la verificación antes de escribir una fila, los
 * recordatorios. Esta carpeta se agregó para el portafolio; no existe en el
 * sistema que está en producción.
 *
 * Necesita Node 22.3 o superior (usa `mock.module`).
 */
import { mock } from 'node:test';
import { HORARIOS_POR_DEFECTO } from '../src/config/barbers.js';
import { fechaVisible, fechaHoraTurno } from '../src/config/fechas.js';

// ── La hoja en memoria ─────────────────────────────────────────────────

const ENCABEZADO = [
  'Fecha', 'Dia', 'Hora', 'Nombre', 'Telefono', 'Barbero',
  'Estado', 'FechaRegistro', 'FechaHoraTurno', 'RecordatorioEnviado',
];

/** Pestañas: nombre → filas (cada fila es un arreglo de textos). */
export const hoja = new Map([['barber', [ENCABEZADO]]]);

const COLUMNAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Entiende los rangos que usa el proyecto:
 *   'barber'!A:J   'barber'!A5:G5   'barber'!G5   'horarios'!A1
 */
function parsearRango(rango) {
  const m = String(rango).match(/^'?([^'!]+)'?!([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/);
  if (!m) throw new Error(`Unable to parse range: ${rango}`);

  const [, pestana, c1, f1, c2, f2] = m;
  const filaIni = f1 ? Number(f1) : 1;

  return {
    pestana,
    colIni: COLUMNAS.indexOf(c1),
    colFin: COLUMNAS.indexOf(c2 || c1),
    filaIni,
    filaFin: f2 ? Number(f2) : (f1 && !c2 ? filaIni : Infinity),
  };
}

/** Como Google: si la pestaña no existe, la lectura falla. */
function pestanaDe(nombre) {
  if (!hoja.has(nombre)) throw new Error(`Unable to parse range: '${nombre}'`);
  return hoja.get(nombre);
}

/** Como Google: no devuelve celdas vacías al final ni filas vacías al final. */
function recortar(filas) {
  const limpias = filas.map(f => {
    const copia = [...f];
    while (copia.length && (copia.at(-1) ?? '') === '') copia.pop();
    return copia;
  });
  while (limpias.length && limpias.at(-1).length === 0) limpias.pop();
  return limpias;
}

const valores = {
  async get({ range }) {
    const r = parsearRango(range);
    const filas = pestanaDe(r.pestana)
      .slice(r.filaIni - 1, r.filaFin === Infinity ? undefined : r.filaFin)
      .map(f => f.slice(r.colIni, r.colFin + 1).map(v => String(v ?? '')));

    const recortadas = recortar(filas);
    return { data: recortadas.length ? { range, values: recortadas } : { range } };
  },

  async append({ range, resource }) {
    const filas = pestanaDe(parsearRango(range).pestana);
    for (const fila of resource.values) filas.push(fila.map(String));
    return { data: { updates: { updatedRows: resource.values.length } } };
  },

  async update({ range, resource }) {
    const r = parsearRango(range);
    const filas = pestanaDe(r.pestana);

    resource.values.forEach((valoresFila, i) => {
      const indice = r.filaIni - 1 + i;
      while (filas.length <= indice) filas.push([]);
      valoresFila.forEach((v, j) => { filas[indice][r.colIni + j] = String(v); });
    });

    return { data: { updatedRows: resource.values.length } };
  },

  async clear({ range }) {
    const r = parsearRango(range);
    for (const fila of pestanaDe(r.pestana)) {
      for (let c = r.colIni; c <= r.colFin; c++) fila[c] = '';
    }
    return { data: {} };
  },
};

const sheetsFalso = {
  spreadsheets: {
    values: valores,
    async get() {
      return { data: { sheets: [...hoja.keys()].map(title => ({ properties: { title } })) } };
    },
    async batchUpdate({ resource }) {
      for (const pedido of resource.requests) {
        const titulo = pedido.addSheet?.properties?.title;
        if (titulo && !hoja.has(titulo)) hoja.set(titulo, []);
      }
      return { data: {} };
    },
  },
};

class GoogleAuthFalso {
  async getClient() { return { demo: true }; }
}

mock.module('googleapis', {
  namedExports: {
    google: {
      auth: { GoogleAuth: GoogleAuthFalso },
      sheets: () => sheetsFalso,
    },
  },
});

// ── WhatsApp falso ─────────────────────────────────────────────────────

/** Todo lo que el bot le habría mandado a Meta, en orden. */
export const enviados = [];

/** Quien quiera enterarse de cada envío (la conversación, por ejemplo). */
export const alEnviar = [];

let contador = 0;

mock.module('axios', {
  defaultExport: async ({ data }) => {
    enviados.push(data);
    for (const funcion of alEnviar) funcion(data);
    return { data: { messaging_product: 'whatsapp', messages: [{ id: `wamid.demo.${++contador}` }] } };
  },
});

// ── Datos ficticios ────────────────────────────────────────────────────

/** Hoy en Bogotá, igual que lo calcula el bot. */
function hoyEnBogota() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

const iso = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

const CLIENTES = [
  ['Andrés Pérez', '573001110001'],
  ['Valentina Ríos', '573001110002'],
  ['Daniel Mora', '573001110003'],
  ['Natalia Cruz', '573001110004'],
  ['Felipe Rojas', '573001110005'],
  ['Tomás Vargas', '573001110006'],
  ['Mariana López', '573001110007'],
];

/**
 * Siembra turnos en los próximos días, escritos exactamente como los escribe
 * el bot al confirmar: mismas columnas, mismos formatos.
 */
export function sembrarTurnos() {
  const filas = hoja.get('barber');
  const base = hoyEnBogota();
  let cliente = 0;

  for (let dias = 1; dias <= 6; dias++) {
    const fecha = new Date(base);
    fecha.setDate(base.getDate() + dias);
    const dia = iso(fecha);

    for (const barbero of ['Camilo', 'Mateo']) {
      const jornada = HORARIOS_POR_DEFECTO[barbero.toLowerCase()][fecha.getDay()];
      if (!jornada.length) continue;

      // Unos cuantos turnos tomados, repartidos por la jornada.
      const tomados = jornada.filter((_, i) => (i + dias + barbero.length) % 4 === 0);

      for (const hora of tomados) {
        const [nombre, telefono] = CLIENTES[cliente++ % CLIENTES.length];
        filas.push([
          dia, fechaVisible(dia), hora, nombre, telefono, barbero,
          'Confirmado', new Date().toISOString(), fechaHoraTurno(dia, hora), 'No',
        ]);
      }

      // Y un bloqueo: así se ve un descanso en el panel.
      if (dias === 2) {
        const hora = jornada.at(-1);
        filas.push([
          dia, fechaVisible(dia), hora, 'Descanso', '', barbero,
          'Confirmado', new Date().toISOString(), fechaHoraTurno(dia, hora), 'Sí',
        ]);
      }
    }
  }

  return filas.length - 1;
}
