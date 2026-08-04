import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Gasto, NuevoGasto } from '../types/database';

export type ActualizarGasto = Partial<Omit<Gasto, 'id' | 'created_at'>>;

// Obtener la lista de gastos
export function useGastos() {
  return useQuery<Gasto[]>({
    queryKey: ['gastos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw new Error(error.message);
      return data as Gasto[];
    },
  });
}

// Crear gasto
export function useCreateGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nuevoGasto: NuevoGasto) => {
      const { data, error } = await supabase
        .from('gastos')
        .insert([nuevoGasto])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Gasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });
}

// Actualizar gasto
export function useUpdateGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ActualizarGasto }) => {
      const { data, error } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Gasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });
}

// Eliminar gasto
export function useDeleteGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });
}
