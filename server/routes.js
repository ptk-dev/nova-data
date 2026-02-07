export function registerRoutes(app, routes) {
    const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'all'];

    function registerNestedRoutes(basePath, routeObj) {
        for (const [key, value] of Object.entries(routeObj)) {
            const currentPath = `${basePath}/${key}`.replace(/\/+/g, '/');

            // If it's a function or array, treat as GET by default
            if (typeof value === 'function' || Array.isArray(value)) {
                const handlers = Array.isArray(value) ? value : [value];
                app.get(currentPath, ...wrapHandlers(currentPath, 'get', handlers));
                continue;
            }

            if (typeof value === 'object' && value !== null) {
                // First register any valid HTTP methods directly on this object
                for (const method of METHODS) {
                    if (value[method]) {
                        const handlers = Array.isArray(value[method]) ? value[method] : [value[method]];
                        app[method](currentPath, ...wrapHandlers(currentPath, method, handlers));
                    }
                }

                // Then check if any other keys (that are not HTTP methods) exist and recurse into them
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (!METHODS.includes(subKey)) {
                        registerNestedRoutes(currentPath, { [subKey]: subValue });
                    }
                }
            }
        }
    }

    function wrapHandlers(path, method, handlers) {
        return handlers.map((fn, idx) => {
            const isLast = idx === handlers.length - 1;
            return async (req, res, next) => {
                try {
                    await fn(req, res, next);
                } catch (error) {
                    console.error(`Error in ${method.toUpperCase()} ${path}:`, error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            };
        });
    }

    registerNestedRoutes('', routes);

    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });
}
