(function (root) {
    'use strict';

    const Aether = root.Aether;
    const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const fieldPriority = ['title', 'heading', 'tags', 'categories', 'series', 'text'];

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, character => escapeMap[character]);
    }

    function normalizeRanges(ranges, length) {
        return (Array.isArray(ranges) ? ranges : [])
            .map(range => [Math.max(0, Number(range[0]) || 0), Math.min(length - 1, Number(range[1]) || 0)])
            .filter(range => range[1] >= range[0])
            .sort((left, right) => left[0] - right[0])
            .reduce((merged, range) => {
                const previous = merged[merged.length - 1];
                if (previous && range[0] <= previous[1] + 1) previous[1] = Math.max(previous[1], range[1]);
                else merged.push(range);
                return merged;
            }, []);
    }

    function highlightText(value, ranges, className) {
        const text = String(value == null ? '' : value);
        const normalized = normalizeRanges(ranges, text.length);
        if (!normalized.length) return escapeHTML(text);
        let output = '';
        let cursor = 0;
        normalized.forEach(range => {
            output += escapeHTML(text.slice(cursor, range[0]));
            output += `<mark${className ? ` class="${className}"` : ''}>${escapeHTML(text.slice(range[0], range[1] + 1))}</mark>`;
            cursor = range[1] + 1;
        });
        return output + escapeHTML(text.slice(cursor));
    }

    function findMatch(matches, preferredKey) {
        const candidates = (matches || []).filter(match => match && Array.isArray(match.indices) && match.indices.length);
        if (!candidates.length) return null;
        const preferred = candidates.filter(match => match.key === preferredKey);
        const pool = preferred.length ? preferred : candidates;
        return pool.sort((left, right) => {
            const leftPriority = fieldPriority.indexOf(left.key);
            const rightPriority = fieldPriority.indexOf(right.key);
            return (leftPriority < 0 ? fieldPriority.length : leftPriority) - (rightPriority < 0 ? fieldPriority.length : rightPriority);
        })[0];
    }

    function findQueryRange(text, query) {
        const source = String(text || '');
        const needle = String(query || '').trim();
        if (!source || !needle) return null;
        const index = source.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
        return index < 0 ? null : [index, index + needle.length - 1];
    }

    function createSnippet(text, matches, query, maxLength) {
        const source = String(text || '').replace(/[\n\t ]+/g, ' ').trim();
        if (!source) return { html: '', match: null };
        const match = findMatch(matches, 'text');
        const fallback = findQueryRange(source, query);
        const matchRange = match && match.indices && match.indices[0] ? match.indices[0] : fallback;
        if (!matchRange) {
            const fallbackText = source.length > maxLength ? `${source.slice(0, maxLength)}…` : source;
            return { html: escapeHTML(fallbackText), match: null };
        }

        const contextLength = Math.max(80, Number(maxLength) || 140);
        let start = Math.max(0, matchRange[0] - Math.floor(contextLength * .42));
        let end = Math.min(source.length, start + contextLength);
        start = Math.max(0, end - contextLength);

        const leftSentence = Math.max(source.lastIndexOf('。', matchRange[0] - 1), source.lastIndexOf('！', matchRange[0] - 1), source.lastIndexOf('？', matchRange[0] - 1), source.lastIndexOf('.', matchRange[0] - 1));
        if (leftSentence >= start && leftSentence + 1 < matchRange[0]) start = leftSentence + 1;
        const rightSentence = [
            source.indexOf('。', matchRange[1] + 1),
            source.indexOf('！', matchRange[1] + 1),
            source.indexOf('？', matchRange[1] + 1),
            source.indexOf('.', matchRange[1] + 1),
        ].filter(index => index >= 0).sort((left, right) => left - right)[0];
        if (rightSentence !== undefined && rightSentence + 1 <= end + 24) end = Math.min(source.length, rightSentence + 1);

        const ranges = (match && match.indices ? match.indices : [matchRange])
            .map(range => [Math.max(0, range[0] - start), Math.min(end - start - 1, range[1] - start)])
            .filter(range => range[1] >= range[0]);
        const prefix = start > 0 ? '…' : '';
        const suffix = end < source.length ? '…' : '';
        return { html: `${prefix}${highlightText(source.slice(start, end), ranges)}${suffix}`, match: matchRange };
    }

    function markTextNodes(nodes, query) {
        const needle = String(query || '').trim();
        if (!needle) return null;
        for (const node of nodes || []) {
            if (!node || !node.parentNode || !node.nodeValue) continue;
            const range = findQueryRange(node.nodeValue, needle);
            if (!range) continue;
            const mark = document.createElement('mark');
            mark.className = 'search-arrival-hit';
            const tail = node.splitText(range[0]);
            const remainder = tail.splitText(range[1] - range[0] + 1);
            mark.textContent = tail.nodeValue;
            tail.parentNode.replaceChild(mark, tail);
            return mark;
        }
        return null;
    }

    Aether.searchText = {
        escapeHTML,
        highlightText,
        findMatch,
        findQueryRange,
        createSnippet,
        markTextNodes,
    };
})(window);
