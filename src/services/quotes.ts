import axios from 'axios'
import type { Investment } from './storage'

// CoinGecko IDs para los tickers más comunes
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network',
  DOT: 'polkadot', SHIB: 'shiba-inu', AVAX: 'avalanche-2', LINK: 'chainlink',
  UNI: 'uniswap', LTC: 'litecoin', XRP: 'ripple', ATOM: 'cosmos',
  NEAR: 'near', FTM: 'fantom', ALGO: 'algorand', XLM: 'stellar',
  USDC: 'usd-coin', BUSD: 'binance-usd', ARB: 'arbitrum', OP: 'optimism'
}

// Cache de cotizaciones: ticker → { price, ts }
const cache = new Map<string, { price: number; ts: number }>()
const CACHE_TTL = 3 * 60 * 1000 // 3 minutos

function cached(key: string): number | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.price
  return null
}

function store(key: string, price: number) {
  cache.set(key, { price, ts: Date.now() })
}

async function fetchCrypto(ticker: string, currency: 'ARS' | 'USD'): Promise<number | null> {
  const id = CRYPTO_IDS[ticker.toUpperCase()]
  if (!id) return null
  const key = `crypto_${id}_${currency}`
  const hit = cached(key)
  if (hit !== null) return hit
  const vs = currency === 'ARS' ? 'ars' : 'usd'
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${vs}`
  )
  const price: number | undefined = res.data?.[id]?.[vs]
  if (price == null) return null
  store(key, price)
  return price
}

// Yahoo Finance bloquea requests desde el browser por CORS → usamos un proxy
const CORS_PROXY = 'https://corsproxy.io/?'

function yahooUrl(symbol: string): string {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
  return CORS_PROXY + encodeURIComponent(url)
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  // Sanear: quitar .BA duplicado si ya venía en el ticker
  const clean = symbol.replace(/\.BA\.BA$/i, '.BA')
  const key = `yahoo_${clean}`
  const hit = cached(key)
  if (hit !== null) return hit
  const res = await axios.get(yahooUrl(clean))
  const price: number | undefined = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (price == null) return null
  store(key, price)
  return price
}

// Normaliza el ticker quitando .BA si el usuario lo puso a mano
function normalize(ticker: string): string {
  return ticker.toUpperCase().replace(/\.BA$/i, '').trim()
}

// CEDEARs: prueba DISND.BA → DISN.BA (sin D final) → DISND → DISN
async function fetchCedear(ticker: string): Promise<number | null> {
  const t = normalize(ticker)
  const variants = [
    t + '.BA',
    ...(t.endsWith('D') ? [t.slice(0, -1) + '.BA'] : []),
    t,
    ...(t.endsWith('D') ? [t.slice(0, -1)] : [])
  ]
  for (const v of variants) {
    const price = await fetchYahoo(v).catch(() => null)
    if (price != null) return price
  }
  return null
}

export const QuoteService = {
  async fetchPrice(ticker: string, type: Investment['type'], currency: 'ARS' | 'USD'): Promise<number | null> {
    if (!ticker) return null
    try {
      if (type === 'crypto') return await fetchCrypto(ticker, currency)
      if (type === 'stock' || type === 'bond') return await fetchYahoo(normalize(ticker) + '.BA')
      if (type === 'cedear') return await fetchCedear(ticker)
      return null
    } catch {
      return null
    }
  }
}
