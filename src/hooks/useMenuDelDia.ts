import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export function useMenuDelDia() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.menuDelDia,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.menuDelDia });
    },
  });

  return {
    menuDelDia: query.data ?? '',
    isLoading: query.isLoading,
    actualizarMenu: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
