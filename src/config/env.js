import dotenv from 'dotenv';

dotenv.config();

export default {
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  // App Secret de Meta, para verificar la firma del webhook.
  // Si no está puesto, la verificación queda apagada (ver middlewares).
  META_APP_SECRET: process.env.META_APP_SECRET,

  // Números que SIEMPRE pueden entrar al panel, separados por coma.
  // No se pueden quitar desde la web: son el seguro por si alguien se
  // equivoca editando la lista de admins. Si falta, nadie entra al panel.
  ADMIN_PRINCIPAL: process.env.ADMIN_PRINCIPAL,

  // Con qué se firman las cookies de sesión del panel. Si falta, se genera
  // uno al azar al arrancar: el panel funciona, pero cada despliegue cierra
  // las sesiones abiertas.
  SESION_SECRETO: process.env.SESION_SECRETO,

  // Dirección pública, para armar el enlace que se le manda al admin.
  URL_PUBLICA: process.env.URL_PUBLICA || 'http://localhost:3000',

  // Identificador de la hoja de cálculo: está en su URL, entre /d/ y /edit.
  // Sin él no hay agenda, y el bot lo avisa en vez de fallar en silencio.
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,

  // Contraseñas del panel de cada barbero.
  // ⚠️ Estas NO llevan respaldo a propósito: el punto de sacarlas del código
  // es que dejen de estar en el código. Si a un barbero le falta la suya, no
  // puede entrar a su panel — y se avisa en los logs al arrancar. El bot
  // sigue atendiendo clientes con normalidad.
  PASSWORD_CAMILO: process.env.PASSWORD_CAMILO,
  PASSWORD_MATEO: process.env.PASSWORD_MATEO,
  PASSWORD_SANTIAGO: process.env.PASSWORD_SANTIAGO,
  PASSWORD_PRUEBA: process.env.PASSWORD_PRUEBA,

  API_TOKEN: process.env.API_TOKEN,
  PORT: process.env.PORT,
  BUSINESS_PHONE: process.env.BUSINESS_PHONE,
  API_VERSION: process.env.API_VERSION,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};