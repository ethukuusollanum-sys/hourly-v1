const providers = new Map()
let currentProvider = 'local'

export function registerProvider(name, provider) {
  providers.set(name, provider)
}

export function setProvider(name) {
  if (providers.has(name)) currentProvider = name
}

export function getProvider() {
  return currentProvider
}

export async function generateSummary(params) {
  const provider = providers.get(currentProvider)
  if (!provider) throw new Error(`AI provider "${currentProvider}" not registered`)
  return provider.generate(params)
}
