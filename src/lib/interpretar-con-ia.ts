import { supabase } from "./supabase";
import type { MetodoPago } from "../types/database";
import type { PedidoImportado } from "./importar-pedido";
import {
  aplicarDefaults,
  buscarClienteConocido,
  type ContextoIA,
  type PedidoDetectado,
} from "./clientes-conocidos";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "transferencia", "pendiente"];

function aCantidad(valor: unknown): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  return Math.min(50, Math.round(numero));
}

function aKilos(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.min(50, Math.round(numero * 100) / 100);
}

function aHora(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const match = valor.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hora = Number(match[1]);
  const minutos = Number(match[2]);
  if (hora > 23 || minutos > 59) return null;

  return `${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function aMetodoPago(valor: unknown): MetodoPago | null {
  return METODOS_PAGO.includes(valor as MetodoPago)
    ? (valor as MetodoPago)
    : null;
}

function validarDetectado(item: unknown): PedidoDetectado | null {
  if (!item || typeof item !== "object") return null;
  const fila = item as Record<string, unknown>;

  const clienteNombre =
    typeof fila.cliente_nombre === "string"
      ? fila.cliente_nombre.trim().slice(0, 80)
      : "";

  const cantidadRegular = aCantidad(fila.cantidad_regular);
  const cantidadGrande = aCantidad(fila.cantidad_grande);
  const kilos = aKilos(fila.kilos);

  if (!clienteNombre && cantidadRegular === 0 && cantidadGrande === 0 && !kilos) {
    return null;
  }

  const producto =
    typeof fila.producto === "string" && fila.producto.trim()
      ? fila.producto.trim().slice(0, 80)
      : null;

  const faltantes = Array.isArray(fila.faltantes)
    ? fila.faltantes.filter((valor): valor is string => typeof valor === "string")
    : [];

  return {
    cliente_nombre: clienteNombre,
    producto,
    cantidad_regular: cantidadRegular,
    cantidad_grande: cantidadGrande,
    kilos,
    hora_entrega: aHora(fila.hora_entrega),
    es_delivery:
      typeof fila.es_delivery === "boolean" ? fila.es_delivery : null,
    metodo_pago: aMetodoPago(fila.metodo_pago),
    faltantes,
    notas: typeof fila.notas === "string" ? fila.notas.slice(0, 300) : "",
  };
}

/**
 * Pide a la Edge Function que interprete el texto con DeepSeek (u otro
 * proveedor compatible). Si la función no está desplegada o falla, lanza una
 * excepción para que la pantalla use el parser local como respaldo.
 */
export async function interpretarConIA(
  texto: string,
  contexto: ContextoIA,
): Promise<PedidoImportado[]> {
  const { data, error } = await supabase.functions.invoke(
    "interpretar-pedidos",
    {
      body: {
        texto,
        contexto: {
          menuDelDia: contexto.menuDelDia,
          precioRegular: contexto.precioRegular,
          precioGrande: contexto.precioGrande,
          precioKilo: contexto.precioKilo,
          costoDeliveryDefault: contexto.costoDeliveryDefault,
          horaEntregaDefault: contexto.horaEntregaDefault,
          fecha: new Date().toISOString(),
          clientes: contexto.clientes,
        },
      },
    },
  );

  if (error) throw error;

  const lista = (data as { pedidos?: unknown } | null)?.pedidos;
  if (!Array.isArray(lista)) {
    throw new Error("La IA devolvió una respuesta con formato inesperado.");
  }

  const pedidos = lista
    .map(validarDetectado)
    .filter((pedido): pedido is PedidoDetectado => pedido !== null)
    .map((pedido) =>
      aplicarDefaults(
        pedido,
        buscarClienteConocido(pedido.cliente_nombre, contexto.clientes),
        contexto,
      ),
    );

  if (pedidos.length === 0) {
    throw new Error("La IA no detectó pedidos en el texto.");
  }

  return pedidos;
}
