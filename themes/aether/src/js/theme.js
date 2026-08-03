(function (root) {
    'use strict';

    const Aether = root.Aether;
    if (!Aether || !Aether.modules || !Aether.utils || Aether.application) return;

    const modules = Aether.modules;
    const utils = Aether.utils;
    const appContext = utils.createContext('application');
    let pageContext = null;

    function destroyPage() {
        if (!pageContext) return;
        pageContext.destroy();
        pageContext = null;
        appContext.pageContext = null;
    }

    function initPage(reason) {
        destroyPage();
        pageContext = utils.createContext(reason);
        appContext.pageContext = pageContext;
        utils.safeInit('page config', modules.config.init, pageContext);
        utils.safeInit('page lifecycle', modules.lifecycle.init, pageContext);
        utils.safeInit('tag explorer', modules.tagExplorer.init, pageContext);
        utils.safeInit('footprint gallery', modules.footprintGallery.init, pageContext);
    }

    appContext.onPageSend = destroyPage;
    appContext.onPageSuccess = () => initPage('pjax-success');
    utils.safeInit('PJAX', modules.pjax.init, appContext);

    const application = {
        name: 'theme-entry',
        init: initPage,
        destroy() {
            destroyPage();
            appContext.destroy();
            if (Aether.application === application) delete Aether.application;
        },
    };
    Aether.application = application;

    const boot = () => initPage('initial-load');
    if (document.readyState === 'loading') appContext.listen(document, 'DOMContentLoaded', boot);
    else boot();
})(window);
