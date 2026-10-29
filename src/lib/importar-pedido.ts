import type { MetodoPago } from "../types/database";

/**
 * Interpretación de mensajes de WhatsApp para cargar pedidos.
 *
 * Es un parser determinístico y sin dependencias: no llama a ninguna IA ni a
 * ningún servicio externo. La idea es sacar de encima el trabajo repetitivo
 * (cantidades, plato, hora, delivery) y dejar un borrador editable para que
 * Anita confirme. Nunca se guarda nada sin pasar por la pantalla de revisión.
 */

export interface ContextoImportacion {
  menuDelDia: string;
  precioRegular: number;
  precioGrande: number;
  precioKilo: number;
  costoDeliveryDefault: number;
  horaEntregaDefault: string;
}

export interface PedidoImportado {
  cliente_nombre: string;
  menu_nombre: string;
  cantidad_regular: number;
  cantidad_grande: number;
  hora_entrega: string;
  es_delivery: boolean;
  costo_delivery: number;
  metodo_pago: MetodoPago;
  total_comida: number;
  /** Kilos pedidos cuando el mensaje es del tipo "1,5 kg de milanesas". */
  kilos: number | null;
  /** Datos que se completaron solos (por historial o valores por defecto). */
  inferidos: string[];
  avisos: string[];
}

export const CONTEXTO_IMPORTACION_DEFAULT: ContextoImportacion = {
  menuDelDia: "",
  precioRegular: 4500,
  precioGrande: 7000,
  precioKilo: 7000,
  costoDeliveryDefault: 3000,
  horaEntregaDefault: "12:30",
};

const PALABRAS_NUMERO: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
};

const TOKEN_CANTIDAD =
  "(\\d{1,3}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)";

const UNIDAD =
  "(?:viandas?|bandejas?|porcion(?:es)?|racion(?:es)?|platos?|almuerzos?|menus?|comidas?|tapers?)";
const UNIDAD_OPCIONAL = `${UNIDAD}?`;

const RE_GRANDE = new RegExp(
  `\\b${TOKEN_CANTIDAD}\\s*${UNIDAD_OPCIONAL}\\s*(?:grandes?|dobles?|xl|especiales?)\\b`,
);
const RE_REGULAR = new RegExp(
  `\\b${TOKEN_CANTIDAD}\\s*${UNIDAD_OPCIONAL}\\s*(?:comun(?:es)?|regular(?:es)?|normal(?:es)?|chic(?:a|o)s?|estandar|simple(?:s)?)\\b`,
);
const RE_CANTIDAD_SOLA = new RegExp(`\\b${TOKEN_CANTIDAD}\\s*${UNIDAD}\\b`);

const RE_KILOS_NUMERO = /\b(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)\b/;
const RE_KILOS_PALABRA =
  /\b(medio|media|un|una|uno|dos|tres|cuatro|cinco)\s*(?:kilo|kilos|kg)\b/;

const RE_DELIVERY =
  /\b(delivery|envio|envian|envias|enviar|domicilio|cadete|moto|reparto)\b/;
const RE_DELIVERY_FRASE =
  /\b(mandas?|mandan|llevan|traen|envian)\b[^.;\n]*\b(a|hasta)\s+(casa|mi casa|la oficina|el trabajo|mi trabajo|domicilio)\b/;
const RE_RETIRO =
  /\b(retiro|retira|retirar|paso a buscar|pasamos a buscar|busco|buscamos|voy a buscar|por el local|en el local)\b/;

const RE_TRANSFERENCIA =
  /\b(transferencia|transferi|transfiero|transfieren|alias|cbu|cvu|mercado pago|mercadopago|mp)\b/;
const RE_EFECTIVO = /\b(efectivo|contado|en mano|billetes?)\b/;

const RE_MONTO = /\$\s*([\d.,]+)/;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cantidadDesdeToken(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  return PALABRAS_NUMERO[token] ?? null;
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

function normalizarHora(
  hora: number,
  minutos: number,
  textoNormalizado: string,
): string | null {
  if (!Number.isFinite(hora) || !Number.isFinite(minutos)) return null;
  if (hora > 23 || minutos > 59) return null;

  let horaFinal = hora;
  const esTardeNoche = /\b(de la tarde|de la noche|pm)\b/.test(
    textoNormalizado,
  );
  const esManana = /\b(de la manana|am)\b/.test(textoNormalizado);

  if (esTardeNoche && horaFinal < 12) {
    horaFinal += 12;
  } else if (!esManana && horaFinal >= 1 && horaFinal <= 7) {
    // Para una cocina de almuerzos, "a la 1" es la 13.
    horaFinal += 12;
  }

  return `${dosDigitos(horaFinal)}:${dosDigitos(minutos)}`;
}

function parsearHora(textoNormalizado: string): string | null {
  // 12:30 o 12.30 (pero no "1.5 kg").
  const conMinutos = textoNormalizado.match(
    /\b(\d{1,2})[:.](\d{2})\b(?!\s*(?:kg|kilos?|kilogramos?))/,
  );
  if (conMinutos) {
    return normalizarHora(
      Number(conMinutos[1]),
      Number(conMinutos[2]),
      textoNormalizado,
    );
  }

  // "a las 12 y 30", "para la 1 y media".
  const conY = textoNormalizado.match(
    /\b(?:a|para)\s+la?s?\s+(\d{1,2})\s+y\s+(media|cuarto|\d{2})\b/,
  );
  if (conY) {
    const minutos =
      conY[2] === "media" ? 30 : conY[2] === "cuarto" ? 15 : Number(conY[2]);
    return normalizarHora(Number(conY[1]), minutos, textoNormalizado);
  }

  // "a las 12", "para la 1", "a la 1 de la tarde".
  const conA = textoNormalizado.match(
    /\b(?:a|para)\s+la?s?\s+(\d{1,2})\b/,
  );
  if (conA) {
    return normalizarHora(Number(conA[1]), 0, textoNormalizado);
  }

  // "12 hs", "13 horas".
  const conHs = textoNormalizado.match(/\b(\d{1,2})\s*(?:hs?|horas?)\b/);
  if (conHs) {
    return normalizarHora(Number(conHs[1]), 0, textoNormalizado);
  }

  if (/\bmedio\s*dia\b/.test(textoNormalizado)) return "12:00";

  return null;
}

function parsearKilos(textoNormalizado: string): number | null {
  const conNumero = textoNormalizado.match(RE_KILOS_NUMERO);
  if (conNumero) {
    const valor = Number(conNumero[1].replace(",", "."));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  const conPalabra = textoNormalizado.match(RE_KILOS_PALABRA);
  if (conPalabra) {
    const palabra = conPalabra[1];
    if (palabra === "medio" || palabra === "media") return 0.5;
    return cantidadDesdeToken(palabra);
  }

  return null;
}

const PALABRAS_NO_NOMBRE = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "uno",
  "para",
  "hoy",
  "manana",
  "mi",
  "mis",
  "tu",
  "con",
  "sin",
  "que",
  "quiero",
  "necesito",
  "te",
  "le",
  "por",
  "en",
  "a",
  "al",
  "y",
  "o",
  "me",
  "nos",
  "es",
  "son",
  "seria",
  "serian",
  "llevar",
  "retirar",
  "delivery",
  "envio",
  "efectivo",
  "transferencia",
]);

function capitalizar(palabra: string): string {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
}

function parsearCliente(textoOriginal: string): string {
  const conMayuscula = textoOriginal.match(
    /(?:\b[Ss]oy|\b[Hh]abla|\b[Tt]e habla|\b[Dd]e parte de|\b[Ee]s para)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
  );
  if (conMayuscula) return conMayuscula[1].trim();

  // Fallback para mensajes escritos todo en minúscula.
  const texto = normalizar(textoOriginal);
  const enMinuscula = texto.match(
    /\b(?:soy|habla|te habla|de parte de|es para)\s+([a-z]+(?:\s+[a-z]+)?)/,
  );
  if (enMinuscula) {
    const palabras = enMinuscula[1]
      .split(" ")
      .filter((palabra) => palabra && !PALABRAS_NO_NOMBRE.has(palabra))
      .slice(0, 2);
    if (palabras.length > 0) {
      return palabras.map(capitalizar).join(" ");
    }
  }

  return "";
}

function parsearMetodoPago(textoNormalizado: string): MetodoPago {
  if (RE_TRANSFERENCIA.test(textoNormalizado)) return "transferencia";
  if (RE_EFECTIVO.test(textoNormalizado)) return "efectivo";
  return "pendiente";
}

interface LineaChat {
  autor: string;
  texto: string;
}

const RE_LINEA_CHAT_ANDROID =
  /^\[(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?),\s*\d{1,2}:\d{2}(?::\d{2})?\]\s*([^:]+):\s*(.*)$/;
const RE_LINEA_CHAT_IOS =
  /^\s*(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*\d{1,2}:\d{2}\s+-\s*([^:]+):\s*(.*)$/;

/**
 * Reconoce el formato de "Exportar chat" de WhatsApp (Android e iOS) y separa
 * cada burbuja por autor. Devuelve null si el texto no parece un chat pegado.
 */
function extraerLineasChat(mensaje: string): LineaChat[] | null {
  const resultado: LineaChat[] = [];

  for (const linea of mensaje.split("\n")) {
    const match =
      linea.match(RE_LINEA_CHAT_ANDROID) ?? linea.match(RE_LINEA_CHAT_IOS);

    if (!match) {
      if (resultado.length > 0) {
        resultado[resultado.length - 1].texto += ` ${linea.trim()}`;
      }
      continue;
    }

    resultado.push({ autor: match[2].trim(), texto: match[3].trim() });
  }

  return resultado.length > 0 ? resultado : null;
}

export function interpretarMensaje(
  mensaje: string,
  contexto: ContextoImportacion = CONTEXTO_IMPORTACION_DEFAULT,
): PedidoImportado {
  const lineasChat = extraerLineasChat(mensaje);

  // Si hay varios participantes, el pedido no se puede interpretar como un
  // bloque único: se mezclarían clientes distintos. Preferimos no inventar.
  if (lineasChat) {
    const autores = new Set(lineasChat.map((linea) => normalizar(linea.autor)));
    if (autores.size > 1) {
      return {
        cliente_nombre: "",
        menu_nombre: contexto.menuDelDia.trim() || "Menú del Día",
        cantidad_regular: 0,
        cantidad_grande: 0,
        hora_entrega: contexto.horaEntregaDefault,
        es_delivery: false,
        costo_delivery: 0,
        metodo_pago: "pendiente",
        total_comida: 0,
        kilos: null,
        avisos: [
          "Detecté una conversación con varios participantes (incluidos los mensajes de Anita). Por ahora pegá solo las burbujas del cliente.",
        ],
        inferidos: [],
      };
    }
  }

  const textoBase = lineasChat
    ? lineasChat.map((linea) => linea.texto).join(" ")
    : mensaje;
  const clienteDelChat = lineasChat?.[0]?.autor ?? "";
  const texto = normalizar(textoBase);
  const avisos: string[] = [];

  // --- Cantidades ---
  const matchGrande = texto.match(RE_GRANDE);
  const matchRegular = texto.match(RE_REGULAR);

  const cantidadGrande = matchGrande
    ? (cantidadDesdeToken(matchGrande[1]) ?? 0)
    : 0;
  let cantidadRegular = matchRegular
    ? (cantidadDesdeToken(matchRegular[1]) ?? 0)
    : 0;

  if (!matchGrande && !matchRegular) {
    const matchSola = texto.match(RE_CANTIDAD_SOLA);
    if (matchSola) {
      const cantidad = cantidadDesdeToken(matchSola[1]) ?? 0;
      if (cantidad > 0) {
        cantidadRegular = cantidad;
        avisos.push(
          `Asumí que las ${cantidad} viandas son regulares. Cambialo si alguna es grande.`,
        );
      }
    }
  }

  // --- Kilos ---
  const kilos = parsearKilos(texto);
  const esPorKilo = kilos !== null && cantidadRegular === 0 && cantidadGrande === 0;
  if (kilos !== null && !esPorKilo) {
    avisos.push(
      "El mensaje menciona kilos y viandas a la vez. Revisá el pedido.",
    );
  }

  // --- Hora ---
  const horaDetectada = parsearHora(texto);
  if (!horaDetectada) {
    avisos.push(
      `No detecté la hora de entrega. Puse ${contexto.horaEntregaDefault}.`,
    );
  }
  const horaEntrega = horaDetectada ?? contexto.horaEntregaDefault;

  // --- Delivery ---
  const detectaEntrega =
    RE_DELIVERY.test(texto) || RE_DELIVERY_FRASE.test(texto);
  const detectaRetiro = RE_RETIRO.test(texto);
  const esDelivery = detectaEntrega && !detectaRetiro;
  if (!detectaEntrega && !detectaRetiro) {
    avisos.push(
      "No detecté si es delivery o retira en el local. Asumí que retira.",
    );
  }

  // --- Plato ---
  const mencionaMilanesa = /\bmilanesa/.test(texto);
  let menuNombre = mencionaMilanesa
    ? "Milanesas de Pollo"
    : contexto.menuDelDia.trim() || "Menú del Día";
  if (esPorKilo && !mencionaMilanesa) {
    menuNombre = contexto.menuDelDia.trim() || "Producto por kilo";
  }
  if (!contexto.menuDelDia.trim() && !mencionaMilanesa) {
    avisos.push("No hay menú del día configurado. Revisá el plato.");
  }

  // --- Cliente ---
  const cliente = clienteDelChat || parsearCliente(textoBase);
  if (!cliente) {
    avisos.push(
      "No pude detectar el nombre del cliente. Escribilo antes de guardar.",
    );
  }

  // --- Referencias sueltas ---
  if (/\bmanana\b/.test(texto)) {
    avisos.push(
      "El mensaje parece ser para mañana, pero la app registra la fecha de hoy.",
    );
  }

  const montoMencionado = texto.match(RE_MONTO);
  if (montoMencionado) {
    const soloDigitos = montoMencionado[1].replace(/[^\d]/g, "");
    if (soloDigitos) {
      avisos.push(
        `El mensaje menciona $${Number(soloDigitos).toLocaleString("es-AR")}. Compará con el total calculado.`,
      );
    }
  }

  // --- Totales ---
  const costoDelivery = esDelivery ? contexto.costoDeliveryDefault : 0;
  let totalComida: number;

  if (esPorKilo && kilos !== null) {
    totalComida = Math.round(kilos * contexto.precioKilo);
    avisos.push(
      `Pedido por kilo (${kilos} kg). Verificá el monto de la comida.`,
    );
  } else {
    totalComida =
      cantidadRegular * contexto.precioRegular +
      cantidadGrande * contexto.precioGrande;
    if (cantidadRegular === 0 && cantidadGrande === 0) {
      avisos.push("No detecté cantidades. Cargalas antes de guardar.");
    }
  }

  return {
    cliente_nombre: cliente,
    menu_nombre: menuNombre,
    cantidad_regular: cantidadRegular,
    cantidad_grande: cantidadGrande,
    hora_entrega: horaEntrega,
    es_delivery: esDelivery,
    costo_delivery: costoDelivery,
    metodo_pago: parsearMetodoPago(texto),
    total_comida: totalComida,
    kilos,
    inferidos: [],
    avisos,
  };
}
