(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const features = [
        modules.navigation,
        modules.search,
        modules.contentImageViewer,
        modules.contentEnhancements,
        modules.articleNavigation,
        modules.toc,
        modules.comments,
        modules.integrations,
        modules.tagExplorer,
        modules.footprintGallery,
    ];

    modules.lifecycle = {
        name: 'page-lifecycle',
        init(context) {
            context.data = context.config.data || {};
            context.state.isDark = document.body.getAttribute('theme') !== 'light';
            features.forEach(feature => utils.safeInit(feature.name, feature.init, context));
            return utils.noop;
        },
    };
})(window);
