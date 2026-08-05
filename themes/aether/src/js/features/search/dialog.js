(function (root) {
    'use strict';

    const Aether = root.Aether;
    const utils = Aether.utils;
    const noop = utils.noop;

    function readStoredState() {
        if (Aether.searchDialogState) return Aether.searchDialogState;
        try {
            const stored = root.sessionStorage && root.sessionStorage.getItem('aether-search-state');
            if (stored) Aether.searchDialogState = JSON.parse(stored);
        } catch (error) {
            Aether.searchDialogState = null;
        }
        return Aether.searchDialogState || { query: '', selectedIndex: -1, scrollTop: 0 };
    }

    function createSearchDialog(context, engine) {
        const dialog = document.getElementById('search-dialog');
        if (!dialog || !engine || !Aether.searchResults) return noop;
        const input = dialog.querySelector('#search-dialog-input');
        const results = dialog.querySelector('#search-dialog-results');
        const status = dialog.querySelector('#search-dialog-status');
        const loading = dialog.querySelector('[data-search-loading]');
        const triggers = Array.from(document.querySelectorAll('[data-search-open]'));
        if (!input || !results || !status) return noop;

        const labels = {
            noResults: dialog.dataset.searchNoResults || '没有找到相关内容',
            noResultsHint: dialog.dataset.searchNoResultsHint || '试试更短的词或标签',
            resultCount: dialog.dataset.searchResultCount || '找到 %d 条结果',
            resultsLabel: dialog.dataset.searchResultsLabel || '搜索结果',
            moreMatches: dialog.dataset.searchMoreMatches || '另有 %d 处匹配',
            introHeading: dialog.dataset.searchIntroHeading || '文章开头',
            unavailable: dialog.dataset.searchUnavailable || '搜索暂时不可用',
            snippetLength: 140,
        };
        const state = readStoredState();
        let activeIndex = Number(state.selectedIndex) >= 0 ? Number(state.selectedIndex) : -1;
        let previousFocus = null;
        let debounceTimer = null;
        let loadingTimer = null;
        let requestVersion = 0;

        function isOpen() {
            return !dialog.hidden;
        }

        function saveState() {
            state.query = input.value || '';
            state.selectedIndex = activeIndex;
            state.scrollTop = results.scrollTop;
            Aether.searchDialogState = state;
            try {
                if (root.sessionStorage) root.sessionStorage.setItem('aether-search-state', JSON.stringify(state));
            } catch (error) {
                // Storage can be disabled in private browsing; the in-memory state still works.
            }
        }

        function setLoading(value) {
            dialog.classList.toggle('is-loading', value);
            if (loading) loading.hidden = !value;
        }

        function render(rawResults, query) {
            const groups = Aether.searchResults.render(results, status, rawResults, query, {
                maxResults: engine.config.maxResults,
                labels,
            });
            if (activeIndex >= groups.length) activeIndex = -1;
            Aether.searchResults.setActive(results, activeIndex);
            if (state.scrollTop) results.scrollTop = state.scrollTop;
        }

        function searchNow() {
            const query = input.value.trim();
            const version = ++requestVersion;
            state.query = input.value;
            if (!query || query.length < engine.config.minQueryLength) {
                activeIndex = -1;
                render([], '');
                setLoading(false);
                return;
            }

            setLoading(false);
            if (loadingTimer) root.clearTimeout(loadingTimer);
            loadingTimer = root.setTimeout(() => {
                if (version === requestVersion) setLoading(true);
            }, 150);
            engine.search(query).then(rawResults => {
                if (version !== requestVersion) return;
                if (loadingTimer) root.clearTimeout(loadingTimer);
                loadingTimer = null;
                setLoading(false);
                render(rawResults, query);
            }).catch(() => {
                if (version !== requestVersion) return;
                if (loadingTimer) root.clearTimeout(loadingTimer);
                loadingTimer = null;
                setLoading(false);
                activeIndex = -1;
                results.replaceChildren();
                status.textContent = labels.unavailable;
            });
        }

        function scheduleSearch() {
            if (debounceTimer) root.clearTimeout(debounceTimer);
            debounceTimer = root.setTimeout(() => {
                debounceTimer = null;
                searchNow();
            }, engine.config.debounce);
        }

        function close(options) {
            const restoreFocus = !options || options.restoreFocus !== false;
            saveState();
            dialog.hidden = true;
            dialog.setAttribute('aria-hidden', 'true');
            triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
            document.body.classList.remove('search-open');
            setLoading(false);
            if (restoreFocus) {
                const target = previousFocus && previousFocus.isConnected ? previousFocus : triggers[0];
                if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
            }
            previousFocus = null;
        }

        function open(trigger) {
            previousFocus = trigger || document.activeElement;
            dialog.hidden = false;
            dialog.setAttribute('aria-hidden', 'false');
            triggers.forEach(item => item.setAttribute('aria-expanded', 'true'));
            document.body.classList.add('search-open');
            const mobileMenu = document.getElementById('menu-mobile');
            const mobileToggle = document.getElementById('menu-toggle-mobile');
            if (mobileMenu) mobileMenu.classList.remove('active');
            if (mobileToggle) mobileToggle.classList.remove('active');
            engine.preload().catch(noop);
            if (!input.value && state.query) input.value = state.query;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
            if (input.value) searchNow();
        }

        function moveSelection(direction) {
            const links = Array.from(results.querySelectorAll('.search-result'));
            if (!links.length) return;
            if (activeIndex < 0) activeIndex = direction > 0 ? 0 : links.length - 1;
            else activeIndex = (activeIndex + direction + links.length) % links.length;
            Aether.searchResults.setActive(results, activeIndex);
            saveState();
        }

        function onDocumentKeydown(event) {
            const modifier = event.ctrlKey || event.metaKey;
            if (modifier && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                if (isOpen()) input.focus();
                else open(document.activeElement);
                return;
            }
            if (!isOpen()) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                close();
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveSelection(1);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveSelection(-1);
            } else if (event.key === 'Enter' && activeIndex >= 0) {
                const link = results.querySelector(`[data-search-result-index="${activeIndex}"]`);
                if (link) {
                    event.preventDefault();
                    saveState();
                    link.click();
                }
            }
        }

        function onDialogClick(event) {
            const target = event.target.closest('[data-search-close]');
            if (target) {
                event.preventDefault();
                close();
                return;
            }
            const clear = event.target.closest('[data-search-clear]');
            if (clear) {
                event.preventDefault();
                input.value = '';
                activeIndex = -1;
                requestVersion += 1;
                render([], '');
                input.focus();
                return;
            }
            const result = event.target.closest('.search-result');
            if (result) {
                activeIndex = Number(result.dataset.searchResultIndex);
                saveState();
                close({ restoreFocus: false });
            }
        }

        triggers.forEach(trigger => {
            context.listen(trigger, 'click', event => {
                event.preventDefault();
                if (isOpen()) close();
                else open(trigger);
            });
            context.listen(trigger, 'mouseenter', () => engine.preload().catch(noop));
            context.listen(trigger, 'touchstart', () => engine.preload().catch(noop), { passive: true });
            context.listen(trigger, 'focus', () => engine.preload().catch(noop));
            trigger.setAttribute('aria-expanded', 'false');
        });
        context.listen(input, 'focus', () => engine.preload().catch(noop));
        context.listen(input, 'input', scheduleSearch);
        context.listen(dialog, 'click', onDialogClick);
        context.listen(document, 'keydown', onDocumentKeydown);

        const closeForPjax = () => close({ restoreFocus: false });
        context.events.pjaxSend.add(closeForPjax);
        engine.scheduleWarmup();

        if (state.query && !input.value) input.value = state.query;
        render([], '');
        return () => {
            saveState();
            context.events.pjaxSend.delete(closeForPjax);
            if (debounceTimer) root.clearTimeout(debounceTimer);
            if (loadingTimer) root.clearTimeout(loadingTimer);
            if (isOpen()) close({ restoreFocus: false });
        };
    }

    Aether.createSearchDialog = createSearchDialog;
})(window);
