window.NEW_API_DOCS = {
  baseUrl: 'https://new.oryndar.com',
  navigation: [
    {
      title: '开始使用',
      items: [
        { id: 'overview', label: '概览', eyebrow: 'Start here' },
        { id: 'authentication', label: '身份验证', eyebrow: 'Authentication' },
      ],
    },
    {
      title: '聊天（Chat）',
      subtitle: 'Chat Completions',
      items: [
        { id: 'openai-chat', label: 'OpenAI', method: 'POST', path: '/v1/chat/completions' },
        { id: 'claude-messages', label: 'Claude', method: 'POST', path: '/v1/messages' },
      ],
    },
    {
      title: '聊天（Responses API）',
      subtitle: 'OpenAI Responses',
      items: [
        { id: 'responses-api', label: 'Responses', method: 'POST', path: '/v1/responses' },
      ],
    },
    {
      title: '图像生成（Images）',
      subtitle: 'Sync & async',
      items: [
        { id: 'image-sync', label: '同步生成', method: 'POST', path: '/v1/images/generations' },
        { id: 'image-async', label: '异步生成', method: 'POST', path: '/api/v1/jobs/createTask' },
      ],
    },
  ],
  pages: {
    overview: {
      kind: 'overview',
      title: '文本生成接口',
      eyebrow: 'API Reference',
      description: '使用统一域名调用 OpenAI Chat Completions、Anthropic Claude Messages、OpenAI Responses API，以及同步或异步图像生成接口。选择与你现有 SDK 或任务架构最接近的协议即可开始。',
    },
    authentication: {
      kind: 'authentication',
      title: '身份验证',
      eyebrow: 'Authentication',
      description: '所有 API 请求都必须携带有效令牌。令牌用于识别调用方、匹配模型权限并执行额度与速率限制。',
    },
    'openai-chat': {
      kind: 'endpoint',
      group: '聊天（Chat）',
      provider: 'OpenAI 兼容格式',
      title: 'OpenAI Chat Completions',
      summary: '根据一组对话消息生成模型回复，支持流式输出、工具调用、JSON 输出与采样控制。',
      method: 'POST',
      path: '/v1/chat/completions',
      authMode: 'Bearer Token',
      codeSamples: {
        cURL: `curl https://new.oryndar.com/v1/chat/completions \\
  -H "Authorization: Bearer $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
       "model": "gpt-5.5",
       "messages": [
         {
           "role": "user",
           "content": "Explain quantum entanglement in one paragraph."
         }
       ],
       "temperature": 0.7
     }'`,
        Python: `import os
import requests

response = requests.post(
    "https://new.oryndar.com/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {os.environ['NEW_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-5.5",
        "messages": [
            {
                "role": "user",
                "content": "Explain quantum entanglement in one paragraph.",
            }
        ],
        "temperature": 0.7,
    },
)

print(response.json())`,
        TypeScript: `type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const messages: ChatMessage[] = [
  {
    role: 'user',
    content: 'Explain quantum entanglement in one paragraph.',
  },
]

const response = await fetch(
  'https://new.oryndar.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.5',
      messages,
      temperature: 0.7,
    }),
  },
)

const data = await response.json()`,
        JavaScript: `const response = await fetch(
  'https://new.oryndar.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.5',
      messages: [
        {
          role: 'user',
          content: 'Explain quantum entanglement in one paragraph.',
        },
      ],
      temperature: 0.7,
    }),
  },
)

const data = await response.json()`,
      },
      headers: [
        { name: 'Authorization', type: 'string', required: true, example: 'Bearer <YOUR_API_KEY>', description: '在 Bearer 之后拼接令牌页面生成的 API Key。' },
        { name: 'Content-Type', type: 'string', required: true, example: 'application/json', description: '请求体使用 JSON 编码。' },
        { name: 'Accept', type: 'string', required: false, example: 'application/json', description: '建议显式声明期望 JSON 响应。' },
      ],
      parameters: [
        { name: 'model', type: 'string', required: true, range: '—', description: '要调用的模型 ID，例如 gpt-5.5。可用模型以控制台和 /v1/models 返回为准。' },
        { name: 'messages', type: 'array<object>', required: true, range: '—', description: '按时间顺序排列的对话消息；每项通常包含 role 与 content。' },
        { name: 'temperature', type: 'number', default: '1', range: '0 ~ 2', description: '采样温度；越低越稳定，越高越发散。' },
        { name: 'top_p', type: 'number', default: '1', range: '0 ~ 1', description: '核采样累计概率；通常只调整 temperature 或 top_p 其中一个。' },
        { name: 'max_tokens', type: 'integer', range: '≥ 1', description: '响应中最大 token 数。部分模型建议使用 max_completion_tokens。' },
        { name: 'max_completion_tokens', type: 'integer', range: '≥ 1', description: '最大补全 token 数，包含模型可见输出及支持时的推理 token。' },
        { name: 'frequency_penalty', type: 'number', default: '0', range: '-2 ~ 2', description: '惩罚高频 token 的重复出现。' },
        { name: 'presence_penalty', type: 'number', default: '0', range: '-2 ~ 2', description: '鼓励引入此前未出现的新话题。' },
        { name: 'stop', type: 'string | array', default: '—', range: '最多 4 项', description: '命中任意停止序列时结束生成。' },
        { name: 'seed', type: 'integer', default: '—', range: '—', description: '尽量保证可复现的采样种子；不保证完全确定性。' },
        { name: 'n', type: 'integer', default: '1', range: '≥ 1', description: '为每组输入消息生成的候选数量。' },
        { name: 'stream', type: 'boolean', default: 'false', range: 'true / false', description: '通过 SSE 流式返回增量，最终以 data: [DONE] 结束。' },
        { name: 'stream_options', type: 'object', default: '—', range: '—', description: '流式附加选项，例如 include_usage。' },
        { name: 'response_format', type: 'object', default: '—', range: '—', description: '强制输出 JSON 对象或符合指定 Schema 的结果。' },
        { name: 'tools', type: 'array', default: '—', range: '—', description: '模型可调用的工具或函数声明。' },
        { name: 'tool_choice', type: 'string | object', default: 'auto', range: 'none / auto / required', description: '工具选择策略，也可以指定某个具体函数。' },
        { name: 'logprobs', type: 'boolean', default: 'false', range: 'true / false', description: '返回输出 token 的对数概率。' },
        { name: 'top_logprobs', type: 'integer', default: '—', range: '0 ~ 20', description: '为每个位置返回概率最高的 token 数量。' },
        { name: 'logit_bias', type: 'object', default: '—', range: '-100 ~ 100', description: '按 token ID 设置采样前的 logit 偏置。' },
        { name: 'reasoning_effort', type: 'string', default: '—', range: 'low / medium / high', description: '支持推理的模型使用的推理强度。' },
        { name: 'user', type: 'string', default: '—', range: '—', description: '用于风险审计的终端用户标识。' },
      ],
      responseFields: [
        { name: 'id', type: 'string', required: true, description: '本次生成的唯一标识。' },
        { name: 'object', type: 'string', required: true, description: '固定为 chat.completion。' },
        { name: 'created', type: 'integer', required: true, description: '创建时间戳。' },
        { name: 'choices', type: 'array<object>', required: true, description: '生成候选，包含 message 与 finish_reason。' },
        { name: 'usage', type: 'object', required: true, description: '输入、输出与总 token 使用量。' },
      ],
      responseExample: `{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum entanglement is a relationship between particles..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 42,
    "total_tokens": 62
  }
}`,
    },
    'claude-messages': {
      kind: 'endpoint',
      group: '聊天（Chat）',
      provider: 'Anthropic Claude 格式',
      title: 'Claude Messages',
      summary: '使用 Anthropic Messages 协议调用 Claude 兼容模型，支持系统提示词、工具、扩展思考和流式响应。',
      method: 'POST',
      path: '/v1/messages',
      authMode: 'Bearer Token / x-api-key',
      codeSamples: {
        cURL: `curl https://new.oryndar.com/v1/messages \\
  -H "x-api-key: $NEW_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "<CLAUDE_MODEL>",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Explain quantum entanglement in one paragraph."
      }
    ]
  }'`,
        Python: `import os
import requests

response = requests.post(
    "https://new.oryndar.com/v1/messages",
    headers={
        "x-api-key": os.environ["NEW_API_KEY"],
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    },
    json={
        "model": "<CLAUDE_MODEL>",
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": "Explain quantum entanglement in one paragraph.",
            }
        ],
    },
)

print(response.json())`,
        TypeScript: `type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

const messages: ClaudeMessage[] = [
  {
    role: 'user',
    content: 'Explain quantum entanglement in one paragraph.',
  },
]

const response = await fetch('https://new.oryndar.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.NEW_API_KEY!,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '<CLAUDE_MODEL>',
    max_tokens: 1024,
    messages,
  }),
})

const data = await response.json()`,
        JavaScript: `const response = await fetch('https://new.oryndar.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.NEW_API_KEY,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '<CLAUDE_MODEL>',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'Explain quantum entanglement in one paragraph.',
      },
    ],
  }),
})

const data = await response.json()`,
      },
      headers: [
        { name: 'Content-Type', type: 'string', required: true, example: 'application/json', description: '请求体使用 JSON 编码。' },
        { name: 'Accept', type: 'string', required: false, example: 'application/json', description: '建议显式声明期望 JSON 响应。' },
        { name: 'anthropic-version', type: 'string', required: true, example: '2023-06-01', description: 'Anthropic API 协议版本。' },
        { name: 'Authorization', type: 'string', required: false, example: 'Bearer <YOUR_API_KEY>', description: '网关通用认证方式；与 x-api-key 二选一。' },
        { name: 'x-api-key', type: 'string', required: false, example: '<YOUR_API_KEY>', description: 'Anthropic 兼容认证方式；与 Authorization 二选一。' },
      ],
      parameters: [
        { name: 'model', type: 'string', required: true, range: '—', description: '要调用的 Claude 兼容模型 ID；可用值以控制台和 /v1/models 返回为准。' },
        { name: 'messages', type: 'array<object>', required: true, range: '—', description: '按时间顺序排列的 user 与 assistant 消息。content 可为字符串或内容块数组。' },
        { name: 'max_tokens', type: 'integer', required: true, range: '≥ 1', description: '允许模型生成的最大 token 数。' },
        { name: 'system', type: 'string | array', default: '—', range: '—', description: '系统提示词；Anthropic 格式中它是顶层字段。' },
        { name: 'temperature', type: 'number', default: '—', range: '0 ~ 1', description: '采样温度；较低时更加集中和确定。' },
        { name: 'top_p', type: 'number', default: '—', range: '0 ~ 1', description: '核采样累计概率；通常不与 temperature 同时调整。' },
        { name: 'top_k', type: 'integer', default: '—', range: '≥ 0', description: '只从概率最高的前 K 个 token 中采样。' },
        { name: 'stream', type: 'boolean', default: 'false', range: 'true / false', description: '使用 SSE 返回消息事件流。' },
        { name: 'stop_sequences', type: 'array<string>', default: '—', range: '—', description: '命中任意自定义序列时停止生成。' },
        { name: 'tools', type: 'array<object>', default: '—', range: '—', description: '可供模型调用的工具；每项包含 name、description 与 input_schema。' },
        { name: 'tool_choice', type: 'object', default: 'auto', range: 'auto / any / tool / none', description: '控制模型是否以及如何使用工具。' },
        { name: 'thinking', type: 'object', default: 'disabled', range: 'enabled / disabled', description: '扩展思考配置，包含 type 与 budget_tokens。' },
        { name: 'metadata', type: 'object', default: '—', range: '—', description: '请求元数据，例如 user_id。' },
        { name: 'context_management', type: 'object', default: '—', range: '—', description: '上下文管理配置。' },
        { name: 'output_config', type: 'object', default: '—', range: '—', description: '输出配置，例如支持时的 effort。' },
        { name: 'output_format', type: 'object', default: '—', range: '—', description: '结构化输出格式配置。' },
        { name: 'mcp_servers', type: 'array<object>', default: '—', range: '—', description: 'MCP 服务器配置。' },
        { name: 'speed', type: 'string', default: '—', range: 'standard / fast', description: '推理速度模式；需由渠道设置允许透传。' },
        { name: 'service_tier', type: 'string', default: 'auto', range: 'auto / standard_only', description: '上游服务等级；可能影响计费且需渠道允许透传。' },
      ],
      responseFields: [
        { name: 'id', type: 'string', required: true, description: '消息唯一标识。' },
        { name: 'type', type: 'string', required: true, description: '通常为 message。' },
        { name: 'role', type: 'string', required: true, description: '通常为 assistant。' },
        { name: 'content', type: 'array<object>', required: true, description: '文本、工具调用或思考等内容块。' },
        { name: 'stop_reason', type: 'string', required: false, description: 'end_turn、max_tokens、stop_sequence 或 tool_use。' },
        { name: 'usage', type: 'object', required: true, description: '输入、输出与缓存 token 使用量。' },
      ],
      responseExample: `{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Quantum entanglement describes correlations between particles..."
    }
  ],
  "model": "<CLAUDE_MODEL>",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 18,
    "output_tokens": 46
  }
}`,
    },
    'responses-api': {
      kind: 'endpoint',
      group: '聊天（Responses API）',
      provider: 'OpenAI Responses 格式',
      title: 'Responses API',
      summary: '面向多轮上下文、工具调用与推理任务的统一响应接口，可使用 previous_response_id 串联会话。',
      method: 'POST',
      path: '/v1/responses',
      authMode: 'Bearer Token',
      codeSamples: {
        'http.client': `import http.client
import json

conn = http.client.HTTPSConnection("new.oryndar.com")
payload = json.dumps({
    "model": "gpt-4.1",
    "stream": True,
    "input": [
        {
            "role": "user",
            "content": "你好啊"
        }
    ]
})
headers = {
    "Accept": "application/json",
    "Authorization": "Bearer <YOUR_API_KEY>",
    "Content-Type": "application/json"
}
conn.request("POST", "/v1/responses", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))`,
        Requests: `import os
import requests

response = requests.post(
    "https://new.oryndar.com/v1/responses",
    headers={
        "Authorization": f"Bearer {os.environ['NEW_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-4.1",
        "stream": True,
        "input": [
            {"role": "user", "content": "你好啊"}
        ],
    },
)

print(response.text)`,
        cURL: `curl https://new.oryndar.com/v1/responses \\
  -H "Authorization: Bearer $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4.1",
    "stream": true,
    "input": [
      { "role": "user", "content": "你好啊" }
    ]
  }'`,
        TypeScript: `const response = await fetch('https://new.oryndar.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1',
    stream: true,
    input: [{ role: 'user', content: '你好啊' }],
  }),
})

const data: unknown = await response.json()`,
        JavaScript: `const response = await fetch('https://new.oryndar.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1',
    stream: true,
    input: [{ role: 'user', content: '你好啊' }],
  }),
})

const data = await response.json()`,
      },
      headers: [
        { name: 'Authorization', type: 'string', required: true, example: 'Bearer <YOUR_API_KEY>', description: '在 Bearer 之后拼接令牌页面生成的 API Key。' },
        { name: 'Content-Type', type: 'string', required: true, example: 'application/json', description: '请求体使用 JSON 编码。' },
        { name: 'Accept', type: 'string', required: false, example: 'application/json', description: '建议显式声明期望 JSON 响应。' },
      ],
      parameters: [
        { name: 'model', type: 'string', required: true, range: '—', description: '要调用的模型 ID。' },
        { name: 'input', type: 'string | array<object>', default: '—', range: '—', description: '输入内容，可以是简单字符串，也可以是带 role 与 content 的消息数组。' },
        { name: 'instructions', type: 'string', default: '—', range: '—', description: '向模型提供的顶层指令。' },
        { name: 'stream', type: 'boolean', default: 'false', range: 'true / false', description: '通过 SSE 流式返回响应事件。' },
        { name: 'max_output_tokens', type: 'integer', default: '—', range: '≥ 1', description: '本次响应允许生成的最大输出 token 数。' },
        { name: 'temperature', type: 'number', default: '1', range: '0 ~ 2', description: '采样温度。' },
        { name: 'top_p', type: 'number', default: '1', range: '0 ~ 1', description: '核采样累计概率。' },
        { name: 'tools', type: 'array<object>', default: '—', range: '—', description: '可供模型调用的工具声明。' },
        { name: 'tool_choice', type: 'string | object', default: 'auto', range: '—', description: '工具选择策略或指定工具。' },
        { name: 'reasoning', type: 'object', default: '—', range: 'low / medium / high', description: '推理配置，支持 effort 与 summary。' },
        { name: 'previous_response_id', type: 'string', default: '—', range: '—', description: '上一条响应 ID，用于延续多轮上下文。' },
        { name: 'truncation', type: 'string', default: 'disabled', range: 'auto / disabled', description: '上下文超限时的截断策略。' },
      ],
      requestExample: `{
  "model": "gpt-4.1",
  "stream": true,
  "input": [
    {
      "role": "user",
      "content": "你好啊"
    }
  ]
}`,
      responseFields: [
        { name: 'id', type: 'string', required: true, description: '响应唯一标识。' },
        { name: 'object', type: 'string', required: true, description: '固定为 response。' },
        { name: 'created_at', type: 'integer', required: true, description: '创建时间戳。' },
        { name: 'status', type: 'string', required: true, description: 'completed、failed、in_progress 或 incomplete。' },
        { name: 'model', type: 'string', required: true, description: '实际使用的模型 ID。' },
        { name: 'output', type: 'array<object>', required: true, description: '消息、工具调用等输出项。' },
        { name: 'usage', type: 'object', required: true, description: '输入、输出与总 token 使用量。' },
      ],
      responseExample: `{
  "id": "resp_123",
  "object": "response",
  "created_at": 1677652288,
  "status": "completed",
  "model": "gpt-4.1",
  "output": [
    {
      "type": "message",
      "id": "msg_123",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "你好！有什么我可以帮你的吗？"
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 9,
    "output_tokens": 12,
    "total_tokens": 21
  }
}`,
    },
    'image-sync': {
      kind: 'endpoint',
      group: '图像生成（Images）',
      provider: 'OpenAI Images 兼容格式',
      title: '同步图像生成',
      summary: '提交图像描述并等待生成完成，在同一次 HTTP 响应中取得图像 URL 或 Base64 数据。适合生成时间较短、调用方可以保持连接的场景。',
      method: 'POST',
      path: '/v1/images/generations',
      authMode: 'Bearer Token',
      codeSamples: {
        cURL: `curl https://new.oryndar.com/v1/images/generations \\
  -H "Authorization: Bearer $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
       "model": "gpt-image-2",
       "prompt": "A serene koi pond at sunset, ukiyo-e style.",
       "size": "1024x1024",
       "n": 1
     }'`,
        Python: `import os
import requests

response = requests.post(
    "https://new.oryndar.com/v1/images/generations",
    headers={
        "Authorization": f"Bearer {os.environ['NEW_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-image-2",
        "prompt": "A serene koi pond at sunset, ukiyo-e style.",
        "size": "1024x1024",
        "n": 1,
    },
)

response.raise_for_status()
print(response.json())`,
        TypeScript: `type ImageGenerationResponse = {
  created: number
  data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>
}

const response = await fetch('https://new.oryndar.com/v1/images/generations', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-image-2',
    prompt: 'A serene koi pond at sunset, ukiyo-e style.',
    size: '1024x1024',
    n: 1,
  }),
})

const data = (await response.json()) as ImageGenerationResponse`,
        JavaScript: `const response = await fetch('https://new.oryndar.com/v1/images/generations', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-image-2',
    prompt: 'A serene koi pond at sunset, ukiyo-e style.',
    size: '1024x1024',
    n: 1,
  }),
})

const data = await response.json()`,
      },
      headers: [
        { name: 'Authorization', type: 'string', required: true, example: 'Bearer <YOUR_API_KEY>', description: '在 Bearer 之后拼接令牌页面生成的 API Key。' },
        { name: 'Content-Type', type: 'string', required: true, example: 'application/json', description: '请求体使用 JSON 编码。' },
        { name: 'Accept', type: 'string', required: false, example: 'application/json', description: '建议显式声明期望 JSON 响应。' },
      ],
      parameters: [
        { name: 'model', type: 'string', required: true, range: '—', description: '要使用的图像模型 ID，例如 gpt-image-2。' },
        { name: 'prompt', type: 'string', required: true, range: '—', description: '想要生成图像的文字描述。' },
        { name: 'size', type: 'enum', default: '1024x1024', range: '模型相关', description: '输出图像尺寸；可用值取决于所选模型。请使用字母 x，不要使用乘号 ×。' },
        { name: 'quality', type: 'enum', default: 'standard', range: '模型相关', description: '生成质量预设；部分 GPT Image 模型也支持 auto、low、medium 或 high。' },
        { name: 'style', type: 'enum', default: 'vivid', range: 'vivid / natural', description: '画风预设；仅在上游模型支持时生效。' },
        { name: 'n', type: 'integer', default: '1', range: '1 ~ 10', description: '生成的图像数量；模型或渠道可能设置更严格的上限。' },
        { name: 'response_format', type: 'enum', default: 'url', range: 'url / b64_json', description: '图像结果的返回方式。' },
        { name: 'background', type: 'enum', default: 'auto', range: 'auto / transparent / opaque', description: '支持时指定图像背景模式。' },
        { name: 'output_format', type: 'enum', default: 'png', range: 'png / jpeg / webp', description: '支持时指定输出文件格式。' },
        { name: 'output_compression', type: 'integer', default: '—', range: '0 ~ 100', description: 'JPEG 或 WebP 输出的压缩质量。' },
        { name: 'user', type: 'string', default: '—', range: '—', description: '用于风险审计的终端用户标识。' },
      ],
      responseFields: [
        { name: 'created', type: 'integer', required: true, description: '图像生成完成的 Unix 时间戳。' },
        { name: 'data', type: 'array<object>', required: true, description: '生成结果数组，每项对应一张图像。' },
        { name: 'data[].url', type: 'string', required: false, description: 'response_format 为 url 时返回的临时图像地址。' },
        { name: 'data[].b64_json', type: 'string', required: false, description: 'response_format 为 b64_json 时返回的 Base64 图像数据。' },
        { name: 'data[].revised_prompt', type: 'string', required: false, description: '上游模型改写后的提示词（如果提供）。' },
      ],
      responseExample: `{
  "created": 1760000000,
  "data": [
    {
      "url": "https://example.com/generated/koi-pond.png",
      "revised_prompt": "A serene ukiyo-e koi pond at sunset."
    }
  ]
}`,
    },
    'image-async': {
      kind: 'endpoint',
      group: '图像生成（Images）',
      provider: 'New API 异步任务格式',
      title: '异步图像生成',
      summary: '先创建后台任务并立即取得 taskId，再轮询任务记录直到成功或失败。适合生成耗时较长、调用方不希望持续占用连接的场景。',
      method: 'POST',
      path: '/api/v1/jobs/createTask',
      authMode: 'Bearer Token',
      workflow: [
        { step: '01', method: 'POST', path: '/api/v1/jobs/createTask', label: '创建任务' },
        { step: '02', method: 'GET', path: '/api/v1/jobs/recordInfo?taskId=<TASK_ID>', label: '查询结果' },
      ],
      stateLegend: [
        { value: 'waiting', label: '排队中', detail: '任务已创建，等待后台执行。' },
        { value: 'running', label: '生成中', detail: '任务正在调用图像模型。' },
        { value: 'success', label: '已完成', detail: '从 resultJson 读取生成结果。' },
        { value: 'fail', label: '失败', detail: '查看 failCode 与 failMsg。' },
      ],
      codeSamples: {
        cURL: `# 1. 创建任务
curl https://new.oryndar.com/api/v1/jobs/createTask \\
  -H "Authorization: Bearer $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": {
      "model": "gpt-image-2",
      "prompt": "A serene koi pond at sunset, ukiyo-e style.",
      "size": "1024x1024",
      "n": 1
    }
  }'

# 2. 使用返回的 taskId 查询任务
curl "https://new.oryndar.com/api/v1/jobs/recordInfo?taskId=<TASK_ID>" \\
  -H "Authorization: Bearer $NEW_API_KEY"`,
        Python: `import os
import time
import requests

headers = {"Authorization": f"Bearer {os.environ['NEW_API_KEY']}"}
created = requests.post(
    "https://new.oryndar.com/api/v1/jobs/createTask",
    headers={**headers, "Content-Type": "application/json"},
    json={
        "input": {
            "model": "gpt-image-2",
            "prompt": "A serene koi pond at sunset, ukiyo-e style.",
            "size": "1024x1024",
            "n": 1,
        }
    },
)
created.raise_for_status()
task_id = created.json()["data"]["taskId"]

while True:
    record = requests.get(
        "https://new.oryndar.com/api/v1/jobs/recordInfo",
        headers=headers,
        params={"taskId": task_id},
    )
    record.raise_for_status()
    task = record.json()["data"]
    if task["state"] in {"success", "fail"}:
        print(task)
        break
    time.sleep(2)`,
        TypeScript: `type JobState = 'waiting' | 'running' | 'success' | 'fail'

const headers = {
  Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
  'Content-Type': 'application/json',
}

const created = await fetch('https://new.oryndar.com/api/v1/jobs/createTask', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    input: {
      model: 'gpt-image-2',
      prompt: 'A serene koi pond at sunset, ukiyo-e style.',
      size: '1024x1024',
      n: 1,
    },
  }),
})
const taskId: string = (await created.json()).data.taskId

let state: JobState = 'waiting'
while (state === 'waiting' || state === 'running') {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const response = await fetch(
    \`https://new.oryndar.com/api/v1/jobs/recordInfo?taskId=\${encodeURIComponent(taskId)}\`,
    { headers },
  )
  const record = await response.json()
  state = record.data.state
  if (state === 'success' || state === 'fail') console.log(record.data)
}`,
        JavaScript: `const headers = {
  Authorization: \`Bearer \${process.env.NEW_API_KEY}\`,
  'Content-Type': 'application/json',
}

const created = await fetch('https://new.oryndar.com/api/v1/jobs/createTask', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    input: {
      model: 'gpt-image-2',
      prompt: 'A serene koi pond at sunset, ukiyo-e style.',
      size: '1024x1024',
      n: 1,
    },
  }),
})
const taskId = (await created.json()).data.taskId

let state = 'waiting'
while (state === 'waiting' || state === 'running') {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const response = await fetch(
    \`https://new.oryndar.com/api/v1/jobs/recordInfo?taskId=\${encodeURIComponent(taskId)}\`,
    { headers },
  )
  const record = await response.json()
  state = record.data.state
  if (state === 'success' || state === 'fail') console.log(record.data)
}`,
      },
      headers: [
        { name: 'Authorization', type: 'string', required: true, example: 'Bearer <YOUR_API_KEY>', description: '创建任务和查询任务都必须携带相同的 API Key。' },
        { name: 'Content-Type', type: 'string', required: true, example: 'application/json', description: '创建任务时请求体使用 JSON 编码。' },
        { name: 'Accept', type: 'string', required: false, example: 'application/json', description: '建议显式声明期望 JSON 响应。' },
      ],
      parameters: [
        { name: 'input', type: 'object', required: true, range: '—', description: '图像生成请求对象。参数必须嵌套在 input 内，不能直接放在顶层。' },
        { name: 'input.model', type: 'string', required: true, range: '—', description: '要使用的图像模型 ID，例如 gpt-image-2。' },
        { name: 'input.prompt', type: 'string', required: true, range: '—', description: '想要生成图像的文字描述。' },
        { name: 'input.size', type: 'enum', default: '1024x1024', range: '模型相关', description: '输出图像尺寸。请使用字母 x，不要使用乘号 ×。' },
        { name: 'input.quality', type: 'enum', default: 'standard', range: '模型相关', description: '生成质量预设。' },
        { name: 'input.style', type: 'enum', default: 'vivid', range: 'vivid / natural', description: '上游模型支持时使用的画风预设。' },
        { name: 'input.n', type: 'integer', default: '1', range: '1 ~ 10', description: '生成的图像数量；模型或渠道可能设置更严格的上限。' },
        { name: 'input.response_format', type: 'enum', default: 'url', range: 'url / b64_json', description: '图像结果的返回方式。' },
        { name: 'input.return_base64', type: 'boolean', default: 'false', range: 'true / false', description: '设为 true 时请求 Base64 图像结果。' },
        { name: 'input.stream', type: 'boolean', default: 'false', range: '仅 false', description: '异步任务接口不支持 stream=true。' },
        { name: 'taskId', type: 'query string', required: true, range: '—', description: '查询 recordInfo 时传入 createTask 返回的任务 ID。' },
      ],
      responseFields: [
        { name: 'code', type: 'integer', required: true, description: 'HTTP 语义状态码；成功时为 200。' },
        { name: 'msg', type: 'string', required: true, description: '结果说明；成功时为 success。' },
        { name: 'success', type: 'boolean', required: true, description: '本次 API 请求是否成功。' },
        { name: 'data.taskId', type: 'string', required: true, description: '任务唯一标识。创建成功后用它查询任务。' },
        { name: 'data.state', type: 'string', required: false, description: '任务状态：waiting、running、success 或 fail。' },
        { name: 'data.progress', type: 'integer', required: false, description: '0 到 100 的任务进度。' },
        { name: 'data.resultJson', type: 'string', required: false, description: '成功时的图像结果 JSON 字符串；解析后读取 data、resultUrls 等上游结果。' },
        { name: 'data.failCode', type: 'string', required: false, description: '失败时返回 task_failed。' },
        { name: 'data.failMsg', type: 'string', required: false, description: '失败原因。' },
        { name: 'data.costTime', type: 'integer', required: false, description: '任务耗时，单位毫秒。' },
        { name: 'data.createTime', type: 'integer', required: false, description: '创建时间，Unix 毫秒时间戳。' },
        { name: 'data.completeTime', type: 'integer', required: false, description: '完成时间，Unix 毫秒时间戳；未完成时为 0。' },
        { name: 'data.creditsConsumed', type: 'integer', required: false, description: '本次任务消耗的额度。' },
      ],
      responseExamples: {
        创建任务: `{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "taskId": "task_12345678"
  }
}`,
        查询成功: `{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "taskId": "task_12345678",
    "model": "gpt-image-2",
    "state": "success",
    "param": "{\"model\":\"gpt-image-2\",\"input\":{...}}",
    "resultJson": "{\"created\":1760000000,\"data\":[{\"url\":\"https://example.com/generated/koi-pond.png\"}]}",
    "failCode": "",
    "failMsg": "",
    "costTime": 15000,
    "completeTime": 1760000015000,
    "createTime": 1760000000000,
    "updateTime": 1760000015000,
    "progress": 100,
    "creditsConsumed": 50
  }
}`,
        查询失败: `{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "taskId": "task_12345678",
    "model": "gpt-image-2",
    "state": "fail",
    "resultJson": "",
    "failCode": "task_failed",
    "failMsg": "upstream failed",
    "progress": 100
  }
}`,
      },
    },
  },
}
