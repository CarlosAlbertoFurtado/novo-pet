// ============================================================
// SERVICE WORKER — Tradutor Pet (PWA)
// ============================================================
// Funcionalidades:
//   - Instalação e execução como App Local / Nativo
//   - Cache inteligente de assets estáticos (App Shell)
//   - Suporte a notificações push na tela de bloqueio
// ============================================================

const CACHE_NAME = 'tradutor-pet-pwa-v20261124';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=20261124_v1',
  '/app.js?v=20261124_v1',
  '/analyzer.js?v=20261124_v1',
  '/species_config.js?v=20261124_v1',
  '/hero-banner.jpg',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/apple-touch-icon.png'
];

// 1. Instalação: armazena os arquivos principais em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Alguns assets foram ignorados no pré-cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Ativação: remove caches de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estratégia de Fetch:
//    - Requisições à API (/api/*) e uploads POST: sempre direto na rede
//    - Assets estáticos: Cache-first com fallback para rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Requisições para backend ou chamadas de pagamento/análise nunca ficam presas em cache
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});

// 4. Recebimento de Notificações Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'Tradutor Pet',
    body: 'Alerta Nutricional: Novas marcas e laudos atualizados para o seu pet!',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Clique na Notificação Push: foca ou abre a janela do app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
