import { useConfiguracion } from "./useConfiguracion";

export function useMenuDelDia() {
  const { getValor, setValor, isUpdating, isLoading } = useConfiguracion();

  return {
    menuDelDia: getValor("menu_del_dia", ""),
    isLoading,
    actualizarMenu: (nuevoMenu: string) =>
      setValor({ clave: "menu_del_dia", valor: nuevoMenu.trim() }),
    isUpdating,
  };
}
