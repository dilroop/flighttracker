/**
 * AeroTracker Cloudflare Worker
 *
 * - Proxies /adsb-api/*  → https://api.adsb.lol/*
 * - Proxies /route-api/* → https://api.adsbdb.com/*
 * - Serves static assets from dist/ (via Workers Sites / __STATIC_CONTENT)
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Proxy: /adsb-api/* → https://api.adsb.lol/* ---
    if (path.startsWith('/adsb-api/')) {
      const upstreamPath = path.replace('/adsb-api', '');
      const upstreamUrl = `https://api.adsb.lol${upstreamPath}${url.search}`;
      const proxyRequest = new Request(upstreamUrl, {
        method: request.method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AeroTracker/1.0',
        },
      });
      const response = await fetch(proxyRequest);
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // --- Proxy: /route-api/* → https://api.adsbdb.com/* ---
    if (path.startsWith('/route-api/')) {
      const upstreamPath = path.replace('/route-api', '');
      const upstreamUrl = `https://api.adsbdb.com${upstreamPath}${url.search}`;
      const proxyRequest = new Request(upstreamUrl, {
        method: request.method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AeroTracker/1.0',
        },
      });
      const response = await fetch(proxyRequest);
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // --- Serve static assets from dist/ ---
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    } catch {
      // SPA fallback: return index.html for any unmatched route
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      return await getAssetFromKV(
        { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    }
  },
};
