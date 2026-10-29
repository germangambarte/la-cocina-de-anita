import type { MetodoPago, Pedido } from "../types/database";
import type { ContextoImportacion, PedidoImportado } from "./importar-pedido";

/**
 * Memoria de clientes habituales.
 *
 * No hace falta una tabla nueva: los patrones se deducen del historial de
 * pedidos que la app ya carga. Si un cliente pidió varias veces lo mismo, sus
 * datos se usan para completar lo que el mensaje no dice (tamaño, hora,
 * delivery, pago), marcándolo como "inferido" para que se vea en la revisión.
 */

export type TamanoHabitual = "regular" | "grande";

export interface ClienteConocido {
  nombre: string;
  tamano: TamanoHabitual;
  hora: string; // "HH:MM"
  esDelivery: boolean;
  costoDelivery: number;
  metodoPago: MetodoPago;
  pedidos: number;
}

/** Lo que la IA (o el parser) logra sacar del texto, sin completar nada. */
export interface PedidoDetectado {
  cliente_nombre: string;
  producto: string | null;
  cantidad_regular: number;
  cantidad_grande: number;
  kilos: number | null;
  hora_entrega: string | null;
  es_delivery: boolean | null;
  metodo_pago: MetodoPago | null;
  faltantes: string[];
  notas: string;
}

export interface ContextoIA extends ContextoImportacion {
  clientes: ClienteConocido[];
}

const PALABRAS_GENERICAS = new Set([
  "sr",
  "sra",
  "srta",
  "senor",
  "senora",
  "don",
  "dona",
  "cliente",
]);

export function normalizarNombreCliente(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensDeNombre(nombre: string): string[] {
  return normalizarNombreCliente(nombre)
    .split(" ")
    .filter((token) => token.length >= 2 && !PALABRAS_GENERICAS.has(token));
}

/** Compara nombres tolerando "Sr Morales" vs "Morales" o nombres con emojis. */
export function coincidenNombres(a: string, b: string): boolean {
  const tokensA = tokensDeNombre(a);
  const tokensB = tokensDeNombre(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const [corto, largo] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  return corto.every((token) => largo.includes(token));
}

function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export function extraerClientesConocidos(
  pedidos: Pedido[],
  minimoPedidos = 2,
): ClienteConocido[] {
  const grupos: { nombre: string; pedidos: Pedido[] }[] = [];

  for (const pedido of pedidos) {
    const nombre = pedido.cliente_nombre.trim();
    if (!nombre) continue;

    const existente = grupos.find((grupo) =>
      coincidenNombres(grupo.nombre, nombre),
    );

    if (existente) existente.pedidos.push(pedido);
    else grupos.push({ nombre, pedidos: [pedido] });
  }

  const clientes: ClienteConocido[] = [];

  for (const grupo of grupos) {
    if (grupo.pedidos.length < minimoPedidos) continue;

    // Del más nuevo al más viejo: sirve para desempatar por lo más reciente.
    const ordenados = [...grupo.pedidos].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );

    let votosGrande = 0;
    let votosRegular = 0;
    for (const pedido of ordenados) {
      if (pedido.cantidad_grande > 0 && pedido.cantidad_regular === 0) {
        votosGrande += 1;
      } else if (pedido.cantidad_regular > 0) {
        votosRegular += 1;
      }
    }

    const conteoHoras = new Map<string, number>();
    const conteoPagos = new Map<MetodoPago, number>();
    for (const pedido of ordenados) {
      const hora = horaCorta(pedido.hora_entrega);
      conteoHoras.set(hora, (conteoHoras.get(hora) ?? 0) + 1);
      conteoPagos.set(
        pedido.metodo_pago,
        (conteoPagos.get(pedido.metodo_pago) ?? 0) + 1,
      );
    }

    let hora = "12:30";
    let mejorHora = 0;
    for (const [valor, cantidad] of conteoHoras) {
      if (cantidad > mejorHora) {
        hora = valor;
        mejorHora = cantidad;
      }
    }

    let metodoPago: MetodoPago = "pendiente";
    let mejorPago = 0;
    for (const [valor, cantidad] of conteoPagos) {
      if (cantidad > mejorPago) {
        metodoPago = valor;
        mejorPago = cantidad;
      }
    }

    const conDelivery = ordenados.filter((p) => p.es_delivery).length;
    const esDelivery =
      conDelivery * 2 === ordenados.length
        ? ordenados[0].es_delivery
        : conDelivery * 2 > ordenados.length;

    const costoDelivery =
      ordenados.find((p) => p.es_delivery && p.costo_delivery > 0)
        ?.costo_delivery ?? 0;

    clientes.push({
      nombre: ordenados[0].cliente_nombre.trim(),
      tamano: votosGrande > votosRegular ? "grande" : "regular",
      hora,
      esDelivery,
      costoDelivery,
      metodoPago,
      pedidos: ordenados.length,
    });
  }

  return clientes.sort((a, b) => b.pedidos - a.pedidos);
}

export function buscarClienteConocido(
  nombre: string,
  clientes: ClienteConocido[],
): ClienteConocido | null {
  const normalizado = normalizarNombreCliente(nombre);
  if (!normalizado) return null;

  const exacto = clientes.find(
    (cliente) => normalizarNombreCliente(cliente.nombre) === normalizado,
  );
  if (exacto) return exacto;

  const candidatos = clientes.filter((cliente) =>
    coincidenNombres(cliente.nombre, nombre),
  );

  // Si hay más de uno, mejor no adivinar.
  return candidatos.length === 1 ? candidatos[0] : null;
}

const ETIQUETA_PAGO: Record<MetodoPago, string> = {
  efectivo: "efectivo",
  transferencia: "transferencia",
  pendiente: "pendiente",
};

/**
 * Completa los datos que faltan usando el historial del cliente. Todo lo que
 * se completa sin que el cliente lo haya dicho queda anotado en `inferidos`.
 */
export function aplicarDefaults(
  detectado: PedidoDetectado,
  cliente: ClienteConocido | null,
  contexto: ContextoImportacion,
): PedidoImportado {
  const inferidos: string[] = [];
  const avisos: string[] = [];

  let cantidadRegular = detectado.cantidad_regular;
  let cantidadGrande = detectado.cantidad_grande;
  const kilos = detectado.kilos;

  // --- Tamaño / cantidad ---
  if (!kilos && cantidadRegular === 0 && cantidadGrande === 0) {
    if (cliente) {
      if (cliente.tamano === "grande") cantidadGrande = 1;
      else cantidadRegular = 1;
      inferidos.push(`tamaño ${cliente.tamano} según su historial`);
    } else {
      avisos.push(
        "No detecté cantidad ni tamaño. Cargalos antes de guardar.",
      );
    }
  }

  // --- Hora ---
  let hora = detectado.hora_entrega;
  if (!hora) {
    if (cliente) {
      hora = cliente.hora;
      inferidos.push(`hora ${cliente.hora} según su historial`);
    } else {
      hora = contexto.horaEntregaDefault;
      avisos.push(
        `No detecté la hora. Puse ${contexto.horaEntregaDefault}.`,
      );
    }
  }

  // --- Entrega ---
  let esDelivery = detectado.es_delivery;
  if (esDelivery === null) {
    if (cliente) {
      esDelivery = cliente.esDelivery;
      inferidos.push(
        esDelivery ? "delivery según su historial" : "retira en el local",
      );
    } else {
      esDelivery = false;
      avisos.push("No detecté si es delivery. Asumí que retira.");
    }
  }

  // --- Pago ---
  let metodoPago = detectado.metodo_pago;
  if (!metodoPago) {
    if (cliente) {
      metodoPago = cliente.metodoPago;
      inferidos.push(
        `pago ${ETIQUETA_PAGO[cliente.metodoPago]} según su historial`,
      );
    } else {
      metodoPago = "pendiente";
    }
  }

  const costoDelivery = esDelivery
    ? cliente?.costoDelivery || contexto.costoDeliveryDefault
    : 0;

  const menu =
    detectado.producto?.trim() ||
    contexto.menuDelDia.trim() ||
    "Menú del Día";

  if (!contexto.menuDelDia.trim() && !detectado.producto) {
    avisos.push("No hay menú del día configurado. Revisá el plato.");
  }

  if (!detectado.cliente_nombre.trim()) {
    avisos.push(
      "No pude detectar el nombre del cliente. Escribilo antes de guardar.",
    );
  }

  if (detectado.notas.trim()) {
    avisos.push(`Nota del mensaje: ${detectado.notas.trim()}`);
  }

  const totalComida = kilos
    ? Math.round(kilos * contexto.precioKilo)
    : cantidadRegular * contexto.precioRegular +
      cantidadGrande * contexto.precioGrande;

  if (kilos) {
    avisos.push(`Pedido por kilo (${kilos} kg). Verificá el monto.`);
  }

  return {
    cliente_nombre: detectado.cliente_nombre,
    menu_nombre: menu,
    cantidad_regular: cantidadRegular,
    cantidad_grande: cantidadGrande,
    hora_entrega: hora,
    es_delivery: esDelivery,
    costo_delivery: costoDelivery,
    metodo_pago: metodoPago,
    total_comida: totalComida,
    kilos,
    inferidos,
    avisos,
  };
}
