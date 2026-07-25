/**
 * AeroTracker Cloudflare Worker
 *
 * - Proxies /adsb-api/*    → https://api.adsb.lol/*
 * - Proxies /route-api/*   → https://api.adsbdb.com/*
 * - Proxies /opensky-api/* → https://opensky-network.org/*
 * - Proxies /geocode-api/* → https://nominatim.openstreetmap.org/*
 * - Serves static assets from dist/ (via Workers Sites / __STATIC_CONTENT)
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

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

    // --- Proxy: /opensky-api/* → https://opensky-network.org/* ---
    if (path.startsWith('/opensky-api/')) {
      const upstreamPath = path.replace('/opensky-api', '');
      const upstreamUrl = `https://opensky-network.org${upstreamPath}${url.search}`;
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
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // --- Proxy: /geocode-api/* → https://nominatim.openstreetmap.org/* ---
    if (path.startsWith('/geocode-api/')) {
      const upstreamPath = path.replace('/geocode-api', '');
      const upstreamUrl = `https://nominatim.openstreetmap.org${upstreamPath}${url.search}`;
      const response = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AeroTracker/1.0',
        },
      });
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=3600',
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
