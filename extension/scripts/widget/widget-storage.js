(() => {
    function isContextInvalidationError(error) {
        return Boolean(
            error
            && typeof error.message === "string"
            && error.message.includes("Extension context invalidated")
        );
    }

    function createStorageApi(onContextInvalidated) {
        let hasInvalidatedContext = false;

        function handleContextInvalidated(error) {
            if (hasInvalidatedContext) {
                return;
            }

            hasInvalidatedContext = true;
            if (typeof onContextInvalidated === "function") {
                onContextInvalidated(error);
            }
        }

        function isContextValid() {
            if (hasInvalidatedContext) {
                return false;
            }

            try {
                return Boolean(
                    typeof chrome !== "undefined"
                    && chrome.runtime
                    && chrome.runtime.id
                    && chrome.storage
                    && chrome.storage.local
                );
            } catch (error) {
                if (isContextInvalidationError(error)) {
                    handleContextInvalidated(error);
                }
                return false;
            }
        }

        function getChromeRuntimeError() {
            try {
                if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.lastError) {
                    return null;
                }

                const error = new Error(chrome.runtime.lastError.message || "Chrome runtime error");
                if (isContextInvalidationError(error)) {
                    handleContextInvalidated(error);
                }

                return error;
            } catch (error) {
                if (isContextInvalidationError(error)) {
                    handleContextInvalidated(error);
                }
                return error;
            }
        }

        function safeGet(keys, fallbackValue, callback) {
            if (!isContextValid()) {
                callback(fallbackValue);
                return;
            }

            try {
                chrome.storage.local.get(keys, (result) => {
                    const runtimeError = getChromeRuntimeError();
                    if (runtimeError) {
                        callback(fallbackValue);
                        return;
                    }

                    callback(result || fallbackValue);
                });
            } catch (error) {
                if (isContextInvalidationError(error)) {
                    handleContextInvalidated(error);
                }
                callback(fallbackValue);
            }
        }

        function safeSet(items, callback) {
            const onComplete = typeof callback === "function" ? callback : () => { };

            if (!isContextValid()) {
                onComplete(false);
                return;
            }

            try {
                chrome.storage.local.set(items, () => {
                    const runtimeError = getChromeRuntimeError();
                    if (runtimeError) {
                        onComplete(false);
                        return;
                    }

                    onComplete(true);
                });
            } catch (error) {
                if (isContextInvalidationError(error)) {
                    handleContextInvalidated(error);
                }
                onComplete(false);
            }
        }

        return {
            isContextValid,
            isAvailable: isContextValid,
            safeGet,
            safeSet,
            isContextInvalidationError,
        };
    }

    window.RecallWidgetStorage = {
        createStorageApi,
        isContextInvalidationError,
    };
})();
