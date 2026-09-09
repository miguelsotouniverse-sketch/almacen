/* Service worker — cachea el armazón de la app para que abra sin señal.
   Los datos NUNCA se cachean: siempre van al gateway o a la cola local. */

var CACHE = 'msu-almacen-v7';
var FAMILIA = 'msu-almacen-';
var ARCHIVOS = ['./', './index.html', './manifest.json'];
var OPCIONALES = [];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ARCHIVOS).then(function () {
        return Promise.all(OPCIONALES.map(function (u) {
          return c.add(u).catch(function () { /* opcional: se ignora */ });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (k) {
        /* Sólo se borran las versiones viejas de ESTA app. Las dos apps viven
           en el mismo dominio: antes cada service worker borraba el caché de
           la otra al activarse, y se quedaban peleando el almacenamiento. */
        if (k !== CACHE && k.indexOf(FAMILIA) === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Nunca interceptar lo que no sea GET, ni nada de otro origen: el backend,
  // y sobre todo el script de Google Identity, tienen que ir directo a la red.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
        }
        return res;
      })
      .catch(function () { return caches.match(e.request); })
  );
});
