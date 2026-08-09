import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CajaConfig, CajaRetiro, NuevoCajaConfig, NuevoCajaRetiro } from "../types/database";

export type ActualizarCajaRetiro = Partial<Omit<CajaRetiro, "id" | "created_at">>;

// --- Configuración de la caja (una sola fila) ---

export function useCajaConfig() {
  return useQuery<CajaConfig | null>({
    queryKey: ["caja-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caja_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data as CajaConfig) ?? null;
    },
  });
}

export function useSetCajaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      config,
    }: {
      id?: string;
      config: NuevoCajaConfig;
    }) => {
      if (id) {
        const { data, error } = await supabase
          .from("caja_config")
          .update(config)
          .eq("id", id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as CajaConfig;
      }

      const { data, error } = await supabase
        .from("caja_config")
        .insert([config])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CajaConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja-config"] });
    },
  });
}

// --- Retiros de la ganancia ---

export function useCajaRetiros() {
  return useQuery<CajaRetiro[]>({
    queryKey: ["caja-retiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caja_retiros")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) throw new Error(error.message);
      return data as CajaRetiro[];
    },
  });
}

export function useCreateCajaRetiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nuevoRetiro: NuevoCajaRetiro) => {
      const { data, error } = await supabase
        .from("caja_retiros")
        .insert([nuevoRetiro])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as CajaRetiro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja-retiros"] });
    },
  });
}

export function useUpdateCajaRetiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: ActualizarCajaRetiro;
    }) => {
      const { data, error } = await supabase
        .from("caja_retiros")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as CajaRetiro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja-retiros"] });
    },
  });
}

export function useDeleteCajaRetiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caja_retiros").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja-retiros"] });
    },
  });
}
