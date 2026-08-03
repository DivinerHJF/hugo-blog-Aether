(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const activeExplorers = new WeakMap();

    modules.tagExplorer = {
        name: 'tag-explorer',
        selector: '.tag-explorer',
        init(context) {
            const explorer = context.root.querySelector('.tag-explorer');
            if (!explorer) return Aether.utils.noop;
            if (activeExplorers.has(explorer)) return Aether.utils.noop;

            const controls = explorer.querySelector('.tag-explorer-controls');
            const searchInput = explorer.querySelector('[data-tag-search]');
            const cards = Array.from(explorer.querySelectorAll('[data-tag-card]'));
            const filters = Array.from(explorer.querySelectorAll('[data-tag-filter]'));
            const resultCount = explorer.querySelector('[data-tag-result-count]');
            const empty = explorer.querySelector('[data-tag-empty]');
            let activeFilter = 'all';

            if (!controls || !searchInput || filters.length === 0 || cards.length === 0) {
                return Aether.utils.noop;
            }

            const normalize = value => (value || '').trim().toLocaleLowerCase();
            const matchesFilter = card => {
                return activeFilter === 'all' || card.dataset.tagCategory === activeFilter;
            };
            const update = () => {
                const query = normalize(searchInput.value);
                let visibleCount = 0;
                cards.forEach(card => {
                    const matched = matchesFilter(card) && normalize(card.dataset.tagName).includes(query);
                    card.hidden = !matched;
                    if (matched) visibleCount += 1;
                });
                if (resultCount) resultCount.textContent = visibleCount;
                if (empty) empty.hidden = visibleCount !== 0;
            };

            context.listen(searchInput, 'input', update);
            filters.forEach(filter => {
                context.listen(filter, 'click', () => {
                    activeFilter = filter.dataset.tagFilter || 'all';
                    filters.forEach(item => item.classList.toggle('active', item === filter));
                    update();
                });
            });

            searchInput.disabled = false;
            filters.forEach(filter => { filter.disabled = false; });
            controls.dataset.enhanced = 'true';
            controls.setAttribute('aria-disabled', 'false');
            explorer.classList.add('tag-explorer--ready');
            activeExplorers.set(explorer, true);
            update();

            return () => {
                explorer.classList.remove('tag-explorer--ready');
                delete controls.dataset.enhanced;
                controls.setAttribute('aria-disabled', 'true');
                activeExplorers.delete(explorer);
            };
        },
    };
})(window);
