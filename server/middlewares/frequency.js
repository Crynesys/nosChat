const MaxCallPerMinutes = 60;
/**
 * Limiting the frequency of interface calls
 */
module.exports = function () {
    let callTimes = {};
    setInterval(() => callTimes = {}, 60000); // Emptying every 60 seconds

    return async (ctx, next) => {
        const socketId = ctx.socket.id;
        const count = callTimes[socketId] || 0;
        if (count >= MaxCallPerMinutes) {
            return ctx.res = 'Frequenti chiamate di interfaccia';
        }
        callTimes[socketId] = count + 1;
        await next();
    };
};
