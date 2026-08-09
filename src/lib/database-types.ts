import type {
  ActualizarGasto,
  ActualizarPedido,
  CajaConfig,
  CajaRetiro,
  Gasto,
  NuevoCajaConfig,
  NuevoCajaRetiro,
  NuevoGasto,
  NuevoPedido,
  Pedido,
} from "../types/database";

export type ActualizarCajaRetiro = Partial<Omit<CajaRetiro, "id" | "created_at">>;

export interface Database {
  public: {
    Tables: {
      pedidos: {
        Row: Pedido;
        Insert: NuevoPedido;
        Update: ActualizarPedido;
        Relationships: [];
      };
      gastos: {
        Row: Gasto;
        Insert: NuevoGasto;
        Update: ActualizarGasto;
        Relationships: [];
      };
      caja_config: {
        Row: CajaConfig;
        Insert: NuevoCajaConfig;
        Update: Partial<Omit<CajaConfig, "id" | "created_at">>;
        Relationships: [];
      };
      caja_retiros: {
        Row: CajaRetiro;
        Insert: NuevoCajaRetiro;
        Update: ActualizarCajaRetiro;
        Relationships: [];
      };
      configuracion: {
        Row: { clave: string; valor: string };
        Insert: { clave: string; valor: string };
        Update: { clave?: string; valor?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
