(function (root) {
    'use strict';

    const Aether = root.Aether;
    const text = Aether.searchText;
    function toArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean).map(String);
        return value ? [String(value)] : [];
    }

    function groupResults(rawResults) {
        const groups = new Map();
        (rawResults || []).forEach(result => {
            const item = result.item || {};
            const key = item.pageId || item.uri;
            if (!key) return;
            const group = groups.get(key) || { item, best: result, count: 0 };
            group.count += 1;
            const resultScore = result.score === undefined ? 1 : result.score;
            const bestScore = group.best && group.best.score === undefined ? 1 : group.best.score;
            if (!group.best || resultScore < bestScore) group.best = result;
            groups.set(key, group);
        });
        return Array.from(groups.values()).sort((left, right) => {
            const leftScore = left.best && left.best.score === undefined ? 1 : left.best.score;
            const rightScore = right.best && right.best.score === undefined ? 1 : right.best.score;
            return leftScore - rightScore;
        });
    }

    function buildURL(item, query) {
        const source = item.uri || item.pageId || '/';
        try {
            const url = new URL(source, root.location.origin);
            if (query) url.searchParams.set('search', query);
            if (item.anchor) url.hash = item.anchor;
            return url.origin === root.location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
        } catch (error) {
            const separator = source.includes('?') ? '&' : '?';
            const hash = item.anchor ? `#${encodeURIComponent(item.anchor)}` : '';
            return `${source}${query ? `${separator}search=${encodeURIComponent(query)}` : ''}${hash}`;
        }
    }

    function taxonomy(item) {
        return toArray(item.categories).concat(toArray(item.series), toArray(item.tags)).slice(0, 2).join(' › ');
    }

    function createResultElement(group, query, index, labels) {
        const item = group.item || {};
        const best = group.best || {};
        const matches = best.matches || [];
        const titleMatch = matches.find(match => match.key === 'title');
        const headingMatch = matches.find(match => match.key === 'heading');
        const title = item.title || item.uri || '';
        const heading = item.heading && item.heading !== labels.introHeading ? item.heading : '';
        const taxonomyLabel = taxonomy(item);
        const snippet = text.createSnippet(item.text, matches, query, labels.snippetLength);
        const link = document.createElement('a');
        link.className = 'search-result';
        link.href = buildURL(item, query);
        link.dataset.searchResultIndex = String(index);
        link.setAttribute('role', 'option');
        link.innerHTML = `
            <span class="search-result-header">
                <span class="search-result-title">${text.highlightText(title, titleMatch && titleMatch.indices)}</span>
                ${item.date ? `<time class="search-result-date" datetime="${text.escapeHTML(item.date)}">${text.escapeHTML(item.date.slice(0, 7))}</time>` : ''}
            </span>
            <span class="search-result-meta">${text.escapeHTML(taxonomyLabel)}${taxonomyLabel && heading ? ' › ' : ''}${text.highlightText(heading, headingMatch && headingMatch.indices)}</span>
            <span class="search-result-snippet">${snippet.html}</span>
            ${group.count > 1 ? `<span class="search-result-more">${text.escapeHTML(labels.moreMatches.replace('%d', String(group.count - 1)))}</span>` : ''}
        `;
        return link;
    }

    function render(container, status, rawResults, query, options) {
        const labels = options.labels;
        const groups = groupResults(rawResults).slice(0, options.maxResults);
        container.replaceChildren();
        container.setAttribute('role', 'listbox');
        container.setAttribute('aria-label', labels.resultsLabel);
        if (!query) {
            status.textContent = '';
            container.removeAttribute('data-has-results');
            return groups;
        }
        status.textContent = groups.length ? labels.resultCount.replace('%d', String(groups.length)) : labels.noResults;
        if (!groups.length) {
            const empty = document.createElement('p');
            empty.className = 'search-dialog-empty';
            empty.textContent = `${labels.noResults}，${labels.noResultsHint}`;
            container.appendChild(empty);
            container.removeAttribute('data-has-results');
            return groups;
        }
        groups.forEach((group, index) => container.appendChild(createResultElement(group, query, index, labels)));
        container.dataset.hasResults = 'true';
        return groups;
    }

    function setActive(container, index) {
        const links = Array.from(container.querySelectorAll('.search-result'));
        links.forEach((link, linkIndex) => {
            const active = linkIndex === index;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-selected', 'true');
            else link.removeAttribute('aria-selected');
        });
        if (index >= 0 && links[index]) links[index].scrollIntoView({ block: 'nearest' });
    }

    Aether.searchResults = { render, groupResults, setActive };
})(window);
