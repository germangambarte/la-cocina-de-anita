# La Cocina de Anita

App de gestión de pedidos, balance, caja y gastos del emprendimiento de viandas.

## Importar pedidos desde WhatsApp

En la pantalla de Pedidos, tocá el botón **+** → **Importar de WhatsApp** y pegá el mensaje del cliente. La app lo interpreta y arma un borrador editable (cliente, cantidades, hora, delivery y pago) que hay que **confirmar** antes de guardarlo. Nada se carga solo.

En Android, si la app está instalada como PWA, también podés mantener presionado un mensaje (o varios) en WhatsApp → **Compartir** → **Cocina Anita**. Se abre con el texto ya interpretado. En iOS no existe "compartir a PWA"; ahí hay que copiar y pegar.

La interpretación usa **DeepSeek** a través de una Edge Function de Supabase, así que la API key nunca llega al navegador. Si la función no está desplegada o falla, la app usa un intérprete local como respaldo. La puesta en marcha está en [`supabase/functions/README.md`](supabase/functions/README.md).

Podés pegar una conversación completa: la IA detecta **varios pedidos** (uno por cliente) y los vas confirmando de a uno. También ignora los mensajes de Anita y no mezcla clientes.

### Clientes habituales

La app deduce del historial de pedidos el patrón de cada cliente recurrente: tamaño habitual, hora, si retira o pide delivery, y cómo paga. Si alguien como Morales manda solo "avisame cuando esté listo", la app completa lo que falta y lo muestra como **"completado con su historial"**, para que se sepa qué dijo y qué se dedujo. Esos datos no se inventan: salen de pedidos reales.

El intérprete local de respaldo entiende, además:

- cantidades en números o palabras (`2 comunes y una grande`, `una porción chica`)
- horas (`12:30`, `a la 1 de la tarde`, `al mediodía`, `13 hs`)
- delivery o retiro en el local
- efectivo, transferencia o pago pendiente
- pedidos por kilo (`1,5 kg de milanesas`)
- el nombre del encabezado si pegás un chat exportado de un solo cliente

Siempre revisá la pantalla de confirmación antes de guardar.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # eslint
npm test         # tests del intérprete de mensajes
```

Las variables de entorno van en `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

La app también tiene un backend en Go en `server/` (en desarrollo) y las definiciones SQL en `supabase/` y `server/migrations/`.
