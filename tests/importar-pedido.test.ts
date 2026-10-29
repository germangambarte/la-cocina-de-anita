import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpretarMensaje,
  type ContextoImportacion,
} from "../src/lib/importar-pedido.ts";

const contexto: ContextoImportacion = {
  menuDelDia: "Pollo al horno con papas",
  precioRegular: 4500,
  precioGrande: 7000,
  precioKilo: 7000,
  costoDeliveryDefault: 3000,
  horaEntregaDefault: "12:30",
};

test("detecta cantidades, hora y retiro en el local", () => {
  const pedido = interpretarMensaje(
    "Hola Anita, me mandás 2 comunes y 1 grande para las 12:30, paso a buscar",
    contexto,
  );

  assert.equal(pedido.cantidad_regular, 2);
  assert.equal(pedido.cantidad_grande, 1);
  assert.equal(pedido.hora_entrega, "12:30");
  assert.equal(pedido.es_delivery, false);
  assert.equal(pedido.menu_nombre, "Pollo al horno con papas");
  assert.equal(pedido.total_comida, 2 * 4500 + 7000);
});

test("interpreta cantidades escritas con palabras", () => {
  const pedido = interpretarMensaje(
    "Soy María, quiero dos comunes y una grande para las 13",
    contexto,
  );

  assert.equal(pedido.cliente_nombre, "María");
  assert.equal(pedido.cantidad_regular, 2);
  assert.equal(pedido.cantidad_grande, 1);
  assert.equal(pedido.hora_entrega, "13:00");
});

test("si solo dice viandas, las asume regulares y avisa", () => {
  const pedido = interpretarMensaje(
    "Hola, mandame 3 viandas para el mediodía con delivery",
    contexto,
  );

  assert.equal(pedido.cantidad_regular, 3);
  assert.equal(pedido.cantidad_grande, 0);
  assert.equal(pedido.hora_entrega, "12:00");
  assert.equal(pedido.es_delivery, true);
  assert.equal(pedido.costo_delivery, 3000);
  assert.ok(pedido.avisos.some((a) => a.includes("regulares")));
});

test("detecta pedidos por kilo de milanesas", () => {
  const pedido = interpretarMensaje(
    "1,5 kg de milanesas para las 13, te transfiero",
    contexto,
  );

  assert.equal(pedido.kilos, 1.5);
  assert.equal(pedido.cantidad_regular, 0);
  assert.equal(pedido.cantidad_grande, 0);
  assert.equal(pedido.menu_nombre, "Milanesas de Pollo");
  assert.equal(pedido.metodo_pago, "transferencia");
  assert.equal(pedido.total_comida, 1.5 * 7000);
});

test("entiende 'medio kilo'", () => {
  const pedido = interpretarMensaje("medio kilo de milanesas", contexto);
  assert.equal(pedido.kilos, 0.5);
});

test("no confunde 1,5 kg con una hora", () => {
  const pedido = interpretarMensaje(
    "2 kg de milanesas para las 20",
    contexto,
  );
  assert.equal(pedido.hora_entrega, "20:00");
  assert.equal(pedido.total_comida, 2 * 7000);
});

test("normaliza 'para la 1 de la tarde'", () => {
  const pedido = interpretarMensaje(
    "Soy José. Una común para la 1 de la tarde",
    contexto,
  );

  assert.equal(pedido.cliente_nombre, "José");
  assert.equal(pedido.cantidad_regular, 1);
  assert.equal(pedido.hora_entrega, "13:00");
});

test("prioriza cantidades explícitas sobre el total suelto", () => {
  const pedido = interpretarMensaje(
    "3 viandas: 2 comunes y 1 grande para las 12",
    contexto,
  );

  assert.equal(pedido.cantidad_regular, 2);
  assert.equal(pedido.cantidad_grande, 1);
  assert.equal(pedido.total_comida, 2 * 4500 + 7000);
});

test("detecta método de pago y monto mencionado", () => {
  const pedido = interpretarMensaje(
    "Soy Ana, 2 comunes. Son $9000, te pago en efectivo",
    contexto,
  );

  assert.equal(pedido.cliente_nombre, "Ana");
  assert.equal(pedido.metodo_pago, "efectivo");
  assert.ok(pedido.avisos.some((a) => a.includes("9.000")));
});

test("acepta hora con punto", () => {
  const pedido = interpretarMensaje(
    "hola, 1 común y 2 grandes para las 12.30",
    contexto,
  );

  assert.equal(pedido.hora_entrega, "12:30");
  assert.equal(pedido.cantidad_regular, 1);
  assert.equal(pedido.cantidad_grande, 2);
});

test("avisa cuando no detecta el nombre del cliente", () => {
  const pedido = interpretarMensaje("2 comunes para las 12", contexto);
  assert.ok(pedido.avisos.some((a) => a.includes("nombre del cliente")));
});

test("usa el menú del día por defecto", () => {
  const pedido = interpretarMensaje("1 común", contexto);
  assert.equal(pedido.menu_nombre, "Pollo al horno con papas");
});

test("reconoce 'una porción' y 'porción chica' como vianda regular", () => {
  const porcion = interpretarMensaje("Una porción", contexto);
  assert.equal(porcion.cantidad_regular, 1);

  const chica = interpretarMensaje("Le queda una porción chica?", contexto);
  assert.equal(chica.cantidad_regular, 1);
  assert.equal(chica.cantidad_grande, 0);
});

test("reconoce ración y plato", () => {
  assert.equal(interpretarMensaje("una ración", contexto).cantidad_regular, 1);
  assert.equal(interpretarMensaje("un plato", contexto).cantidad_regular, 1);
});

test("toma el nombre del encabezado de un chat exportado", () => {
  const pedido = interpretarMensaje(
    "[29/10, 11:00] ALEJANDRA LORENS: Una porción",
    contexto,
  );
  assert.equal(pedido.cliente_nombre, "ALEJANDRA LORENS");
  assert.equal(pedido.cantidad_regular, 1);
});

test("junta varias burbujas del mismo cliente", () => {
  const pedido = interpretarMensaje(
    "[29/10, 11:25] MARIA FERREIRA: Le queda una porción chica?\n[29/10, 11:32] MARIA FERREIRA: Nose tipo 12:30 ???",
    contexto,
  );
  assert.equal(pedido.cliente_nombre, "MARIA FERREIRA");
  assert.equal(pedido.cantidad_regular, 1);
  assert.equal(pedido.hora_entrega, "12:30");
});

test("no mezcla clientes distintos de un chat completo", () => {
  const pedido = interpretarMensaje(
    `[29/10, 11:25] MARIA FERREIRA: Le queda una porción chica?
[29/10, 11:32] ANITA AGUIRRE: Sisi para que hora la quiere?
[29/10, 11:32] MARIA FERREIRA: Nose tipo 12:30 ???
[29/10, 08:46] Sr Morales: Buen día Anita bueno avíseme cuando esté listo para retirarlo
[29/10, 11:00] ALEJANDRA LORENS: Una porción`,
    contexto,
  );
  assert.equal(pedido.cantidad_regular, 0);
  assert.equal(pedido.cantidad_grande, 0);
  assert.ok(pedido.avisos.some((a) => a.includes("varios participantes")));
});

test("un pedido implícito sin cantidad no inventa viandas", () => {
  const pedido = interpretarMensaje(
    "Buen día Anita bueno avíseme cuando esté listo para retirarlo",
    contexto,
  );
  assert.equal(pedido.cantidad_regular, 0);
  assert.equal(pedido.es_delivery, false);
  assert.ok(pedido.avisos.some((a) => a.includes("No detecté cantidades")));
});
