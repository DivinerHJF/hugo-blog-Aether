(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;

    function restorePageConfig() {
        const configElement = document.getElementById('page-config');
        if (!configElement) return {};

        try {
            const config = JSON.parse(configElement.textContent || '');
            return config && typeof config === 'object' ? config : {};
        } catch (error) {
            console.warn('Unable to restore the current page config after PJAX:', error);
            return {};
        }
    }

    modules.config = {
        name: 'page-config',
        init(context) {
            const config = restorePageConfig();
            root.config = config;
            context.config = config;
            context.data = context.config.data || {};
            return Aether.utils.noop;
        },
    };
})(window);
