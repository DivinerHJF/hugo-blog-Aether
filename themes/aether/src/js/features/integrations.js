(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const forEach = utils.forEach;

    function initMath(context) {
        if (context.config.math && root.renderMathInElement) root.renderMathInElement(document.body, context.config.math);
        return utils.noop;
    }

    function initMermaid(context) {
        if (!context.config.mermaid || !root.mermaid) return utils.noop;
        const elements = document.getElementsByClassName('mermaid');
        if (!elements.length) return utils.noop;
        root.mermaid.initialize({ startOnLoad: false, theme: 'default' });
        forEach(elements, element => {
            if (element.dataset.aetherReady === 'true') return;
            const source = context.data[element.id];
            if (!source) return;
            root.mermaid.mermaidAPI.render(`svg-${element.id}`, source, svgCode => {
                if (context.destroyed || element.dataset.aetherReady === 'true') return;
                element.insertAdjacentHTML('afterbegin', svgCode);
                const svg = document.getElementById(`svg-${element.id}`);
                if (svg && svg.children[0]) svg.children[0].remove();
                element.dataset.aetherReady = 'true';
            }, element);
        });
        return utils.noop;
    }

    function initEcharts(context) {
        if (!context.config.echarts || !root.echarts) return utils.noop;
        const state = { charts: [] };
        const render = () => {
            state.charts.forEach(chart => chart.dispose());
            state.charts = [];
            forEach(document.getElementsByClassName('echarts'), element => {
                if (!context.data[element.id]) return;
                const chart = root.echarts.init(element, context.state.isDark ? 'dark' : 'macarons', { renderer: 'svg' });
                chart.setOption(JSON.parse(context.data[element.id]));
                state.charts.push(chart);
            });
        };
        const resize = () => state.charts.forEach(chart => chart.resize());
        context.events.theme.add(render);
        context.events.resize.add(resize);
        render();
        return () => {
            context.events.theme.delete(render);
            context.events.resize.delete(resize);
            state.charts.forEach(chart => chart.dispose());
            state.charts = [];
        };
    }

    function initMapbox(context) {
        if (!context.config.mapbox || !root.mapboxgl) return utils.noop;
        root.mapboxgl.accessToken = context.config.mapbox.accessToken;
        if (context.config.mapbox.RTLTextPlugin && root.mapboxgl.setRTLTextPlugin) root.mapboxgl.setRTLTextPlugin(context.config.mapbox.RTLTextPlugin);
        const state = { maps: [] };
        forEach(document.getElementsByClassName('mapbox'), element => {
            const data = context.data[element.id];
            if (!data) return;
            const map = new root.mapboxgl.Map({
                container: element,
                center: [data.lng, data.lat],
                zoom: data.zoom,
                minZoom: .2,
                style: context.state.isDark ? data.darkStyle : data.lightStyle,
                attributionControl: false,
            });
            if (data.marked) new root.mapboxgl.Marker().setLngLat([data.lng, data.lat]).addTo(map);
            if (data.navigation) map.addControl(new root.mapboxgl.NavigationControl(), 'bottom-right');
            if (data.geolocate) map.addControl(new root.mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showUserLocation: true, trackUserLocation: true }), 'bottom-right');
            if (data.scale) map.addControl(new root.mapboxgl.ScaleControl());
            if (data.fullscreen) map.addControl(new root.mapboxgl.FullscreenControl());
            if (root.MapboxLanguage) map.addControl(new root.MapboxLanguage());
            state.maps.push({ map, data });
        });
        const updateTheme = () => state.maps.forEach(({ map, data }) => map.setStyle(context.state.isDark ? data.darkStyle : data.lightStyle));
        context.events.theme.add(updateTheme);
        return () => {
            context.events.theme.delete(updateTheme);
            state.maps.forEach(({ map }) => { if (typeof map.remove === 'function') map.remove(); });
            state.maps = [];
        };
    }

    function initTypeit(context) {
        if (!context.config.typeit || typeof root.TypeIt !== 'function') return utils.noop;
        const config = context.config.typeit;
        const instances = [];
        const timers = [];
        Object.values(config.data || {}).forEach(group => {
            const typeone = index => {
                if (context.destroyed || !group[index]) return;
                const instance = new root.TypeIt(`#${group[index]}`, {
                    strings: context.data[group[index]],
                    speed: config.speed || 100,
                    lifeLike: true,
                    cursorSpeed: config.cursorSpeed || 1000,
                    cursorChar: config.cursorChar || '|',
                    waitUntilVisible: true,
                    afterComplete: () => {
                        if (index === group.length - 1) {
                            if (config.duration >= 0) timers.push(root.setTimeout(() => instance.destroy(), config.duration));
                            return;
                        }
                        instance.destroy();
                        typeone(index + 1);
                    },
                }).go();
                instances.push(instance);
            };
            typeone(0);
        });
        return () => {
            timers.forEach(timer => root.clearTimeout(timer));
            instances.forEach(instance => { if (instance && typeof instance.destroy === 'function') instance.destroy(); });
        };
    }

    function initCookieconsent(context) {
        if (context.config.cookieconsent && root.cookieconsent && typeof root.cookieconsent.initialise === 'function') root.cookieconsent.initialise(context.config.cookieconsent);
        return utils.noop;
    }

    const features = [
        { name: 'math', init: initMath },
        { name: 'Mermaid', init: initMermaid },
        { name: 'ECharts', init: initEcharts },
        { name: 'TypeIt', init: initTypeit },
        { name: 'Mapbox', init: initMapbox },
        { name: 'cookie consent', init: initCookieconsent },
    ];

    modules.integrations = {
        name: 'integrations',
        init(context) {
            features.forEach(feature => utils.safeInit(feature.name, feature.init, context));
            return utils.noop;
        },
    };
})(window);
