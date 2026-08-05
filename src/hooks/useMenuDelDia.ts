import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useMenuDelDia() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['configuracion', 'menu_del_dia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'menu_del_dia')
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data?.valor ?? '';
    },
  });

  const mutation = useMutation({
    mutationFn: async (nuevoMenu: string) => {
      const { error } = await supabase
        .from('configuracion')
        .upsert({ clave: 'menu_del_dia', valor: nuevoMenu.trim() });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion', 'menu_del_dia'] });
    },
  });

  return {
    menuDelDia: query.data ?? '',
    isLoading: query.isLoading,
    actualizarMenu: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
