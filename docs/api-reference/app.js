(() => {
  'use strict'

  const docs = window.NEW_API_DOCS
  const pageEntries = Object.entries(docs.pages)
  const state = {
    activePageId: 'openai-chat',
    searchResults: [],
    searchIndex: 0,
  }

  const elements = {
    content: document.querySelector('#content'),
    docsNav: document.querySelector('#docsNav'),
    toc: document.querySelector('#toc'),
    searchDialog: document.querySelector('#searchDialog'),
    searchInput: document.querySelector('#searchInput'),
    searchResults: document.querySelector('#searchResults'),
    searchCount: document.querySelector('#searchCount'),
    toast: document.querySelector('#toast'),
    themeButton: document.querySelector('#themeButton'),
    themeIcon: document.querySelector('#themeIcon'),
    sidebar: document.querySelector('#sidebar'),
    menuButton: document.querySelector('#menuButton'),
    sidebarBackdrop: document.querySelector('#sidebarBackdrop'),
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function renderNavigation() {
    elements.docsNav.innerHTML = docs.navigation
      .map((group) => `
        <section class="docs-nav-group">
          <div class="docs-nav-heading">
            <span>${escapeHtml(group.title)}</span>
            ${group.subtitle ? `<small>${escapeHtml(group.subtitle)}</small>` : ''}
          </div>
          <div class="docs-nav-items">
            ${group.items.map((item) => `
              <a
                class="docs-nav-link ${state.activePageId === item.id ? 'is-active' : ''}"
                href="#page/${escapeHtml(item.id)}"
                data-page-id="${escapeHtml(item.id)}"
              >
                <span class="nav-label">${escapeHtml(item.label)}</span>
                ${item.method ? `<span class="nav-method method-${item.method.toLowerCase()}">${escapeHtml(item.method)}</span>` : ''}
              </a>
            `).join('')}
          </div>
        </section>
      `)
      .join('')
  }

  function renderOverview(page) {
    const endpoints = pageEntries.filter(([, item]) => item.kind === 'endpoint')
    elements.content.innerHTML = `
      <article class="doc-page overview-page">
        <div class="breadcrumb">DEVELOPERS / <span>API REFERENCE</span></div>
        <header class="page-intro">
          <div class="section-eyebrow">${escapeHtml(page.eyebrow)}</div>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.description)}</p>
        </header>

        <section class="doc-section" id="base-url">
          <div class="section-heading">
            <span class="section-index">01</span>
            <div><div class="section-eyebrow">Base URL</div><h2>请求地址</h2></div>
          </div>
          <div class="endpoint-strip">
            <code>${escapeHtml(docs.baseUrl)}</code>
            <button class="text-button" type="button" data-copy-value="${escapeHtml(docs.baseUrl)}">复制</button>
          </div>
          <p class="section-description">所有示例均使用此域名。部署到其他网关时，只需替换域名部分，接口路径保持不变。</p>
        </section>

        <section class="doc-section" id="protocols">
          <div class="section-heading">
            <span class="section-index">02</span>
            <div><div class="section-eyebrow">Protocols</div><h2>选择调用协议</h2></div>
          </div>
          <div class="protocol-list">
            ${endpoints.map(([id, endpoint], index) => `
              <a class="protocol-row" href="#page/${escapeHtml(id)}">
                <span class="protocol-number">0${index + 1}</span>
                <span class="protocol-body">
                  <strong>${escapeHtml(endpoint.title)}</strong>
                  <small>${escapeHtml(endpoint.provider)}</small>
                </span>
                <span class="protocol-path"><b>${escapeHtml(endpoint.method)}</b>${escapeHtml(endpoint.path)}</span>
                <span class="protocol-arrow" aria-hidden="true">→</span>
              </a>
            `).join('')}
          </div>
        </section>

        <section class="doc-section" id="first-request">
          <div class="section-heading">
            <span class="section-index">03</span>
            <div><div class="section-eyebrow">First request</div><h2>开始调用</h2></div>
          </div>
          <ol class="instruction-list">
            <li><span>1</span><div><strong>在「令牌」页面生成 API Key</strong><p>可按模型、分组、IP 与速率等维度配置权限。</p></div></li>
            <li><span>2</span><div><strong>选择兼容协议</strong><p>已有 OpenAI 或 Anthropic SDK 时，直接选择对应格式。</p></div></li>
            <li><span>3</span><div><strong>复制示例并替换令牌</strong><p>不要在浏览器端或公开仓库中暴露长期有效的 API Key。</p></div></li>
          </ol>
        </section>
      </article>
    `
    bindCopyActions()
    renderToc([
      ['base-url', '请求地址'],
      ['protocols', '调用协议'],
      ['first-request', '开始调用'],
    ])
  }

  function renderAuthentication(page) {
    elements.content.innerHTML = `
      <article class="doc-page">
        <div class="breadcrumb">START HERE / <span>AUTHENTICATION</span></div>
        <header class="page-intro compact-intro">
          <div class="section-eyebrow">${escapeHtml(page.eyebrow)}</div>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.description)}</p>
        </header>

        <section class="doc-section" id="bearer-token">
          <div class="section-eyebrow">Bearer token</div>
          <h2>通用认证方式</h2>
          <p class="section-description">在每个请求中添加 <code>Authorization</code> 请求头，其值由 <code>Bearer</code>、一个空格和 API Key 组成。</p>
          ${renderCodePanel({ Header: 'Authorization: Bearer <YOUR_API_KEY>' }, 'auth-header')}
        </section>

        <section class="doc-section" id="anthropic-auth">
          <div class="section-eyebrow">Anthropic compatibility</div>
          <h2>Claude 兼容认证</h2>
          <p class="section-description">Claude Messages 端点也接受 <code>x-api-key</code>。使用该方式时仍需携带 <code>anthropic-version: 2023-06-01</code>。</p>
          ${renderCodePanel({ Header: 'x-api-key: <YOUR_API_KEY>\nanthropic-version: 2023-06-01' }, 'anthropic-header')}
        </section>

        <section class="doc-section" id="token-scope">
          <div class="section-eyebrow">Token scope</div>
          <h2>令牌权限</h2>
          <div class="policy-grid">
            <div><strong>模型</strong><span>限制令牌可调用的模型集合</span></div>
            <div><strong>分组</strong><span>匹配不同渠道与计费策略</span></div>
            <div><strong>IP</strong><span>限制允许访问的来源地址</span></div>
            <div><strong>速率</strong><span>控制请求频率和并发能力</span></div>
          </div>
          <div class="notice danger-notice"><strong>安全提示</strong><p>API Key 等同于密码。请使用服务端环境变量保存，不要写入前端代码、公开仓库或聊天记录。</p></div>
        </section>
      </article>
    `
    bindCodeTabs()
    bindCopyActions()
    renderToc([
      ['bearer-token', 'Bearer Token'],
      ['anthropic-auth', 'Claude 兼容认证'],
      ['token-scope', '令牌权限'],
    ])
  }

  function renderEndpoint(page) {
    const tocItems = [
      ['examples', '调用示例'],
      ['authentication', '身份验证'],
      ['parameters', '支持的参数'],
    ]
    if (page.requestExample) tocItems.push(['request-body', '请求体示例'])
    tocItems.push(['response', '返回响应'])

    elements.content.innerHTML = `
      <article class="doc-page endpoint-doc">
        <div class="breadcrumb">${escapeHtml(page.group)} / <span>${escapeHtml(page.provider)}</span></div>
        <header class="endpoint-hero">
          <div class="endpoint-title-row">
            <div>
              <div class="section-eyebrow">${escapeHtml(page.provider)}</div>
              <h1>${escapeHtml(page.title)}</h1>
            </div>
            <span class="api-version">API v1</span>
          </div>
          <p>${escapeHtml(page.summary)}</p>
          ${page.workflow ? `
            <div class="endpoint-workflow" aria-label="异步调用流程">
              ${page.workflow.map((endpoint) => `
                <div class="workflow-endpoint">
                  <span class="workflow-step">${escapeHtml(endpoint.step)}</span>
                  <span class="method-badge method-${endpoint.method.toLowerCase()}">${escapeHtml(endpoint.method)}</span>
                  <code>${escapeHtml(endpoint.path)}</code>
                  <span class="workflow-label">${escapeHtml(endpoint.label)}</span>
                  <button class="text-button" type="button" data-copy-value="${escapeHtml(endpoint.path)}">复制</button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="endpoint-strip primary-endpoint">
              <span class="method-badge method-${page.method.toLowerCase()}">${escapeHtml(page.method)}</span>
              <code>${escapeHtml(page.path)}</code>
              <button class="text-button" type="button" data-copy-value="${escapeHtml(page.path)}">复制路径</button>
            </div>
          `}
          <div class="endpoint-meta">
            <span><b>BASE URL</b>${escapeHtml(docs.baseUrl)}</span>
            <span><b>AUTH</b>${escapeHtml(page.authMode)}</span>
          </div>
        </header>

        <section class="doc-section" id="examples">
          <div class="section-heading">
            <span class="section-index">01</span>
            <div><div class="section-eyebrow">Examples</div><h2>调用示例</h2></div>
          </div>
          ${renderCodePanel(page.codeSamples, `${state.activePageId}-example`)}
          <div class="notice key-notice"><strong>替换 API Key</strong><p>将 <code>$NEW_API_KEY</code> 或 <code>&lt;YOUR_API_KEY&gt;</code> 替换为「令牌」页面生成的 API Key。</p></div>
        </section>

        <section class="doc-section" id="authentication">
          <div class="section-heading">
            <span class="section-index">02</span>
            <div><div class="section-eyebrow">Headers</div><h2>身份验证</h2></div>
          </div>
          <p class="section-description">所有请求必须提供有效令牌。Claude 格式可以使用 <code>Authorization</code> 或 <code>x-api-key</code>，二者无需同时发送。</p>
          ${renderHeaderTable(page.headers)}
        </section>

        <section class="doc-section" id="parameters">
          <div class="section-heading">
            <span class="section-index">03</span>
            <div><div class="section-eyebrow">Request body</div><h2>支持的参数</h2></div>
          </div>
          ${renderParameterTable(page.parameters)}
        </section>

        ${page.requestExample ? `
          <section class="doc-section" id="request-body">
            <div class="section-heading">
              <span class="section-index">04</span>
              <div><div class="section-eyebrow">JSON</div><h2>请求体示例</h2></div>
            </div>
            ${renderCodePanel({ JSON: page.requestExample }, `${state.activePageId}-request`)}
          </section>
        ` : ''}

        <section class="doc-section" id="response">
          <div class="section-heading">
            <span class="section-index">${page.requestExample ? '05' : '04'}</span>
            <div><div class="section-eyebrow">Response</div><h2>返回响应</h2></div>
          </div>
          <div class="response-status"><span class="status-code">200</span><strong>OK</strong><small>application/json</small></div>
          ${page.stateLegend ? `
            <div class="state-legend" aria-label="任务状态">
              ${page.stateLegend.map((state) => `
                <div class="state-item state-${escapeHtml(state.value)}">
                  <code>${escapeHtml(state.value)}</code>
                  <strong>${escapeHtml(state.label)}</strong>
                  <p>${escapeHtml(state.detail)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${renderFieldTable(page.responseFields)}
          <h3 class="example-title">响应示例</h3>
          ${renderCodePanel(page.responseExamples || { JSON: page.responseExample }, `${state.activePageId}-response`)}
        </section>
      </article>
    `

    bindCodeTabs()
    bindCopyActions()
    renderToc(tocItems)
  }

  function renderCodePanel(samples, id) {
    const entries = Object.entries(samples)
    const first = entries[0]
    return `
      <div class="code-panel" data-code-panel="${escapeHtml(id)}" data-samples="${escapeHtml(JSON.stringify(samples))}">
        <div class="code-toolbar">
          <div class="code-tabs" role="tablist" aria-label="代码语言">
            ${entries.map(([language], index) => `
              <button class="code-tab" type="button" role="tab" aria-selected="${index === 0}" data-language="${escapeHtml(language)}">${escapeHtml(language)}</button>
            `).join('')}
          </div>
          <button class="code-copy" type="button">复制</button>
        </div>
        <pre><code>${escapeHtml(first[1])}</code></pre>
      </div>
    `
  }

  function renderHeaderTable(headers) {
    return `
      <div class="header-list">
        ${headers.map((header) => `
          <div class="header-row">
            <div class="field-name"><code>${escapeHtml(header.name)}</code>${header.required ? '<span class="required-badge">必需</span>' : '<span class="optional-badge">可选</span>'}</div>
            <div class="field-type">${escapeHtml(header.type)}</div>
            <div class="field-detail"><p>${escapeHtml(header.description)}</p><code>${escapeHtml(header.example)}</code></div>
          </div>
        `).join('')}
      </div>
    `
  }

  function renderParameterTable(parameters) {
    return `
      <div class="parameter-table-wrap">
        <table class="parameter-table">
          <thead><tr><th>参数</th><th>类型</th><th>默认值 / 范围</th><th>说明信息</th></tr></thead>
          <tbody>
            ${parameters.map((parameter) => `
              <tr>
                <td><code>${escapeHtml(parameter.name)}</code>${parameter.required ? '<span class="required-badge">必需</span>' : ''}</td>
                <td><span class="type-label">${escapeHtml(parameter.type)}</span></td>
                <td>${parameter.default ? `<span class="default-value"><i>=</i>${escapeHtml(parameter.default)}</span>` : ''}<span class="range-value">${escapeHtml(parameter.range || '—')}</span></td>
                <td>${escapeHtml(parameter.description)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  function renderFieldTable(fields) {
    return `
      <div class="response-fields">
        ${fields.map((field) => `
          <div class="response-field">
            <div><code>${escapeHtml(field.name)}</code>${field.required ? '<span class="required-badge">必需</span>' : '<span class="optional-badge">可选</span>'}</div>
            <span class="type-label">${escapeHtml(field.type)}</span>
            <p>${escapeHtml(field.description)}</p>
          </div>
        `).join('')}
      </div>
    `
  }

  function renderToc(items) {
    elements.toc.innerHTML = `
      <div class="toc-title">本页目录</div>
      ${items.map(([id, label]) => `<a href="#${escapeHtml(id)}">${escapeHtml(label)}</a>`).join('')}
      <div class="toc-help"><span>发现问题？</span><a href="https://github.com/QuantumNous/new-api/issues" target="_blank" rel="noreferrer">提交 Issue →</a></div>
    `
  }

  function bindCodeTabs() {
    document.querySelectorAll('.code-panel').forEach((panel) => {
      const samples = JSON.parse(panel.dataset.samples)
      const code = panel.querySelector('pre code')
      panel.querySelectorAll('.code-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          panel.querySelectorAll('.code-tab').forEach((item) => item.setAttribute('aria-selected', String(item === tab)))
          code.textContent = samples[tab.dataset.language]
        })
      })
      panel.querySelector('.code-copy').addEventListener('click', () => copyText(code.textContent))
    })
  }

  function bindCopyActions() {
    document.querySelectorAll('[data-copy-value]').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.copyValue))
    })
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动选择文本')
    }
  }

  let toastTimer
  function showToast(message) {
    clearTimeout(toastTimer)
    elements.toast.textContent = message
    elements.toast.classList.add('is-visible')
    toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 1800)
  }

  function closeSidebar() {
    elements.sidebar.classList.remove('is-open')
    elements.sidebarBackdrop.hidden = true
    elements.menuButton.setAttribute('aria-expanded', 'false')
  }

  function resolvePageId() {
    const hash = window.location.hash.slice(1)
    if (hash === 'overview') return 'overview'
    if (hash.startsWith('page/')) return hash.slice('page/'.length)
    return 'openai-chat'
  }

  function renderRoute() {
    closeSidebar()
    const requestedPageId = resolvePageId()
    state.activePageId = docs.pages[requestedPageId] ? requestedPageId : 'openai-chat'
    const page = docs.pages[state.activePageId]
    renderNavigation()
    if (page.kind === 'overview') renderOverview(page)
    if (page.kind === 'authentication') renderAuthentication(page)
    if (page.kind === 'endpoint') renderEndpoint(page)
    document.title = `${page.title} · New API`
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }

  function createSearchRecords() {
    const records = []
    pageEntries.forEach(([pageId, page]) => {
      records.push({ pageId, title: page.title, meta: page.group || page.eyebrow, detail: page.path || page.description })
      ;(page.parameters || []).forEach((parameter) => {
        records.push({
          pageId,
          title: parameter.name,
          meta: `${page.title} · 参数`,
          detail: parameter.description,
        })
      })
    })
    return records
  }

  const searchRecords = createSearchRecords()
  function search(query) {
    const normalized = query.trim().toLocaleLowerCase('zh-CN')
    if (!normalized) return searchRecords.filter((record) => docs.pages[record.pageId].kind === 'endpoint').slice(0, 8)
    return searchRecords
      .map((record) => {
        const title = record.title.toLocaleLowerCase('zh-CN')
        const meta = String(record.meta || '').toLocaleLowerCase('zh-CN')
        const detail = String(record.detail || '').toLocaleLowerCase('zh-CN')
        let score = 0
        if (title === normalized) score += 100
        if (title.startsWith(normalized)) score += 45
        if (title.includes(normalized)) score += 30
        if (meta.includes(normalized)) score += 18
        if (detail.includes(normalized)) score += 10
        return { record, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((item) => item.record)
  }

  function renderSearchResults() {
    elements.searchCount.textContent = String(state.searchResults.length)
    if (!state.searchResults.length) {
      elements.searchResults.innerHTML = '<div class="command-empty">没有匹配结果，试试参数名、协议或接口路径。</div>'
      return
    }
    elements.searchResults.innerHTML = state.searchResults.map((record, index) => `
      <button class="search-result ${index === state.searchIndex ? 'is-selected' : ''}" type="button" role="option" aria-selected="${index === state.searchIndex}" data-index="${index}">
        <span class="result-topline"><strong>${escapeHtml(record.title)}</strong><span>${escapeHtml(record.meta)}</span></span>
        <span class="result-path">${escapeHtml(record.detail)}</span>
      </button>
    `).join('')
    elements.searchResults.querySelectorAll('.search-result').forEach((result) => {
      result.addEventListener('click', () => openSearchResult(Number(result.dataset.index)))
    })
  }

  function openSearch() {
    state.searchResults = search('')
    state.searchIndex = 0
    elements.searchInput.value = ''
    renderSearchResults()
    elements.searchDialog.showModal()
    requestAnimationFrame(() => elements.searchInput.focus())
  }

  function openSearchResult(index) {
    const record = state.searchResults[index]
    if (!record) return
    elements.searchDialog.close()
    window.location.hash = `page/${record.pageId}`
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme
    elements.themeIcon.textContent = theme === 'dark' ? '☼' : '◐'
    localStorage.setItem('new-api-docs-theme', theme)
  }

  function bindGlobalEvents() {
    document.querySelector('#searchButton').addEventListener('click', openSearch)
    elements.searchDialog.addEventListener('click', (event) => {
      if (event.target === elements.searchDialog) elements.searchDialog.close()
    })
    elements.searchInput.addEventListener('input', () => {
      state.searchResults = search(elements.searchInput.value)
      state.searchIndex = 0
      renderSearchResults()
    })
    elements.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        state.searchIndex = Math.min(state.searchIndex + 1, state.searchResults.length - 1)
        renderSearchResults()
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        state.searchIndex = Math.max(state.searchIndex - 1, 0)
        renderSearchResults()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        openSearchResult(state.searchIndex)
      }
    })
    document.addEventListener('keydown', (event) => {
      const isTyping = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      if (event.key === '/' && !isTyping && !elements.searchDialog.open) {
        event.preventDefault()
        openSearch()
      }
    })
    elements.themeButton.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
    })
    elements.menuButton.addEventListener('click', () => {
      const open = !elements.sidebar.classList.contains('is-open')
      elements.sidebar.classList.toggle('is-open', open)
      elements.sidebarBackdrop.hidden = !open
      elements.menuButton.setAttribute('aria-expanded', String(open))
    })
    elements.sidebarBackdrop.addEventListener('click', closeSidebar)
    window.addEventListener('hashchange', renderRoute)
  }

  function init() {
    const savedTheme = localStorage.getItem('new-api-docs-theme')
    const preferredTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    applyTheme(savedTheme || preferredTheme)
    bindGlobalEvents()
    renderRoute()
  }

  init()
})()
