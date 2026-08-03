(function (root) {
    'use strict';

    const Aether = root.Aether = root.Aether || {};
    const modules = Aether.modules = Aether.modules || {};
    const utils = Aether.utils = Aether.utils || {};

    const noop = () => {};

    function addCleanup(context, cleanup) {
        if (!context || typeof cleanup !== 'function') return cleanup;
        context.cleanup.push(cleanup);
        return cleanup;
    }

    function listen(context, target, type, handler, options) {
        if (!target || typeof target.addEventListener !== 'function') return noop;
        target.addEventListener(type, handler, options || false);
        return addCleanup(context, () => {
            target.removeEventListener(type, handler, options || false);
        });
    }

    function observe(context, observer, target) {
        if (!observer || !target) return observer;
        observer.observe(target);
        addCleanup(context, () => observer.disconnect());
        return observer;
    }

    function safeInit(name, init, context) {
        try {
            const destroy = init(context);
            if (typeof destroy === 'function') addCleanup(context, destroy);
            return destroy;
        } catch (error) {
            console.error(`Failed to initialize ${name}:`, error);
            return null;
        }
    }

    function createContext(reason) {
        const cleanup = [];
        const context = {
            reason: reason || 'page',
            root: document,
            config: root.config || {},
            data: (root.config && root.config.data) || {},
            cleanup,
            destroyed: false,
            events: {
                scroll: new Set(),
                resize: new Set(),
                theme: new Set(),
                mask: new Set(),
                pjaxSend: new Set(),
            },
            state: {},
            listen(typeTarget, type, handler, options) {
                return listen(context, typeTarget, type, handler, options);
            },
            observe(observer, target) {
                return observe(context, observer, target);
            },
            addCleanup(cleanupHandler) {
                return addCleanup(context, cleanupHandler);
            },
            emit(eventSet) {
                if (!eventSet) return;
                Array.from(eventSet).forEach(handler => {
                    try {
                        handler();
                    } catch (error) {
                        console.error('Aether lifecycle event failed:', error);
                    }
                });
            },
            destroy() {
                if (context.destroyed) return;
                context.destroyed = true;
                while (cleanup.length) {
                    const cleanupHandler = cleanup.pop();
                    try {
                        cleanupHandler();
                    } catch (error) {
                        console.error('Aether cleanup failed:', error);
                    }
                }
                Object.values(context.events).forEach(eventSet => eventSet.clear());
            },
        };
        return context;
    }

    utils.noop = noop;
    utils.addCleanup = addCleanup;
    utils.listen = listen;
    utils.observe = observe;
    utils.safeInit = safeInit;
    utils.createContext = createContext;
    utils.forEach = (elements, handler) => {
        Array.from(elements || []).forEach(handler);
    };
    utils.getScrollTop = () => {
        return (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
    };
    utils.isMobileWindow = () => window.matchMedia('only screen and (max-width: 680px)').matches;
    utils.isTocStatic = () => window.matchMedia('only screen and (max-width: 1000px)').matches;

    // All Aether modules use this single public contract.
    modules.events = {
        name: 'core-events',
        init() {
            return noop;
        },
    };
})(window);
