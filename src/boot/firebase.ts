import { boot } from 'quasar/wrappers'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from 'src/firebase'

export default boot(async () => {
  if (import.meta.env.DEV) {
    await signOut(auth).catch(() => {})
    return
  }
  // Esperar a que Firebase restaure el estado de sesión antes de que corra el router guard
  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub()
      resolve()
    })
  })
})
