(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;

    function initComment(context) {
        const config = context.config.comment;
        if (!config) return utils.noop;
        if (config.gitalk && typeof root.Gitalk === 'function') {
            config.gitalk.body = decodeURI(root.location.href);
            const gitalk = new root.Gitalk(config.gitalk);
            gitalk.render('gitalk');
        }
        if (config.valine && typeof root.Valine === 'function') new root.Valine(config.valine);
        if (config.waline && typeof root.Waline === 'function') new root.Waline(config.waline);
        if (config.twikoo && root.twikoo) root.twikoo.init(config.twikoo);
        if (config.utterances) {
            const container = document.getElementById('utterances');
            if (container && !container.querySelector('script')) {
                const script = document.createElement('script');
                script.src = 'https://utteranc.es/client.js';
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.setAttribute('repo', config.utterances.repo);
                script.setAttribute('issue-term', config.utterances.issueTerm);
                if (config.utterances.label) script.setAttribute('label', config.utterances.label);
                script.setAttribute('theme', context.state.isDark ? config.utterances.darkTheme : config.utterances.lightTheme);
                container.appendChild(script);
                const updateTheme = () => {
                    const iframe = container.querySelector('.utterances-frame');
                    if (iframe) iframe.contentWindow.postMessage({ type: 'set-theme', theme: context.state.isDark ? config.utterances.darkTheme : config.utterances.lightTheme }, 'https://utteranc.es');
                };
                context.events.theme.add(updateTheme);
                context.addCleanup(() => context.events.theme.delete(updateTheme));
            }
        }
        return utils.noop;
    }

    modules.comments = {
        name: 'comments',
        init: initComment,
    };
})(window);
