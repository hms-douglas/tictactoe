"use strict";

(function() {
    const CACHE_VERSION = "ttt_v1";

    const FILES_TO_BE_CACHED = [
        "index.html",
        "manifest.json", 
        "js/app.js", 
        "img/favicon/favicon.ico",
        "font/Lato.ttf", 
        "font/Lato.otf", 
        "font/Lato.woff2", 
        "css/style.css", 
        "css/font.css", 
        "audio/music/0.mp3", 
        "audio/music/1.mp3", 
        "audio/music/2.mp3", 
        "audio/music/3.mp3", 
        "audio/sound/x.wav", 
        "audio/sound/o.wav"
    ];

    self.addEventListener("install", function(ev) {
        ev.waitUntil(
            caches.open(CACHE_VERSION)
            .then(function(cache) {
                cache.addAll(FILES_TO_BE_CACHED);   
            })
            .then(function() {
                self.skipWaiting();
            })
        );
    });

    self.addEventListener("activate", function(ev) {
        ev.waitUntil(
            caches.keys().then(function(cacheVersions) {
                return Promise.all(
                    cacheVersions.map(function(cache) {
                        if(cache !== CACHE_VERSION && cache.startsWith("ttt_")) {
                            return caches.delete(cache);
                        }
                    })
                );
            })
        );
    });

    self.addEventListener("fetch", function(ev) {
        ev.respondWith(async function() {
            try {
                //cache first
                const cachedResponse = await caches.match(ev.request);
            
                if(cachedResponse) {
                    return cachedResponse;
                }

                //network if not cached, and add the file to cache
                const networkResponse = await fetch(ev.request);

                const cache = await caches.open(CACHE_VERSION);

                await cache.put(ev.request, networkResponse.clone());

                console.info("Auto cached: " + ev.request.url)

                return networkResponse;
            } catch(error) {
                //try the cache again
                const cacheResponse = await caches.match(ev.request);
                
                if(cacheResponse) {
                    return cacheResponse;
                }
            }
        }());
    });
})();