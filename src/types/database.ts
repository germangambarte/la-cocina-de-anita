export type MetodoPago = "efectivo" | "transferencia" | "pendiente";

export type Pedido = {
  id: string;
  created_at: string;
  cliente_nombre: string;
  menu_nombre: string; // 👈 Nombre del plato/menú preparado
  cantidad_regular: number;
  cantidad_grande: number;
  hora_entrega: string;
  es_delivery: boolean;
  costo_delivery: number;
  monto_total: number;
  metodo_pago: MetodoPago;
  delivery_pagado: boolean;
  listo: boolean; // listo para entregar
  entregado: boolean;
};

export type NuevoPedido = Omit<Pedido, "id" | "created_at">;
export type ActualizarPedido = Partial<Omit<Pedido, "id" | "created_at">>;

export type CategoriaGasto =
  | "carnes"
  | "verduras_hortalizas"
  | "pastas_legumbres"
  | "almacen_pan"
  | "descartables_envases"
  | "servicios_gas_luz"
  | "varios";

export type Gasto = {
  id: string;
  created_at: string;
  fecha: string; // "YYYY-MM-DD"
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  metodo_pago: "efectivo" | "transferencia";
};

export type NuevoGasto = Omit<Gasto, "id" | "created_at">;
export type ActualizarGasto = Partial<Omit<Gasto, "id" | "created_at">>;

// ---- Caja de Ganancia ----

export type CajaConfig = {
  id: string;
  created_at: string;
  fecha_inicio: string; // "YYYY-MM-DD"
  saldo_inicial: number;
};

export type NuevoCajaConfig = Omit<CajaConfig, "id" | "created_at">;

export type CajaRetiro = {
  id: string;
  created_at: string;
  fecha: string; // "YYYY-MM-DD"
  concepto: string;
  monto: number;
};

export type NuevoCajaRetiro = Omit<CajaRetiro, "id" | "created_at">;
