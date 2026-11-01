<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { ref } from 'vue'

const { Layout } = DefaultTheme
const command = 'pnpm create dsh-kit my-plugin'
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(command)
  } catch {
    const field = document.createElement('textarea')
    field.value = command
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    try {
      field.select()
      document.execCommand('copy')
    } finally {
      field.remove()
    }
  }
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1600)
}
</script>

<template>
  <Layout>
    <template #home-hero-image>
      <div class="hero-mark-wrap">
        <img class="hero-logo hero-logo-light" src="/logo.svg" alt="" width="512" height="512" />
        <img class="hero-logo hero-logo-dark" src="/logo-dark.svg" alt="dsh-kit" width="512" height="512" />
      </div>
    </template>
    <template #home-hero-info-after>
      <div class="hero-install">
        <span class="prompt" aria-hidden="true">$</span>
        <code>{{ command }}</code>
        <button type="button" :aria-label="copied ? 'Copied' : 'Copy install command'" @click="copy">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>
    </template>
  </Layout>
</template>
