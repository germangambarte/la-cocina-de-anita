import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useMenuDelDia() {
  const queryClient = useQueryClient();

  // Leer menú actual desde Supabase
  const query = useQuery({
    queryKey: ['configuracion', 'menu_del_dia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'menu_del_dia')
        .single();

      if (error) throw new Error(error.message);
      return data?.valor || 'Menú del Día';
    },
    refetchInterval: 30000, // Reconsultar cada 30 segundos automáticamente
  });

  // Modificar el menú en Supabase
  const mutation = useMutation({
    mutationFn: async (nuevoMenu: string) => {
      const { error } = await supabase
        .from('configuracion')
        .upsert({ clave: 'menu_del_dia', valor: nuevoMenu });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion', 'menu_del_dia'] });
    },
  });

  return {
    menuDelDia: query.data || 'Cargando menú...',
    isLoading: query.isLoading,
    actualizarMenu: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
