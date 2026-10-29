// Edge Function: interpretar-pedidos
//
// Recibe el texto de uno o varios mensajes de WhatsApp y devuelve los pedidos
// detectados en JSON. La API key vive en los secrets de Supabase, nunca en el
// frontend.
//
// Secrets necesarios:
//   supabase secrets set AI_API_KEY=sk-...
//   supabase secrets set AI_BASE_URL=https://api.deepseek.com
//   supabase secrets set AI_MODEL=deepseek-chat
//
// Funciona con cualquier proveedor compatible con la API de OpenAI
// (DeepSeek, OpenRouter, OpenAI, Groq, etc.).

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClienteHabitual {
  nombre: string;
  tamano: "regular" | "grande";
  hora: string;
  esDelivery: boolean;
  metodoPago: string;
  pedidos: number;
}

interface Contexto {
  menuDelDia?: string;
  precioRegular?: number;
  precioGrande?: number;
  precioKilo?: number;
  horaEntregaDefault?: string;
  fecha?: string;
  clientes?: ClienteHabitual[];
}

const PROMPT_SISTEMA = `Sos el asistente de pedidos de "La Cocina de Anita", una cocina de viandas en Argentina. Recibís mensajes de WhatsApp (uno solo, varios sueltos, o una conversación exportada con el formato "[fecha, hora] Nombre: texto") y tenés que extraer los pedidos de los CLIENTES en JSON.

Reglas obligatorias:
1. La dueña es Anita. Los mensajes de Anita son del negocio, NO son pedidos. Ignoralos como pedido.
2. Devolvé un pedido por cada cliente distinto. Nunca mezcles a dos clientes en un mismo pedido.
3. No inventes información. Si un dato no está en el texto, usá null (o 0 en cantidades) y agregá el campo a "faltantes".
4. Es un pedido cuando hay intención de compra: pide cantidad, dice "mandame", "anotame", "reservame", confirma un tamaño, o da una hora después de que Anita confirmó disponibilidad. Una consulta sola ("¿te queda?") sin confirmación NO es un pedido.
5. Un cliente habitual que dice "avisame cuando esté listo", "lo paso a buscar", "como siempre" o similar SÍ es un pedido: devolvelo con cantidad 0 y "cantidad" en faltantes.
6. Tamaños: "porción", "chica", "común", "regular", "vianda", "normal" → cantidad_regular. "grande", "doble", "XL" → cantidad_grande. Si dice solo "porción" o "una porción", asumí 1 regular.
7. Kilos: "1,5 kg de milanesas" → kilos 1.5 y producto "Milanesas".
8. Horas en formato HH:MM de 24 horas. "mediodía" → 12:00. "a la 1" → 13:00. "a las 8 de la noche" → 20:00.
9. es_delivery: true solo si pide envío ("mandar a domicilio", "delivery", "cadete"). false si dice que retira ("paso a buscar", "retiro"). null si no lo dice.
10. metodo_pago: "efectivo", "transferencia" o null si no lo dice.
11. producto: solo si nombra algo específico ("milanesas", "tarta", "pollo"). Si no, null.
12. notas: dirección, aclaraciones ("sin sal", "paga con $10000") o "".
13. "faltantes": solo estos valores: "cantidad", "hora", "entrega", "pago".
14. La lista de "clientes habituales" son datos deducidos de pedidos anteriores. Usala solo para reconocer que el cliente existe. NO completes vos los datos faltantes: la app lo hace después.

Devolvé EXCLUSIVAMENTE un objeto JSON con esta forma:
{"pedidos":[{"cliente_nombre":"María Ferreira","producto":null,"cantidad_regular":1,"cantidad_grande":0,"kilos":null,"hora_entrega":"12:30","es_delivery":false,"metodo_pago":null,"faltantes":["pago"],"notas":""}]}

Si no hay ningún pedido, devolvé {"pedidos":[]}.`;

function respuestaJSON(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function extraerJSON(contenido: string): unknown {
  const limpio = contenido
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(limpio);
  } catch {
    const inicio = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    if (inicio !== -1 && fin > inicio) {
      return JSON.parse(limpio.slice(inicio, fin + 1));
    }
    throw new Error("La IA no devolvió un JSON válido.");
  }
}

function formatearClientes(clientes: ClienteHabitual[] | undefined): string {
  if (!clientes || clientes.length === 0) return "No hay clientes habituales.";

  return clientes
    .slice(0, 60)
    .map(
      (cliente) =>
        `- ${cliente.nombre}: ${cliente.tamano}, ${cliente.hora}, ${
          cliente.esDelivery ? "delivery" : "retira"
        }, pago ${cliente.metodoPago} (${cliente.pedidos} pedidos)`,
    )
    .join("\n");
}

function armarMensajeUsuario(texto: string, contexto: Contexto): string {
  return `Datos de hoy:
- Fecha y hora actual: ${contexto.fecha ?? new Date().toISOString()}
- Menú del día: ${contexto.menuDelDia || "sin definir"}
- Precio regular: $${contexto.precioRegular ?? 0}
- Precio grande: $${contexto.precioGrande ?? 0}
- Precio por kilo: $${contexto.precioKilo ?? 0}
- Hora de entrega por defecto: ${contexto.horaEntregaDefault ?? "12:30"}

Clientes habituales:
${formatearClientes(contexto.clientes)}

Conversación de WhatsApp:
"""
${texto}
"""

Extraé los pedidos y devolvé solo el JSON.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return respuestaJSON({ error: "Método no permitido." }, 405);
  }

  try {
    const apiKey =
      Deno.env.get("AI_API_KEY") ?? Deno.env.get("DEEPSEEK_API_KEY");

    if (!apiKey) {
      return respuestaJSON(
        {
          error:
            "Falta configurar AI_API_KEY en los secrets de Supabase.",
        },
        503,
      );
    }

    const baseUrl = (
      Deno.env.get("AI_BASE_URL") ?? "https://api.deepseek.com"
    ).replace(/\/+$/, "");
    const model = Deno.env.get("AI_MODEL") ?? "deepseek-chat";

    const cuerpo = await req.json();
    const texto = typeof cuerpo?.texto === "string" ? cuerpo.texto : "";
    const contexto: Contexto =
      cuerpo?.contexto && typeof cuerpo.contexto === "object"
        ? cuerpo.contexto
        : {};

    if (texto.trim().length < 3) {
      return respuestaJSON({ error: "El texto está vacío." }, 400);
    }

    const respuesta = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT_SISTEMA },
          {
            role: "user",
            content: armarMensajeUsuario(texto.slice(0, 12000), contexto),
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error("Error del proveedor de IA:", respuesta.status, detalle);
      return respuestaJSON(
        { error: "El proveedor de IA rechazó la consulta.", detalle },
        502,
      );
    }

    const datos = await respuesta.json();
    const contenido: string = datos?.choices?.[0]?.message?.content ?? "";

    if (!contenido) {
      return respuestaJSON({ error: "La IA devolvió una respuesta vacía." }, 502);
    }

    const interpretado = extraerJSON(contenido) as { pedidos?: unknown };
    const pedidos = Array.isArray(interpretado?.pedidos)
      ? interpretado.pedidos.slice(0, 20)
      : [];

    return respuestaJSON({ pedidos });
  } catch (error) {
    console.error("Error interpretando pedidos:", error);
    return respuestaJSON(
      {
        error: "No se pudo interpretar el mensaje.",
        detalle: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
