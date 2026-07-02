export const CLIENT_CONFIG_STORAGE_KEY = "pikall-client-config-v1"
export const CLIENT_CONFIG_VERSION = 1
export const APP_VERSION = "0.1.0"

export type ClientConfig = {
  id: string
  excelClientName: string
  aliases: string[]
  displayName: string
  sender: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  isActive: boolean
}

export type ClientConfigStore = {
  version: number
  updatedAt: string
  clients: ClientConfig[]
}

export type ClientConfigExport = ClientConfigStore & {
  exportedAt: string
  applicationVersion: string
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function normalizeClientName(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
}

export function normalizeEmailList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function createEmptyStore(): ClientConfigStore {
  return {
    version: CLIENT_CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
    clients: [],
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function isClientConfig(value: unknown): value is ClientConfig {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  const aliases = candidate.aliases ?? []
  return (
    typeof candidate.id === "string" &&
    typeof candidate.excelClientName === "string" &&
    isStringArray(aliases) &&
    typeof candidate.displayName === "string" &&
    typeof candidate.sender === "string" &&
    isStringArray(candidate.to) &&
    isStringArray(candidate.cc) &&
    typeof candidate.subject === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.isActive === "boolean"
  )
}

export function isClientConfigStore(value: unknown): value is ClientConfigStore {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === "number" &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.clients) &&
    candidate.clients.every(isClientConfig)
  )
}

export function normalizeStore(store: ClientConfigStore): ClientConfigStore {
  return {
    version: CLIENT_CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
    clients: store.clients.map((client) => ({
      ...client,
      aliases: Array.from(new Set((client.aliases ?? []).map((alias) => alias.trim()).filter(Boolean))),
      to: [...client.to],
      cc: [...client.cc],
    })),
  }
}

export function migrateClientStore(value: unknown): ClientConfigStore {
  if (!value || typeof value !== "object") return createEmptyStore()
  const candidate = value as Record<string, unknown>

  if (isClientConfigStore(candidate)) {
    return normalizeStore(candidate)
  }

  if (Array.isArray(candidate.clients)) {
    const migratedClients = candidate.clients.filter(isClientConfig).map((client) => ({
      ...client,
      aliases: Array.from(new Set((client.aliases ?? []).map((alias) => alias.trim()).filter(Boolean))),
    }))
    return {
      version: CLIENT_CONFIG_VERSION,
      updatedAt: new Date().toISOString(),
      clients: migratedClients,
    }
  }

  return createEmptyStore()
}

export function loadClientStore(): ClientConfigStore {
  if (typeof window === "undefined") return createEmptyStore()
  const raw = window.localStorage.getItem(CLIENT_CONFIG_STORAGE_KEY)
  if (!raw) return createEmptyStore()
  return migrateClientStore(JSON.parse(raw))
}

export function saveClientStore(store: ClientConfigStore) {
  if (typeof window === "undefined") return
  const normalized = normalizeStore(store)
  window.localStorage.setItem(CLIENT_CONFIG_STORAGE_KEY, JSON.stringify(normalized))
}

export function exportClientStore(store: ClientConfigStore): ClientConfigExport {
  const normalized = normalizeStore(store)
  return {
    ...normalized,
    exportedAt: new Date().toISOString(),
    applicationVersion: APP_VERSION,
  }
}

export function createClientConfig(input?: Partial<ClientConfig>): ClientConfig {
  const excelClientName = input?.excelClientName?.trim() || ""
  const aliases = input?.aliases?.length
    ? input.aliases
    : excelClientName
      ? [excelClientName]
      : []

  return {
    id: input?.id || makeId(),
    excelClientName,
    aliases: Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean))),
    displayName: input?.displayName?.trim() || excelClientName,
    sender: input?.sender?.trim() || "",
    to: input?.to ? [...input.to] : [],
    cc: input?.cc ? [...input.cc] : [],
    subject: input?.subject || "",
    body: input?.body || "",
    isActive: input?.isActive ?? true,
  }
}

export function matchClientConfig(
  clientName: string,
  clients: ClientConfig[],
): ClientConfig | undefined {
  const target = normalizeClientName(clientName)
  return clients.find((client) => {
    if (!client.isActive) return false
    const candidates = [client.excelClientName, ...client.aliases]
    return candidates.some((candidate) => normalizeClientName(candidate) === target)
  })
}
