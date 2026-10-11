/**
 * Cloudflare Worker — Supabase 反向代理
 * 解决国内访问 Supabase 被墙/超时的问题
 * 支持 GET/POST/PATCH/DELETE 所有方法，转发所有 header
 *
 * 部署步骤（免费，1分钟）：
 * 1. 注册/登录 https://dash.cloudflare.com
 * 2. 左侧菜单 → Workers 和 Pages → 创建 → 创建 Worker
 * 3. 把本文件代码粘贴进去，保存并部署
 * 4. 复制得到的域名（如 https://sb-proxy.你的用户名.workers.dev）
 * 5. 分别填入 dashou.html / index.html / admin.html 的 SB_WORKER_URL 常量
 */

const SUPABASE_URL = "https://jsrxbpysgaywdhnntqnl.supabase.co";

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = SUPABASE_URL + url.pathname + url.search;

    // 克隆请求头，移除 host
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.delete("referer");

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
    });

    const response = await fetch(newRequest);

    // 添加 CORS 头
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
