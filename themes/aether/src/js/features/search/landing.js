(function (root) {
    'use strict';

    const Aether = root.Aether;
    const noop = Aether.utils.noop;

    function headingLevel(element) {
        return element && /^H[1-6]$/.test(element.tagName) ? Number(element.tagName.slice(1)) : 7;
    }

    function collectTextNodes(heading) {
        const nodes = [];
        const level = headingLevel(heading);

        function visit(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                nodes.push(node);
                return false;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const childLevel = headingLevel(node);
            if (childLevel <= level) return true;
            for (const child of Array.from(node.childNodes)) {
                if (visit(child)) return true;
            }
            return false;
        }

        if (heading) {
            Array.from(heading.childNodes).forEach(child => visit(child));
        }
        let sibling = heading && heading.nextSibling;
        while (sibling) {
            if (visit(sibling)) break;
            sibling = sibling.nextSibling;
        }
        return nodes.filter(Boolean);
    }

    function collectAllTextNodes(scope) {
        if (!scope) return [];
        const nodes = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            nodes.push(node);
            node = walker.nextNode();
        }
        return nodes;
    }

    function cleanSearchQuery() {
        try {
            const url = new URL(root.location.href);
            url.searchParams.delete('search');
            root.history.replaceState(root.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            // A malformed URL should not prevent the heading fallback.
        }
    }

    function initLanding(context) {
        const params = new URLSearchParams(root.location.search);
        const query = (params.get('search') || '').trim();
        const anchor = decodeURIComponent((root.location.hash || '').slice(1));
        if (!query && !anchor) return noop;

        let marker = null;
        let timer = null;
        const clearMarker = () => {
            if (marker && marker.parentNode) marker.parentNode.replaceChild(document.createTextNode(marker.textContent), marker);
            marker = null;
            if (timer) root.clearTimeout(timer);
        };
        const run = () => {
            const heading = anchor ? document.getElementById(anchor) : null;
            if (query && Aether.searchText) {
                const nodes = heading ? collectTextNodes(heading) : collectAllTextNodes(document.querySelector('main .content') || document.querySelector('main'));
                marker = Aether.searchText.markTextNodes(nodes, query);
            }
            const target = marker || heading;
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (marker) {
                timer = root.setTimeout(() => {
                    clearMarker();
                }, 10000);
            }
            if (query) cleanSearchQuery();
        };

        const frame = typeof root.requestAnimationFrame === 'function' ? root.requestAnimationFrame(run) : root.setTimeout(run, 0);
        context.addCleanup(() => {
            if (typeof root.cancelAnimationFrame === 'function' && typeof frame === 'number') root.cancelAnimationFrame(frame);
            else root.clearTimeout(frame);
            if (timer) root.clearTimeout(timer);
        });
        return noop;
    }

    Aether.initSearchLanding = initLanding;
})(window);
