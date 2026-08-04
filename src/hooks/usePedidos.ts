import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Pedido, NuevoPedido, ActualizarPedido } from '../types/database';


// Obtener lista de pedidos
export function usePedidos() {
  return useQuery<Pedido[]>({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('hora_entrega', { ascending: true });

      if (error) throw new Error(error.message);
      return data as Pedido[];
    },
  });
}

// Crear pedido
export function useCreatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nuevoPedido: NuevoPedido) => {
      const { data, error } = await supabase
        .from('pedidos')
        .insert([nuevoPedido])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Pedido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

// Actualizar campos (pago, delivery_pagado, entregado)
export function useUpdatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ActualizarPedido }) => {
      const { data, error } = await supabase
        .from('pedidos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Pedido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

// Eliminar Pedido
export function useDeletePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
