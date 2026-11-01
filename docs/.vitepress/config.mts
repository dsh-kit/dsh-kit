import { defineConfig } from 'vitepress'

const repository = 'https://github.com/dsh-kit/dsh-kit'
const editPattern = 'https://github.com/dsh-kit/dsh-kit/edit/main/docs/:path'

export default defineConfig({
  title: 'dsh-kit',
  description: 'A maintainable baseline for DeepSeek Harness plugins',
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'dsh-kit — a maintainable baseline for DeepSeek Harness plugins' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Scaffold a DeepSeek Harness plugin with TypeScript, tests, build, CI and agent-ready docs.'
      }
    ],
    ['meta', { name: 'theme-color', content: '#ffffff' }]
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        editLink: { pattern: editPattern, text: '在 GitHub 上编辑此页' },
        lastUpdatedText: '最后更新',
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '本页目录' },
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        footer: {
          message: 'MIT 许可 · 使用 VitePress 构建',
          copyright: 'Copyright © 2026 dsh-kit'
        },
        nav: [
          { text: '指南', link: '/zh/guide/quick-start' },
          { text: 'Agent', link: '/zh/guide/agents' },
          { text: '为什么', link: '/zh/guide/why' },
          { text: '插件', link: '/zh/plugins/' },
          { text: '博客', link: '/zh/blog/' }
        ],
        sidebar: {
          '/zh/blog/': [
            { text: '博客', items: [
              { text: 'Agent 规模下的验证架构', link: '/zh/blog/verification-at-agent-scale' },
              { text: '插件生命周期的失败模式', link: '/zh/blog/plugin-lifecycle-failure-modes' },
              { text: '桌面 Agent 不是 Web 套壳', link: '/zh/blog/desktop-agents-not-web-apps' }
            ] }
          ],
          '/zh/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/zh/guide/quick-start' },
                { text: '面向 Agent', link: '/zh/guide/agents' },
                { text: '教程', link: '/zh/guide/tutorial' },
                { text: '为什么选 dsh-kit', link: '/zh/guide/why' },
                { text: '工具链', link: '/zh/guide/toolchain' }
              ]
            },
            {
              text: '社区',
              items: [
                { text: '参与贡献', link: '/zh/guide/contributing' },
                { text: '路线图', link: '/zh/guide/roadmap' }
              ]
            }
          ]
        }
      }
    }
  },
  themeConfig: {
    logo: { light: '/logo.svg', dark: '/logo-dark.svg', alt: 'dsh-kit' },
    socialLinks: [
      { icon: 'github', link: repository },
      { icon: 'npm', link: 'https://www.npmjs.com/package/create-dsh-kit' }
    ],
    search: { provider: 'local' },
    editLink: { pattern: editPattern, text: 'Edit this page on GitHub' },
    footer: {
      message: 'MIT licensed · built with VitePress',
      copyright: 'Copyright © 2026 dsh-kit'
    },
    outline: { level: [2, 3] },
    nav: [
      { text: 'Guide', link: '/guide/quick-start' },
      { text: 'Agents', link: '/guide/agents' },
      { text: 'Why', link: '/guide/why' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'Blog', link: '/blog/' }
    ],
    sidebar: {
      '/blog/': [
        { text: 'Blog', items: [
          { text: 'Verification at agent scale', link: '/blog/verification-at-agent-scale' },
          { text: 'Plugin lifecycle failure modes', link: '/blog/plugin-lifecycle-failure-modes' },
          { text: 'Desktop agents are not web apps in a window', link: '/blog/desktop-agents-not-web-apps' }
        ] }
      ],
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Quick start', link: '/guide/quick-start' },
            { text: 'For agents', link: '/guide/agents' },
            { text: 'Tutorial', link: '/guide/tutorial' },
            { text: 'Why dsh-kit', link: '/guide/why' },
            { text: 'Toolchain', link: '/guide/toolchain' }
          ]
        },
        {
          text: 'Community',
          items: [
            { text: 'Contributing', link: '/guide/contributing' },
            { text: 'Roadmap', link: '/guide/roadmap' }
          ]
        }
      ]
    }
  }
})
