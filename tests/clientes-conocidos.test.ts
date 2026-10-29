import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aplicarDefaults,
  buscarClienteConocido,
  coincidenNombres,
  extraerClientesConocidos,
  normalizarNombreCliente,
  type ClienteConocido,
  type PedidoDetectado,
} from "../src/lib/clientes-conocidos.ts";
import type { ContextoImportacion } from "../src/lib/importar-pedido.ts";
import type { Pedido } from "../src/types/database.ts";

let contador = 0;

function pedido(overrides: Partial<Pedido>): Pedido {
  contador += 1;
  return {
    id: `pedido-${contador}`,
    created_at: `2026-10-${String(contador).padStart(2, "0")}T11:00:00Z`,
    cliente_nombre: "Morales",
    menu_nombre: "Milanesas",
    cantidad_regular: 1,
    cantidad_grande: 0,
    hora_entrega: "13:00:00",
    es_delivery: false,
    costo_delivery: 0,
    monto_total: 4500,
    metodo_pago: "pendiente",
    delivery_pagado: false,
    listo: false,
    entregado: false,
    ...overrides,
  };
}

const contexto: ContextoImportacion = {
  menuDelDia: "Milanesas con puré",
  precioRegular: 4500,
  precioGrande: 7000,
  precioKilo: 7000,
  costoDeliveryDefault: 3000,
  horaEntregaDefault: "12:30",
};

function detectado(overrides: Partial<PedidoDetectado>): PedidoDetectado {
  return {
    cliente_nombre: "",
    producto: null,
    cantidad_regular: 0,
    cantidad_grande: 0,
    kilos: null,
    hora_entrega: null,
    es_delivery: null,
    metodo_pago: null,
    faltantes: [],
    notas: "",
    ...overrides,
  };
}

const historial = [
  pedido({ cliente_nombre: "Morales", created_at: "2026-10-20T11:00:00Z" }),
  pedido({ cliente_nombre: "Sr Morales", created_at: "2026-10-21T11:00:00Z" }),
  pedido({ cliente_nombre: "MORALES", created_at: "2026-10-22T11:00:00Z" }),
  pedido({ cliente_nombre: "ALEJANDRA LORENS", created_at: "2026-10-20T11:00:00Z" }),
  pedido({ cliente_nombre: "ALEJANDRA LORENS", created_at: "2026-10-21T11:00:00Z" }),
  pedido({
    cliente_nombre: "Maria Ferreira",
    created_at: "2026-10-23T11:00:00Z",
    cantidad_regular: 0,
    cantidad_grande: 1,
  }),
  pedido({
    cliente_nombre: "Cliente Delivery",
    created_at: "2026-10-20T11:00:00Z",
    es_delivery: true,
    costo_delivery: 3000,
    metodo_pago: "transferencia",
  }),
  pedido({
    cliente_nombre: "Cliente Delivery",
    created_at: "2026-10-21T11:00:00Z",
    es_delivery: true,
    costo_delivery: 3000,
    metodo_pago: "transferencia",
  }),
];

test("normaliza nombres con emojis y acentos", () => {
  assert.equal(
    normalizarNombreCliente("MARIA FERREIRA👱🏻‍♀️"),
    "maria ferreira",
  );
  assert.equal(normalizarNombreCliente("  José  Pérez "), "jose perez");
});

test("agrupa variantes del mismo cliente y exige un mínimo de pedidos", () => {
  const clientes = extraerClientesConocidos(historial);

  const morales = clientes.find((c) => coincidenNombres(c.nombre, "Morales"));
  assert.ok(morales);
  assert.equal(morales.pedidos, 3);

  assert.ok(clientes.some((c) => c.nombre === "ALEJANDRA LORENS"));
  // María pidió una sola vez: todavía no es "conocida".
  assert.ok(!clientes.some((c) => c.nombre === "Maria Ferreira"));
});

test("deduce tamaño, hora, entrega y pago habituales", () => {
  const clientes = extraerClientesConocidos(historial);
  const delivery = clientes.find((c) => c.nombre === "Cliente Delivery");

  assert.ok(delivery);
  assert.equal(delivery.tamano, "regular");
  assert.equal(delivery.hora, "13:00");
  assert.equal(delivery.esDelivery, true);
  assert.equal(delivery.costoDelivery, 3000);
  assert.equal(delivery.metodoPago, "transferencia");
});

test("encuentra clientes aunque el nombre venga distinto", () => {
  const clientes = extraerClientesConocidos(historial);

  assert.equal(buscarClienteConocido("Sr Morales", clientes)?.pedidos, 3);
  assert.equal(
    buscarClienteConocido("Alejandra Lorens", clientes)?.nombre,
    "ALEJANDRA LORENS",
  );
  // Con un solo pedido no hay historial suficiente.
  assert.equal(buscarClienteConocido("Maria Ferreira", clientes), null);
});

test("completa tamaño y hora de un cliente habitual", () => {
  const clientes = extraerClientesConocidos(historial);
  const morales = buscarClienteConocido("Morales", clientes) as ClienteConocido;

  const resultado = aplicarDefaults(
    detectado({ cliente_nombre: "Morales" }),
    morales,
    contexto,
  );

  assert.equal(resultado.cantidad_regular, 1);
  assert.equal(resultado.cantidad_grande, 0);
  assert.equal(resultado.hora_entrega, "13:00");
  assert.equal(resultado.es_delivery, false);
  assert.equal(resultado.metodo_pago, "pendiente");
  assert.ok(resultado.inferidos.some((i) => i.includes("tamaño")));
  assert.ok(resultado.inferidos.some((i) => i.includes("hora 13:00")));
});

test("respeta lo que el cliente dijo explícitamente", () => {
  const clientes = extraerClientesConocidos(historial);
  const morales = buscarClienteConocido("Morales", clientes) as ClienteConocido;

  const resultado = aplicarDefaults(
    detectado({
      cliente_nombre: "Morales",
      cantidad_grande: 2,
      hora_entrega: "12:00",
      es_delivery: true,
      metodo_pago: "efectivo",
    }),
    morales,
    contexto,
  );

  assert.equal(resultado.cantidad_grande, 2);
  assert.equal(resultado.cantidad_regular, 0);
  assert.equal(resultado.hora_entrega, "12:00");
  assert.equal(resultado.es_delivery, true);
  assert.equal(resultado.costo_delivery, 3000);
  assert.equal(resultado.metodo_pago, "efectivo");
  assert.deepEqual(resultado.inferidos, []);
});

test("si es un cliente nuevo sin datos, avisa y no inventa cantidades", () => {
  const resultado = aplicarDefaults(
    detectado({ cliente_nombre: "Cliente Nuevo" }),
    null,
    contexto,
  );

  assert.equal(resultado.cantidad_regular, 0);
  assert.equal(resultado.cantidad_grande, 0);
  assert.equal(resultado.hora_entrega, "12:30");
  assert.ok(resultado.avisos.some((a) => a.includes("cantidad")));
  assert.ok(resultado.avisos.some((a) => a.includes("hora")));
});
