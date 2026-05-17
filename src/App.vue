<script setup lang="ts">
import { useTemplateRef, ref, onUnmounted, computed } from 'vue'
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { getImageData, getFlippedXImageData, getFlippedYImageData, getURLFromImageData } from './utils'

interface ProcessedImage {
  id: string
  originalUrl: string
  originalData: ImageData
  flippedUrl?: string
  flippedData?: ImageData
}

const uploadRef = useTemplateRef('upload')
const createdURLs = ref<string[]>([])
const images = ref<ProcessedImage[]>([])

const hasImages = computed(() => images.value.length > 0)
const hasFlippedImages = computed(() => images.value.some(img => img.flippedUrl))

const handleUpload = () => {
  uploadRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  cleanupURLs()
  images.value = []

  Array.from(files).forEach((file, index) => {
    const url = URL.createObjectURL(file)
    createdURLs.value.push(url)
    
    const img = new Image()
    img.onload = () => {
      const imageData = getImageData(img)
      images.value.push({
        id: `img-${Date.now()}-${index}`,
        originalUrl: url,
        originalData: imageData
      })
    }
    img.onerror = (err) => {
      console.error('图片加载失败:', err)
    }
    img.src = url
  })

  // 重置 input，允许重新选择同一个文件
  input.value = ''
}

const flipImages = async (flipFn: typeof getFlippedXImageData) => {
  if (!hasImages.value) return

  // 先清理已有的翻转图片URL
  images.value.forEach(img => {
    if (img.flippedUrl) {
      cleanupSingleURL(img.flippedUrl)
      img.flippedUrl = undefined
      img.flippedData = undefined
    }
  })

  // 批量处理每张图片
  for (const img of images.value) {
    const flippedImageData = flipFn(img.originalData)
    const flippedUrl = await getURLFromImageData(flippedImageData)
    createdURLs.value.push(flippedUrl)
    
    img.flippedData = flippedImageData
    img.flippedUrl = flippedUrl
  }
}

const handleFlipX = () => flipImages(getFlippedXImageData)
const handleFlipY = () => flipImages(getFlippedYImageData)

// 格式化日期为 YYYY-MM-dd
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const handleDownloadAll = async () => {
  const flippedImages = images.value.filter(img => img.flippedUrl)
  if (flippedImages.length === 0) return

  // 创建 ZIP 写入器
  const zipWriter = new ZipWriter(new BlobWriter('application/zip'))
  
  // 把所有翻转后的图片添加到压缩包
  for (let i = 0; i < flippedImages.length; i++) {
    const img = flippedImages[i]
    const response = await fetch(img.flippedUrl!)
    const blob = await response.blob()
    await zipWriter.add(`flipped-image-${i + 1}.png`, new BlobReader(blob))
  }

  // 生成压缩包并下载
  const zipBlob = await zipWriter.close()
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `flipped-images-${formatDate(new Date())}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const cleanupSingleURL = (url: string) => {
  try {
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('清理URL失败:', e)
  }
}

const cleanupURLs = () => {
  createdURLs.value.forEach(cleanupSingleURL)
  createdURLs.value = []
}

onUnmounted(cleanupURLs)
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <h1>图片翻转工具</h1>
      <p>上传单张或多张图片后，可沿 X 轴或 Y 轴批量翻转并下载处理后的图片</p>
    </div>
    <div class="upload-area">
      <input ref="upload" type="file" accept="image/*" multiple @change="handleFileChange" hidden />
      <button type="button" id="upload-btn" @click="handleUpload">上传图片（可多选）</button>
    </div>

    <div class="picture-area">
      <div class="image-section">
        <div class="title">原图</div>
        <div class="image-list" :class="{ 'single-image': images.length === 1, 'multiple-images': images.length > 1 }">
          <figure v-for="(img, index) in images" :key="img.id" class="image-item">
            <figcaption>
              <img :src="img.originalUrl" :alt="`原图${index + 1}`" />
            </figcaption>
          </figure>
          <div v-if="!hasImages" class="placeholder">暂无图片，请先上传</div>
        </div>
      </div>

      <div class="image-section">
        <div class="title">翻转后的图片</div>
        <div class="image-list" :class="{ 'single-image': images.length === 1, 'multiple-images': images.length > 1 }">
          <figure v-for="(img, index) in images" :key="img.id" class="image-item">
            <figcaption v-if="img.flippedUrl">
              <img :src="img.flippedUrl" :alt="`翻转图${index + 1}`" />
            </figcaption>
            <div v-else class="placeholder">等待翻转</div>
          </figure>
          <div v-if="!hasImages" class="placeholder">暂无图片，请先上传</div>
        </div>
      </div>
    </div>

    <div class="btn-box">
      <button type="button" :disabled="!hasFlippedImages" @click="handleDownloadAll">批量下载翻转图片</button>
      <button type="button" :disabled="!hasImages" @click="handleFlipX">批量 FlipX</button>
      <button type="button" :disabled="!hasImages" @click="handleFlipY">批量 FlipY</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
button {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

button + button {
  margin-left: 16px;
}

.wrapper {
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f5f5f5;

  .header {
    text-align: center;
    margin-bottom: 32px;

    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #212121;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #757575;
    }
  }

  .upload-area {
    margin-bottom: 20px;

    button {
      background: #5c6bc0;
      color: white;
      font-size: 14px;
      padding: 12px 32px;

      &:hover:not(:disabled) {
        background: #3f51b5;
      }
    }
  }

  .picture-area {
    width: 100%;
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
    margin-bottom: 40px;

    .image-section {
      border: 1px dashed #8c8888;
      padding: 10px;
      border-radius: 10px;

      .title {
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: 600;
        color: #424242;
      }

      .image-list {
        display: grid;
        gap: 16px;

        &.single-image {
          grid-template-columns: 1fr;
        }

        &.multiple-images {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    }

    figure {
      margin: 0;
      background: white;
      border-radius: 12px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
    }

    figcaption {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 4/3;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid #e8e8e8;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        flex: 1;
      }
    }

    .placeholder {
      padding: 40px 20px;
      text-align: center;
      color: #9e9e9e;
      font-size: 14px;
    }
  }

  .btn-box {
    display: flex;
    font-size: 16px;

    button {
      &:nth-child(1) {
        background: #78909c;
        color: white;

        &:hover:not(:disabled) {
          background: #546e7a;
        }
      }

      &:nth-child(2), &:nth-child(3) {
        background: #7986cb;
        color: white;

        &:hover:not(:disabled) {
          background: #5c6bc0;
        }
      }
    }
  }
}
</style>
