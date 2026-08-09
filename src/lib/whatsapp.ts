import type { Pedido } from "../types/database";

export interface ResultadoWhatsApp {
  mensaje: string;
  totalARendir: number;
  totalParaDelivery: number;
  cantidad: number;
}

export function buildDeliveryWhatsAppMessage(
  pedidos: Pedido[],
): ResultadoWhatsApp | null {
  const pendientes = pedidos.filter(
    (p) => p.es_delivery && p.metodo_pago === "pendiente",
  );

  if (pendientes.length === 0) return null;

  const nameCounts = pendientes.reduce(
    (acc, p) => {
      const name = p.cliente_nombre.trim();
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const detallePedidos = pendientes
    .map((p) => {
      const subtotalComida = p.monto_total - p.costo_delivery;
      const nombreCliente = p.cliente_nombre.trim();
      let lineaPedido = `- *${nombreCliente}*: $${subtotalComida.toLocaleString()}`;

      if (nameCounts[nombreCliente] > 1) {
        const fecha = new Date(p.created_at);
        const fechaFormateada = `(${fecha.getDate().toString().padStart(2, "0")}/${(fecha.getMonth() + 1).toString().padStart(2, "0")})`;
        lineaPedido += ` ${fechaFormateada}`;
      }
      return lineaPedido;
    })
    .join("\n");

  const { totalARendir, totalParaDelivery } = pendientes.reduce(
    (acc, p) => {
      if (!p.delivery_pagado) {
        acc.totalARendir += p.monto_total - p.costo_delivery;
        acc.totalParaDelivery += p.costo_delivery;
      } else {
        acc.totalARendir += p.monto_total;
      }
      return acc;
    },
    { totalARendir: 0, totalParaDelivery: 0 },
  );

  const mensaje = `José, le paso los pagos pendientes:\n\n${detallePedidos}\n\n--------------------------------\n\n*TOTAL COMIDA:* $${totalARendir.toLocaleString()}\n*TOTAL SUYO:* $${totalParaDelivery.toLocaleString()}`;

  return {
    mensaje,
    totalARendir,
    totalParaDelivery,
    cantidad: pendientes.length,
  };
}
