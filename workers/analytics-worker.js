// Cloudflare Worker for 1x1 analytics pixel -> KV counters per day/brand/product
// Bindings: KV namespace as CLICKS (create in CF dashboard)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/p') return new Response('Not found', { status: 404 });
    const d = url.searchParams.get('d');
    const slug = url.searchParams.get('slug');
    const product_path = url.searchParams.get('product_path');
    if (!d || !slug || !product_path) return new Response('Bad Request', { status: 400 });

    const key = `${d}:${slug}:${product_path}`;
    await env.CLICKS.put(key, String((parseInt(await env.CLICKS.get(key)) || 0) + 1));

    // Return a 1x1 transparent gif
    const gif = Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,1,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]);
    return new Response(gif, { headers: { 'content-type': 'image/gif', 'cache-control': 'no-store' } });
  }
}
