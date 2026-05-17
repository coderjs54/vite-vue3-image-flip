/** 根据image对象得到canvas中的ImageData对象 */
export function getImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('无法创建canvas上下文对象')

  const width = image.naturalWidth
  const height = image.naturalHeight

  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0)

  return ctx.getImageData(0, 0, width, height)
}

/** 使用 canvas 变换进行 X 轴翻转（更高效） */
export function getFlippedXImageData(imageData: ImageData): ImageData {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('无法创建canvas上下文对象')

  const { width, height } = imageData

  canvas.width = width
  canvas.height = height

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('无法创建临时canvas上下文对象')
  tempCtx.putImageData(imageData, 0, 0)

  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(tempCanvas, -width, 0)
  ctx.restore()

  return ctx.getImageData(0, 0, width, height)
}

/** 使用 canvas 变换进行 Y 轴翻转（更高效） */
export function getFlippedYImageData(imageData: ImageData): ImageData {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('无法创建canvas上下文对象')

  const { width, height } = imageData

  canvas.width = width
  canvas.height = height

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('无法创建临时canvas上下文对象')
  tempCtx.putImageData(imageData, 0, 0)

  ctx.save()
  ctx.scale(1, -1)
  ctx.drawImage(tempCanvas, 0, -height)
  ctx.restore()

  return ctx.getImageData(0, 0, width, height)
}

/** 根据imageData对象得到图片的URL地址 */
export function getURLFromImageData(imageData: ImageData): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('无法创建canvas上下文对象')

    const { width, height } = imageData
    canvas.width = width
    canvas.height = height
    ctx.putImageData(imageData, 0, 0)

    canvas.toBlob(blob => {
      if (!blob) {
        return reject(new Error('无法生成图片blob'))
      }
      const url = URL.createObjectURL(blob)
      resolve(url)
    }, 'image/png')
  })
}
