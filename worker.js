/**
 * Cloudflare Worker — Supabase 反向代理
 * 解决国内访问 Supabase 被墙/超时的问题
 * 支持 GET/POST/PATCH/DELETE 所有方法
 */

const SUPABASE_URL = "https://jsrxbpysgaywdhnntqnl.supabase.co";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS 预检
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

  // 构建转发 header（过滤掉 cf 内部 header）
  const newHeaders = {};
  for (const [k, v] of request.headers) {
    const lk = k.toLowerCase();
    if (lk === "host" || lk === "origin" || lk === "referer" ||
        lk.startsWith("cf-") || lk === "x-forwarded-proto" || lk === "x-real-ip") {
      continue;
    }
    newHeaders[k] = v;
  }

  // 读取 body（避免 stream 传递问题）
  const init = { method: request.method, headers: newHeaders };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const bodyBuf = await request.arrayBuffer();
    if (bodyBuf.byteLength > 0) init.body = bodyBuf;
  }

  try {
    const response = await fetch(targetUrl, init);
    const respBody = await response.arrayBuffer();

    const respHeaders = {};
    for (const [k, v] of response.headers) {
      respHeaders[k] = v;
    }
    respHeaders["Access-Control-Allow-Origin"] = "*";
    respHeaders["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS";
    respHeaders["Access-Control-Allow-Headers"] = "*";

    return new Response(respBody, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response("Proxy error: " + e.message, {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain",
      },
    });
  }
}
