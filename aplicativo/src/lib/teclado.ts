/** Altura do teclado aberto (0 quando fechado). Funciona também dentro de Modal. */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useAlturaTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const abre = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const fecha = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(abre, (e) => setAltura(e.endCoordinates.height));
    const b = Keyboard.addListener(fecha, () => setAltura(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return altura;
}
