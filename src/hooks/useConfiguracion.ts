import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

type FilaConfiguracion = { clave: string; valor: string };

export function useConfiguracion() {
  const queryClient = useQueryClient();

  const query = useQuery<FilaConfiguracion[]>({
    queryKey: queryKeys.configuracion,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select("clave, valor");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const valores = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of query.data ?? []) map[row.clave] = row.valor;
    return map;
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: async ({
      clave,
      valor,
    }: {
      clave: string;
      valor: string;
    }) => {
      const { error } = await supabase.from("configuracion").upsert({ clave, valor });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configuracion });
    },
  });

  return {
    getValor: (clave: string, fallback = "") => valores[clave] ?? fallback,
    setValor: mutation.mutate,
    isUpdating: mutation.isPending,
    isLoading: query.isLoading,
  };
}
