/**
 * Guardia contra secretos escritos en el código.
 *
 * Una contraseña escrita en el código queda en el historial de git para
 * siempre, aunque después se borre. Este test falla si alguien vuelve a
 * pegar una contraseña o un token, antes de que llegue a un commit.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function archivosDeCodigo(carpeta, encontrados = []) {
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);

    if (statSync(ruta).isDirectory()) archivosDeCodigo(ruta, encontrados);
    else if (nombre.endsWith('.js')) encontrados.push(ruta);
  }

  return encontrados;
}

const FUENTES = archivosDeCodigo('src').map(ruta => ({
  ruta,
  texto: readFileSync(ruta, 'utf8'),
}));

describe('no hay secretos en el código', () => {
  test('ninguna contraseña de barbero escrita', () => {
    // Una contraseña pegada a mano: `password: '...'` con texto literal, en
    // vez de leerla de la configuración.
    const sospechosos = [/password\s*:\s*['"`][^'"`]+['"`]/i];

    for (const { ruta, texto } of FUENTES) {
      for (const patron of sospechosos) {
        assert.ok(!patron.test(texto), `${ruta} tiene una contraseña escrita (${patron})`);
      }
    }
  });

  test('las contraseñas salen de la configuración', () => {
    const handler = FUENTES.find(f => f.ruta.endsWith('messageHandler.js'));

    for (const variable of ['PASSWORD_CAMILO', 'PASSWORD_MATEO', 'PASSWORD_SANTIAGO']) {
      assert.match(handler.texto, new RegExp(`config\\.${variable}`),
        `debería leer ${variable} de la configuración`);
    }
  });

  test('ninguna clave de API ni token pegado', () => {
    // Formas típicas de los tokens de Meta y de las llaves de Google.
    const peligrosos = [
      { patron: /EAA[A-Za-z0-9]{60,}/, que: 'un token de Meta' },
      { patron: /AIza[A-Za-z0-9_-]{30,}/, que: 'una clave de Google' },
      { patron: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, que: 'una llave privada' },
    ];

    for (const { ruta, texto } of FUENTES) {
      for (const { patron, que } of peligrosos) {
        assert.ok(!patron.test(texto), `${ruta} parece tener ${que}`);
      }
    }
  });

  test('el identificador de la hoja se puede cambiar sin tocar código', () => {
    const hojas = FUENTES.find(f => f.ruta.endsWith('googleSheetsService.js'));

    assert.match(hojas.texto, /SPREADSHEET_ID = config\.SPREADSHEET_ID/);
  });
});
