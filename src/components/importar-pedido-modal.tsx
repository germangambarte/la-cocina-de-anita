import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Check,
  Loader2,
  MessageCircle,
  SkipForward,
  Sparkles,
  Store,
  Wand2,
} from "lucide-react";
import type { MetodoPago } from "../types/database";
import {
  interpretarMensaje,
  type ContextoImportacion,
  type PedidoImportado,
} from "../lib/importar-pedido";
import {
  extraerClientesConocidos,
  type ContextoIA,
} from "../lib/clientes-conocidos";
import { interpretarConIA } from "../lib/interpretar-con-ia";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { useMenuDelDia } from "../hooks/useMenuDelDia";
import { useCreatePedido, usePedidos } from "../hooks/usePedidos";
import { CLAVES_CONFIG } from "../lib/constantes";
import { Modal } from "./ui/modal";

const COSTO_DELIVERY_DEFAULT = 3000;
const PRECIO_KILO_DEFAULT = 7000;
const HORA_DEFAULT = "12:30";

interface Borrador {
  cliente_nombre: string;
  menu_nombre: string;
  cantidad_regular: number;
  cantidad_grande: number;
  hora_entrega: string;
  es_delivery: boolean;
  costo_delivery: number;
  metodo_pago: MetodoPago;
  precio_regular: number;
  precio_grande: number;
  es_por_kilo: boolean;
  kilos: number;
  precio_kilo: number;
  avisos: string[];
  inferidos: string[];
}

interface Props {
  textoInicial?: string;
  onClose: () => void;
}

function borradorDesdePedido(
  pedido: PedidoImportado,
  contexto: ContextoImportacion,
): Borrador {
  const esPorKilo =
    pedido.kilos !== null &&
    pedido.cantidad_regular === 0 &&
    pedido.cantidad_grande === 0;

  return {
    cliente_nombre: pedido.cliente_nombre,
    menu_nombre: pedido.menu_nombre,
    cantidad_regular: pedido.cantidad_regular,
    cantidad_grande: pedido.cantidad_grande,
    hora_entrega: pedido.hora_entrega,
    es_delivery: pedido.es_delivery,
    costo_delivery: pedido.costo_delivery,
    metodo_pago: pedido.metodo_pago,
    precio_regular: contexto.precioRegular,
    precio_grande: contexto.precioGrande,
    es_por_kilo: esPorKilo,
    kilos: pedido.kilos ?? 1,
    precio_kilo:
      esPorKilo && pedido.kilos
        ? Math.round(pedido.total_comida / pedido.kilos)
        : PRECIO_KILO_DEFAULT,
    avisos: pedido.avisos,
    inferidos: pedido.inferidos,
  };
}

export function ImportarPedidoModal({ textoInicial = "", onClose }: Props) {
  const [texto, setTexto] = useState(textoInicial);
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [indice, setIndice] = useState(0);
  const [interpretando, setInterpretando] = useState(false);
  const [notaIA, setNotaIA] = useState<string | null>(null);

  const { menuDelDia, isLoading } = useMenuDelDia();
  const { getValor } = useConfiguracion();
  const { data: pedidos } = usePedidos();
  const createMutation = useCreatePedido();

  const clientes = useMemo(
    () => extraerClientesConocidos(pedidos ?? []),
    [pedidos],
  );

  const crearContexto = useCallback((): ContextoIA => {
    return {
      menuDelDia,
      precioRegular: Number(getValor(CLAVES_CONFIG.precioRegular, "4500")),
      precioGrande: Number(getValor(CLAVES_CONFIG.precioGrande, "7000")),
      precioKilo: PRECIO_KILO_DEFAULT,
      costoDeliveryDefault: COSTO_DELIVERY_DEFAULT,
      horaEntregaDefault: HORA_DEFAULT,
      clientes,
    };
  }, [menuDelDia, getValor, clientes]);

  const interpretar = useCallback(
    async (mensaje: string) => {
      const limpio = mensaje.trim();
      if (!limpio) return;

      setInterpretando(true);
      setNotaIA(null);
      const contexto = crearContexto();

      try {
        const pedidosIA = await interpretarConIA(limpio, contexto);
        setBorradores(
          pedidosIA.map((pedido) => borradorDesdePedido(pedido, contexto)),
        );
        setIndice(0);
      } catch (error) {
        console.error("Error de IA, usando parser local:", error);
        const local = interpretarMensaje(limpio, contexto);
        setBorradores([borradorDesdePedido(local, contexto)]);
        setIndice(0);
        setNotaIA(
          "No pude usar la IA (revisá que la función esté desplegada). Interpreté el mensaje con el modo local.",
        );
      } finally {
        setInterpretando(false);
      }
    },
    [crearContexto],
  );

  // Si el pedido viene de "compartir" desde WhatsApp, lo procesamos solo.
  const inicialProcesado = useRef(false);
  useEffect(() => {
    if (inicialProcesado.current || isLoading) return;
    const inicial = textoInicial.trim();
    if (!inicial) return;
    inicialProcesado.current = true;
    // Interpretación inicial con los datos ya cargados de configuración.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void interpretar(inicial);
  }, [textoInicial, isLoading, interpretar]);

  const borrador = borradores[indice] ?? null;
  const totalBorradores = borradores.length;

  const actualizar = <K extends keyof Borrador>(
    campo: K,
    valor: Borrador[K],
  ) => {
    setBorradores((prev) =>
      prev.map((actual, i) =>
        i === indice ? { ...actual, [campo]: valor } : actual,
      ),
    );
  };

  const totalComida = borrador
    ? borrador.es_por_kilo
      ? borrador.kilos * borrador.precio_kilo
      : borrador.cantidad_regular * borrador.precio_regular +
        borrador.cantidad_grande * borrador.precio_grande
    : 0;
  const total =
    totalComida + (borrador?.es_delivery ? borrador.costo_delivery : 0);

  const avanzar = () => {
    if (indice < totalBorradores - 1) setIndice(indice + 1);
    else onClose();
  };

  const handleGuardar = () => {
    if (!borrador) return;

    if (!borrador.cliente_nombre.trim()) {
      alert("Escribí el nombre del cliente antes de guardar.");
      return;
    }

    if (total <= 0) {
      alert("El pedido tiene que tener viandas, kilos o un monto mayor a $0.");
      return;
    }

    createMutation.mutate(
      {
        cliente_nombre: borrador.cliente_nombre.trim(),
        menu_nombre: borrador.menu_nombre.trim() || "Menú del Día",
        cantidad_regular: borrador.es_por_kilo ? 0 : borrador.cantidad_regular,
        cantidad_grande: borrador.es_por_kilo ? 0 : borrador.cantidad_grande,
        hora_entrega: borrador.hora_entrega,
        es_delivery: borrador.es_delivery,
        costo_delivery: borrador.es_delivery ? borrador.costo_delivery : 0,
        monto_total: Math.round(total),
        metodo_pago: borrador.metodo_pago,
        delivery_pagado: false,
        listo: false,
        entregado: false,
      },
      { onSuccess: avanzar },
    );
  };

  return (
    <Modal title="Importar desde WhatsApp" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex gap-2 text-xs font-bold text-emerald-900">
          <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Pegá acá los mensajes del cliente (o compartilos desde WhatsApp a la
            app). La IA los interpreta y <b>vos confirmás</b> antes de guardar.
          </span>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1">
            Mensajes de WhatsApp
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder={'Ej: "Hola Anita, 2 comunes y 1 grande para las 12:30. Paso a buscar"'}
            className="w-full border-2 border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-y"
          />
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            Podés pegar una conversación completa: se detectan varios clientes a
            la vez.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void interpretar(texto)}
          disabled={!texto.trim() || interpretando}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
        >
          {interpretando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Interpretando...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {borrador ? "Volver a interpretar" : "Interpretar mensajes"}
            </>
          )}
        </button>

        {notaIA && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-bold text-rose-800">
            {notaIA}
          </div>
        )}

        {borrador && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            {totalBorradores > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-600">
                  <span>
                    Pedido {indice + 1} de {totalBorradores}
                  </span>
                  <span className="text-slate-400">
                    {indice} confirmado{indice === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex gap-1">
                  {borradores.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < indice
                          ? "bg-emerald-500"
                          : i === indice
                            ? "bg-amber-500"
                            : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {borrador.inferidos.length > 0 && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex gap-2">
                <Wand2 className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
                <div className="text-xs font-bold text-sky-900">
                  <p className="text-[10px] font-black uppercase">
                    Completado con su historial
                  </p>
                  <p>{borrador.inferidos.join(" · ")}</p>
                </div>
              </div>
            )}

            {borrador.avisos.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase">
                  <AlertTriangle className="w-4 h-4" /> Revisá esto
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs font-bold text-amber-900">
                  {borrador.avisos.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Cliente
              </label>
              <input
                type="text"
                value={borrador.cliente_nombre}
                onChange={(e) =>
                  actualizar("cliente_nombre", e.target.value)
                }
                placeholder="Ej: María López"
                className="w-full border-2 border-slate-300 rounded-xl p-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Plato / Producto
              </label>
              <input
                type="text"
                value={borrador.menu_nombre}
                onChange={(e) => actualizar("menu_nombre", e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-slate-800 bg-amber-50/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => actualizar("es_por_kilo", false)}
                className={`py-2.5 rounded-xl font-black text-xs cursor-pointer transition ${
                  !borrador.es_por_kilo
                    ? "bg-amber-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Viandas
              </button>
              <button
                type="button"
                onClick={() => actualizar("es_por_kilo", true)}
                className={`py-2.5 rounded-xl font-black text-xs cursor-pointer transition ${
                  borrador.es_por_kilo
                    ? "bg-amber-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Por kilo
              </button>
            </div>

            {!borrador.es_por_kilo ? (
              <div className="space-y-3">
                <div className="bg-sky-50 border-2 border-sky-200 p-3 rounded-2xl flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sky-950 text-sm">
                      Regular
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-sky-900 mt-1">
                      <span>$</span>
                      <input
                        type="number"
                        step="any"
                        value={borrador.precio_regular}
                        onChange={(e) =>
                          actualizar(
                            "precio_regular",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-20 bg-white border border-sky-300 rounded-lg p-1 text-center font-black text-sky-950"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        actualizar(
                          "cantidad_regular",
                          Math.max(0, borrador.cantidad_regular - 1),
                        )
                      }
                      className="w-11 h-11 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-xl text-2xl font-black cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <span className="text-2xl font-black text-sky-950 w-8 text-center">
                      {borrador.cantidad_regular}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        actualizar(
                          "cantidad_regular",
                          borrador.cantidad_regular + 1,
                        )
                      }
                      className="w-11 h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-2xl font-black cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-orange-50 border-2 border-orange-200 p-3 rounded-2xl flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-orange-950 text-sm">
                      Grande
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-900 mt-1">
                      <span>$</span>
                      <input
                        type="number"
                        step="any"
                        value={borrador.precio_grande}
                        onChange={(e) =>
                          actualizar(
                            "precio_grande",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-20 bg-white border border-orange-300 rounded-lg p-1 text-center font-black text-orange-950"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        actualizar(
                          "cantidad_grande",
                          Math.max(0, borrador.cantidad_grande - 1),
                        )
                      }
                      className="w-11 h-11 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-xl text-2xl font-black cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <span className="text-2xl font-black text-orange-950 w-8 text-center">
                      {borrador.cantidad_grande}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        actualizar(
                          "cantidad_grande",
                          borrador.cantidad_grande + 1,
                        )
                      }
                      className="w-11 h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-2xl font-black cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 bg-amber-50 border-2 border-amber-200 p-3 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-black text-amber-900 uppercase mb-1">
                    Kilos
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={borrador.kilos}
                    onChange={(e) =>
                      actualizar("kilos", Number(e.target.value) || 0)
                    }
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 text-center text-lg font-black text-amber-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-amber-900 uppercase mb-1">
                    Precio por kg
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={borrador.precio_kilo}
                    onChange={(e) =>
                      actualizar("precio_kilo", Number(e.target.value) || 0)
                    }
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 text-center text-lg font-black text-amber-950"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Hora de entrega
              </label>
              <input
                type="time"
                value={borrador.hora_entrega}
                onChange={(e) =>
                  actualizar("hora_entrega", e.target.value)
                }
                className="w-full border-2 border-slate-300 rounded-xl p-2.5 text-base font-black text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Entrega
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => actualizar("es_delivery", false)}
                  className={`py-3 px-2 rounded-xl font-extrabold text-xs border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                    !borrador.es_delivery
                      ? "bg-emerald-600 border-emerald-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Store className="w-5 h-5" /> Retira
                </button>
                <button
                  type="button"
                  onClick={() => {
                    actualizar("es_delivery", true);
                    if (borrador.costo_delivery <= 0) {
                      actualizar("costo_delivery", COSTO_DELIVERY_DEFAULT);
                    }
                  }}
                  className={`py-3 px-2 rounded-xl font-extrabold text-xs border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                    borrador.es_delivery
                      ? "bg-blue-600 border-blue-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Bike className="w-5 h-5" /> Delivery
                </button>
              </div>

              {borrador.es_delivery && (
                <div className="mt-2 bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-extrabold text-blue-900 uppercase">
                    Costo de envío ($)
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={borrador.costo_delivery}
                    onChange={(e) =>
                      actualizar(
                        "costo_delivery",
                        Number(e.target.value) || 0,
                      )
                    }
                    className="w-28 bg-white border border-blue-300 rounded-lg p-1.5 text-center font-black text-blue-950 text-base"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["efectivo", "Efectivo"],
                    ["transferencia", "Transf."],
                    ["pendiente", "Pendiente"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => actualizar("metodo_pago", valor)}
                    className={`py-2.5 rounded-xl font-black text-xs border-2 cursor-pointer transition ${
                      borrador.metodo_pago === valor
                        ? "bg-slate-800 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-100 border-2 border-emerald-300 rounded-2xl flex justify-between items-center text-emerald-950 font-black">
              <span className="text-base">TOTAL A COBRAR</span>
              <span className="text-2xl font-black text-emerald-900">
                ${Math.round(total).toLocaleString("es-AR")}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={totalBorradores > 1 ? avanzar : onClose}
                className="flex-1 py-3 border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {totalBorradores > 1 ? (
                  <>
                    <SkipForward className="w-4 h-4" /> Omitir
                  </>
                ) : (
                  "Cancelar"
                )}
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={createMutation.isPending}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {indice < totalBorradores - 1
                      ? "CONFIRMAR Y SEGUIR"
                      : "CONFIRMAR PEDIDO"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
