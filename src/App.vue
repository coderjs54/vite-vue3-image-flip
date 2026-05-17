<script setup lang="ts">
import { useTemplateRef, ref, onUnmounted, computed } from 'vue'
import { getImageData, getFlippedXImageData, getFlippedYImageData, getURLFromImageData } from './utils'

const uploadRef = useTemplateRef('upload')
const imgURL = ref('')
const flippedURL = ref('')
const createdURLs = ref<string[]>([])

const imageData = ref<ImageData | null>(null)

const hasImage = computed(() => !!imageData.value)
const hasFlippedImage = computed(() => flippedURL.value.length > 0)

const handleUpload = () => {
  uploadRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]

  if (!file) return

  cleanupURLs()

  const url = URL.createObjectURL(file)
  createdURLs.value.push(url)
  imgURL.value = url
  flippedURL.value = ''

  const img = new Image()
  img.onload = () => {
    imageData.value = getImageData(img)
  }
  img.onerror = (err) => {
    console.error('图片加载失败:', err)
  }
  img.src = url
}

const flipImage = async (flipFn: typeof getFlippedXImageData) => {
  if (!hasImage.value || !imageData.value) return

  const flippedImageData = flipFn(imageData.value)
  const url = await getURLFromImageData(flippedImageData)
  createdURLs.value.push(url)

  if (flippedURL.value) {
    cleanupSingleURL(flippedURL.value)
  }

  flippedURL.value = url
}

const handleFlipX = () => flipImage(getFlippedXImageData)
const handleFlipY = () => flipImage(getFlippedYImageData)

const handleDownload = () => {
  if (!hasFlippedImage.value) return

  const link = document.createElement('a')
  link.href = flippedURL.value
  link.download = 'flipped-image.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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

onUnmounted(() => {
  cleanupURLs()
})
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <h1>图片翻转工具</h1>
      <p>上传图片后，可沿 X 轴或 Y 轴翻转并下载处理后的图片</p>
    </div>
    <div class="upload-area">
      <input ref="upload" type="file" accept="image/*" @change="handleFileChange" hidden />
      <button type="button" id="upload-btn" @click="handleUpload">上传图片</button>
    </div>

    <div class="picture-area">
      <figure class="origin">
        <div class="title">原图</div>

        <figcaption v-if="imgURL">
          <img :src="imgURL" alt="origin-picture">
        </figcaption>
      </figure>

      <figure>
        <div class="title">翻转后的图片</div>

        <figcaption v-if="flippedURL">
          <img :src="flippedURL" alt="flipped-picture">
        </figcaption>
      </figure>
    </div>

    <div class="btn-box">
      <button type="button" :disabled="!hasFlippedImage" @click="handleDownload">下载翻转图片</button>
      <button type="button" :disabled="!hasImage" @click="handleFlipX">FlipX</button>
      <button type="button" :disabled="!hasImage" @click="handleFlipY">FlipY</button>
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
  padding: 18px 24px;
  max-width: 1000px;
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

    @media screen and (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    figure {
      margin: 0;
      background: white;
      border-radius: 12px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      min-height: 120px;

      .title {
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: 500;
        color: #424242;
      }
    }

    figcaption {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 4/3;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e8e8e8;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .btn-box {
    display: flex;
    flex-wrap: wrap;

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
