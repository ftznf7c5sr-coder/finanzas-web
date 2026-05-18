import axios from 'axios'

interface DolarApiResponse {
  nombre: string
  compra: number
  venta: number
}

interface Rates {
  blue: number
  oficial: number
  mep: number
}

let cache: Rates | null = null
let lastFetch = 0

export const DolarService = {
  async getRates(): Promise<Rates> {
    const now = Date.now()
    if (cache && now - lastFetch < 5 * 60 * 1000) return cache

    try {
      const [blueRes, oficialRes, mepRes] = await Promise.all([
        axios.get<DolarApiResponse>('https://dolarapi.com/v1/dolares/blue'),
        axios.get<DolarApiResponse>('https://dolarapi.com/v1/dolares/oficial'),
        axios.get<DolarApiResponse>('https://dolarapi.com/v1/dolares/bolsa')
      ])

      cache = {
        blue: blueRes.data.venta,
        oficial: oficialRes.data.venta,
        mep: mepRes.data.venta
      }
      lastFetch = now
      return cache
    } catch {
      return cache ?? { blue: 0, oficial: 0, mep: 0 }
    }
  }
}
