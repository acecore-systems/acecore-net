import registration from './cast-scenes.json'

export function castSceneAsset(stem: string) {
  const id = `${registration.site}--${stem}`
  const asset = registration.assets.find((item) => item.id === id)
  if (!asset) throw new Error(`Unregistered cast scene: ${id}`)
  return asset
}

export function castScene(stem: string): string {
  return castSceneAsset(stem).localPath
}
