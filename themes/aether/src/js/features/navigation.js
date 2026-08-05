(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const forEach = utils.forEach;

    function initMenuMobile(context) {
        const toggle = document.getElementById('menu-toggle-mobile');
        const menu = document.getElementById('menu-mobile');
        if (!toggle || !menu) return utils.noop;
        const onClick = () => {
            document.body.classList.toggle('blur');
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
        };
        const close = () => {
            toggle.classList.remove('active');
            menu.classList.remove('active');
        };
        context.listen(toggle, 'click', onClick);
        context.events.mask.add(close);
        return () => context.events.mask.delete(close);
    }

    function emitTheme(context, theme) {
        document.body.setAttribute('theme', theme);
        if (root.localStorage) root.localStorage.setItem('theme', theme);
        context.state.isDark = theme !== 'light';
        context.emit(context.events.theme);
    }

    function initSwitchTheme(context) {
        forEach(document.getElementsByClassName('theme-switch'), themeSwitch => {
            context.listen(themeSwitch, 'click', () => {
                const currentTheme = document.body.getAttribute('theme');
                emitTheme(context, currentTheme === 'dark' ? 'black' : (currentTheme === 'black' ? 'light' : 'dark'));
            });
        });
        return utils.noop;
    }

    function initSelectTheme(context) {
        forEach(document.getElementsByClassName('color-theme-select'), select => {
            const currentTheme = document.body.getAttribute('theme');
            Array.from(select.options || []).some((option, index) => {
                if (option.value === currentTheme) {
                    select.selectedIndex = index;
                    return true;
                }
                return false;
            });
            context.listen(select, 'change', () => {
                let theme = select.value;
                if (theme === 'auto') {
                    theme = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                emitTheme(context, theme);
            });
        });
        return utils.noop;
    }

    function initMeta(context) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return utils.noop;
        const update = () => {
            const theme = document.body.getAttribute('theme') || 'light';
            const color = meta.getAttribute(`data-theme-${theme}`) || meta.getAttribute('data-theme-light');
            if (color) meta.content = color;
        };
        context.events.theme.add(update);
        update();
        return () => context.events.theme.delete(update);
    }

    function initScroll(context) {
        const headers = [];
        const comments = document.getElementById('comments');
        const viewComments = document.getElementById('view-comments');
        if (document.body.getAttribute('header-desktop') === 'auto') headers.push(document.getElementById('header-desktop'));
        if (document.body.getAttribute('header-mobile') === 'auto') headers.push(document.getElementById('header-mobile'));
        if (viewComments) {
            viewComments.style.display = comments ? 'block' : 'none';
            if (comments) viewComments.href = '#comments';
        }
        const fixedButtons = document.getElementById('fixed-buttons');
        if (!fixedButtons) return utils.noop;
        let oldScrollTop = utils.getScrollTop();
        const handleScroll = () => {
            const newScrollTop = utils.getScrollTop();
            const scroll = newScrollTop - oldScrollTop;
            headers.filter(Boolean).forEach(header => {
                if (scroll > 20) header.classList.add('is-hidden');
                else if (scroll < -20 || newScrollTop <= 20) header.classList.remove('is-hidden');
            });
            if (newScrollTop > 100 && (!utils.isMobileWindow() || scroll < -20)) fixedButtons.classList.add('is-visible');
            else fixedButtons.classList.remove('is-visible');
            context.emit(context.events.scroll);
            oldScrollTop = newScrollTop;
        };
        context.listen(root, 'scroll', handleScroll);
        handleScroll();
        return utils.noop;
    }

    function initResize(context) {
        let timeout = null;
        const handleResize = () => {
            if (timeout) return;
            timeout = root.setTimeout(() => {
                timeout = null;
                context.emit(context.events.resize);
                if (context.state.tocRefresh) context.state.tocRefresh();
            }, 100);
        };
        context.listen(root, 'resize', handleResize);
        return () => { if (timeout) root.clearTimeout(timeout); };
    }

    function initMask(context) {
        const mask = document.getElementById('mask');
        if (!mask) return utils.noop;
        context.listen(mask, 'click', () => {
            context.emit(context.events.mask);
            document.body.classList.remove('blur');
        });
        return utils.noop;
    }

    const features = [
        { name: 'mobile menu', init: initMenuMobile },
        { name: 'theme switcher', init: initSwitchTheme },
        { name: 'theme selector', init: initSelectTheme },
        { name: 'scroll handler', init: initScroll },
        { name: 'resize handler', init: initResize },
        { name: 'click mask', init: initMask },
        { name: 'meta', init: initMeta },
    ];

    modules.navigation = {
        name: 'navigation',
        init(context) {
            features.forEach(feature => utils.safeInit(feature.name, feature.init, context));
            return utils.noop;
        },
    };
})(window);
