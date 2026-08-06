(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;

    function initArticleNavigation(context) {
        const button = document.querySelector('[data-scroll-to-page-end]');
        const article = document.querySelector('.page.single');
        const footer = document.getElementById('post-footer');
        if (!button || !article || !footer) return utils.noop;

        const icon = button.querySelector('i');
        const label = button.querySelector('span');
        const reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
        let scrollToTop = false;

        const update = () => {
            scrollToTop = footer.getBoundingClientRect().top < root.innerHeight * .6;
            if (icon) icon.className = scrollToTop ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            if (label) label.textContent = scrollToTop ? '页首' : '页底';
            button.setAttribute('aria-label', scrollToTop ? '滚动到文章页首' : '滚动到文章页底');
            button.title = scrollToTop ? '滚动到文章页首' : '滚动到文章页底';
        };

        const activate = () => {
            const target = scrollToTop ? article : footer;
            target.scrollIntoView({
                behavior: reduceMotion && reduceMotion.matches ? 'auto' : 'smooth',
                block: 'start',
            });
        };

        context.listen(button, 'click', activate);
        context.events.scroll.add(update);
        update();

        return () => context.events.scroll.delete(update);
    }

    modules.articleNavigation = {
        name: 'article-navigation',
        init: initArticleNavigation,
    };
})(window);
