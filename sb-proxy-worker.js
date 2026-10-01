// Cloudflare Worker: Supabase 反向代理
// 解决国内访问 supabase.co 被墙/超时的问题
// 部署后将前端 SB_URL 改为 Worker 地址即可
//
// 部署方法:
// 1. 登录 https://dash.cloudflare.com
// 2. Workers & Pages → Create → Create Worker
// 3. 粘贴本文件内容，保存部署
// 4. 复制 Worker 地址 (如 https://sb-proxy.你的用户名.workers.dev)
// 5. 把前端 SB_URL 改成这个地址

const SUPABASE_URL = 'https://jsrxbpysgaywdhnntqnl.supabase.co'

export default {
  async fetch(request) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const url = new URL(request.url)
    // 拼接目标 URL: Supabase 域名 + 路径 + 查询参数
    const targetUrl = SUPABASE_URL + url.pathname + url.search

    // 转发请求头（保留 apikey / Authorization 等）
    const headers = new Headers(request.headers)
    headers.set('Host', 'jsrxbpysgaywdhnntqnl.supabase.co')

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'follow',
    })

    try {
      const response = await fetch(proxyRequest)

      // 构造响应，添加 CORS 头
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', '*')
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD')
      newHeaders.set('Access-Control-Allow-Headers', '*')
      // 移除可能导致问题的头
      newHeaders.delete('content-security-policy')
      newHeaders.delete('x-frame-options')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy fetch failed', message: err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  },
}
