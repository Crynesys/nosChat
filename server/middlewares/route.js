function noop() {}

/**
 * Elaborazione del percorso
 * @param {IO} io istanza del socket koa io
 * @param {Object} routes percorsi
 */
module.exports = function (io, _io, routes) {
    const router = Object.keys(routes).reduce((result, route) => {
        io.on(route, noop);
        result[route] = routes[route];
        return result;
    }, {});
    return async (ctx) => {
        if (router[ctx.event]) {
            const { event, data, socket } = ctx;
            ctx.res = await router[ctx.event]({
                event,
                data,
                socket,
                io,
                _io,
            });
        }
    };
};
