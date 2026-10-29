# Función `interpretar-pedidos`

Interpreta mensajes de WhatsApp y devuelve los pedidos detectados en JSON.
La usa la pantalla **Importar desde WhatsApp** de la app.

La API key vive **solo** en los secrets de Supabase. Nunca se expone en el
frontend ni en el repositorio.

> Todo el despliegue se puede hacer desde el panel web de Supabase. La CLI es
> opcional.

## 1. Sacar la key de DeepSeek

1. Entrá a <https://platform.deepseek.com>
2. **API keys** → **Create new API key**
3. Copiá la key (empieza con `sk-`). No se vuelve a mostrar.

## 2. Configurar los secrets

### Desde la web (sin instalar nada)

1. Entrá al panel de tu proyecto en <https://supabase.com/dashboard>.
2. En el menú lateral, **Edge Functions** → pestaña **Secrets** (también
   aparece en **Project Settings → Edge Functions**).
3. Agregá estos tres secretos:

   | Nombre | Valor |
   |---|---|
   | `AI_API_KEY` | `sk-tu-key` |
   | `AI_BASE_URL` | `https://api.deepseek.com` |
   | `AI_MODEL` | `deepseek-chat` |

Quedan disponibles para todas las Edge Functions del proyecto.

### Con la CLI (alternativa)

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase secrets set \
  AI_API_KEY=sk-tu-key \
  AI_BASE_URL=https://api.deepseek.com \
  AI_MODEL=deepseek-chat
```

El `project-ref` es el subdominio de tu URL: si tu `.env` tiene
`VITE_SUPABASE_URL=https://abcd1234.supabase.co`, el ref es `abcd1234`.

## 3. Desplegar

### Desde la web

1. **Edge Functions** → **Deploy a new function** → **Via editor**
   (o **Create function**).
2. Nombre: `interpretar-pedidos` (tiene que ser exacto, así lo llama la app).
3. Borrá el código de ejemplo y pegá el contenido completo de
   [`index.ts`](./index.ts).
4. Dejá activada la verificación de JWT: la app llama a la función con la
   sesión del usuario.
5. **Deploy**.

### Con la CLI (alternativa)

```bash
npx supabase functions deploy interpretar-pedidos
```

## 4. Probar

Desde la app, iniciá sesión y usá **+ → Importar de WhatsApp**. Si algo falla,
la app cae automáticamente al intérprete local y te avisa en pantalla.

Para probar la función sola:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/interpretar-pedidos" \
  -H "Authorization: Bearer <tu-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"texto":"Hola Anita, 2 comunes y 1 grande para las 12:30. Paso a buscar","contexto":{"menuDelDia":"Milanesas","precioRegular":4500,"precioGrande":7000,"horaEntregaDefault":"12:30"}}'
```

## Cambiar de proveedor

La función habla la API de OpenAI, así que sirve para cualquiera compatible.
Solo cambiá los tres secrets:

| Proveedor | `AI_BASE_URL` | `AI_MODEL` |
|---|---|---|
| DeepSeek (directo) | `https://api.deepseek.com` | `deepseek-chat` |
| OpenRouter | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |

No hace falta tocar el código ni volver a desplegar.

## Costos

Cada pegado son unos pocos cientos de tokens. Con DeepSeek, interpretar un
pedido cuesta fracciones de centavo. Para una cocina con decenas de pedidos por
día el gasto es insignificante.

## Privacidad

Los mensajes (incluidos los nombres de los clientes) se envían al proveedor de
IA elegido. La app no envía teléfonos ni datos de la base: solo el texto que se
pega y el menú/precios configurados. El resultado no se guarda en ningún lado
hasta que la persona confirma el pedido.
