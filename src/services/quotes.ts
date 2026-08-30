import axios from 'axios'
import type { Investment } from './storage'

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network',
  DOT: 'polkadot', SHIB: 'shiba-inu', AVAX: 'avalanche-2', LINK: 'chainlink',
  UNI: 'uniswap', LTC: 'litecoin', XRP: 'ripple', ATOM: 'cosmos',
  NEAR: 'near', FTM: 'fantom', ALGO: 'algorand', XLM: 'stellar',
  USDC: 'usd-coin', BUSD: 'binance-usd', ARB: 'arbitrum', OP: 'optimism'
}

const cache = new Map<string, { price: number; ts: number }>()
const CACHE_TTL = 3 * 60 * 1000

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
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${vs}`,
    { timeout: 10000 }
  )
  const price: number | undefined = res.data?.[id]?.[vs]
  if (price == null) return null
  store(key, price)
  return price
}

// CORS proxies en orden de preferencia
const PROXY_FNS: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://cors-anywhere.herokuapp.com/${url}`,
]

function extractPrice(data: unknown): number | null {
  if (data == null || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  // Yahoo Finance v8 chart endpoint
  const chartResult = (d.chart as Record<string, unknown>)?.result
  if (Array.isArray(chartResult) && chartResult.length > 0) {
    const meta = (chartResult[0] as Record<string, unknown>)?.meta as Record<string, unknown>
    const p = meta?.regularMarketPrice
    if (typeof p === 'number' && p > 0) return p
  }
  // Yahoo Finance v7 quote endpoint
  const quoteResult = (d.quoteResponse as Record<string, unknown>)?.result
  if (Array.isArray(quoteResult) && quoteResult.length > 0) {
    const p = (quoteResult[0] as Record<string, unknown>)?.regularMarketPrice
    if (typeof p === 'number' && p > 0) return p
  }
  return null
}

async function fetchViaProxy(targetUrl: string): Promise<number | null> {
  for (const proxyFn of PROXY_FNS) {
    try {
      const res = await axios.get(proxyFn(targetUrl), { timeout: 10000 })
      const raw = res.data
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const price = extractPrice(data)
      if (price != null) return price
    } catch {
      // siguiente proxy
    }
  }
  return null
}

function normalize(ticker: string): string {
  return ticker.toUpperCase().replace(/\.BA$/i, '').trim()
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  const clean = symbol.replace(/\.BA\.BA$/i, '.BA')
  const key = `yahoo_${clean}`
  const hit = cached(key)
  if (hit !== null) return hit

  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${clean}?interval=1d&range=1d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${clean}?interval=1d&range=1d`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${clean}`,
  ]

  for (const url of urls) {
    const price = await fetchViaProxy(url)
    if (price != null) {
      store(key, price)
      return price
    }
  }
  return null
}

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
