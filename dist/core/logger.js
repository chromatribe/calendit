const LEVEL_PRIORITY = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
let currentLevel = process.env.DEBUG === "calendit" ? "debug" : "info";
export function setLogLevel(level) {
    currentLevel = level;
}
function shouldLog(level) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}
function emit(level, ...args) {
    if (!shouldLog(level))
        return;
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") {
        console.error(prefix, ...args);
        return;
    }
    if (level === "warn") {
        console.warn(prefix, ...args);
        return;
    }
    console.log(prefix, ...args);
}
export const logger = {
    debug: (...args) => emit("debug", ...args),
    info: (...args) => emit("info", ...args),
    warn: (...args) => emit("warn", ...args),
    error: (...args) => emit("error", ...args),
};
