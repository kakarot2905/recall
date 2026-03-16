(() => {
    const DB_NAME = "RecallExtensionDB";
    const DB_VERSION = 1;
    const STORE_NAME = "recallStore";

    let dbInstance = null;

    function openDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                dbInstance = request.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async function saveToIndexedDB(key, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getFromIndexedDB(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function removeFromIndexedDB(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function clearAllIndexedDB() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function setLocalExtensionStorage(entries) {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            return;
        }

        return new Promise((resolve, reject) => {
            chrome.storage.local.set(entries, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    async function getLocalExtensionStorage(keys) {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            return {};
        }

        return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(result || {});
            });
        });
    }

    async function removeLocalExtensionStorage(keys) {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            return;
        }

        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    async function saveWidgetCards(cards) {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            return;
        }

        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ recallWidgetCards: cards || [] }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    window.RecallStorage = {
        openDB,
        saveToIndexedDB,
        getFromIndexedDB,
        removeFromIndexedDB,
        clearAllIndexedDB,
        setLocalExtensionStorage,
        getLocalExtensionStorage,
        removeLocalExtensionStorage,
        saveWidgetCards,
    };
})();
