(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;

    modules.search = {
        name: 'search',
        init(context) {
            const searchConfig = context.config.search;
            if (!searchConfig || searchConfig.enable === false) return Aether.utils.noop;
            const engine = Aether.getSearchEngine(context.config);
            const destroyDialog = Aether.createSearchDialog(context, engine);
            Aether.initSearchLanding(context);
            return destroyDialog;
        },
    };
})(window);
