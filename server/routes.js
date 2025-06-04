export function registerRoutes(app, routes) {
    function registerNestedRoutes(basePath, routeObj) {
        for (const [key, value] of Object.entries(routeObj)) {

            if (typeof value === 'function' || Array.isArray(value)) {
                // Handle direct function or array of middleware/handlers
                const handlers = Array.isArray(value) ? value : [value];
                app.get(`${basePath}/${key}`, ...handlers);
            } else if (typeof value === 'object' && value !== null) {
                const methods = ['get', 'post', 'put', 'delete', 'patch', 'all'];
                const hasMethod = methods.some(method => typeof value[method] === 'function' || Array.isArray(value[method]));

                if (hasMethod) {
                    for (const method of methods) {
                        if (typeof value[method] === 'function' || Array.isArray(value[method])) {
                            const handlers = Array.isArray(value[method]) ? value[method] : [value[method]];
                            app[method](`${basePath}/${key}`, ...handlers.map(fn => {
                                // Wrap only the last handler for error catching
                                if (fn === handlers[handlers.length - 1]) {
                                    return (req, res, next) => {
                                        try {
                                            fn(req, res, next);
                                        } catch (error) {
                                            console.error(`Error handling route ${basePath}/${key} [${method.toUpperCase()}]:`, error);
                                            res.status(500).send({ error: 'Internal Server Error' });
                                        }
                                    };
                                }
                                return fn;
                            }));
                        }
                    }
                } else {
                    registerNestedRoutes(`${basePath}/${key}`, value);
                }
            }
        }
    }

    registerNestedRoutes('', routes);

    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });
}