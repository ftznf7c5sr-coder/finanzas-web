import { boot } from 'quasar/wrappers'
import { signOut } from 'firebase/auth'
import { auth } from 'src/firebase'

export default boot(async () => {
  // En desarrollo se fuerza cierre de sesión para resetear el estado de prueba
  if (import.meta.env.DEV) {
    await signOut(auth).catch(() => {})
  }
})
