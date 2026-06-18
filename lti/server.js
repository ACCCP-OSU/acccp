import { Provider } from "ltijs";
// Asserts that all env vars properly load when initializing the server.
function loadEnv(cfg) {
    for (const [key, value] of Object.entries(cfg)) {
        if (!value)
            throw new Error(`Missing env var ${key}`);
    }
    return cfg;
}
const cfg = loadEnv({
    key: process.env.LTI_KEY,
    port: process.env.LTI_SERVER_PORT,
    url: process.env.DB_URL,
    user: process.env.DB_CONNECTION_USER,
    password: process.env.DB_CONNECTION_PASSWORD,
    clientId: process.env.LTI_CLIENT_ID,
});
// NOTE: Enable cookies in prod.
Provider.setup(cfg.key, {
    url: cfg.url,
    connection: { user: cfg.user, pass: cfg.password },
}, { appRoute: "/", cookies: { secure: false, sameSite: "" }, devMode: true });
Provider.onConnect((token, req, res) => {
    console.log(token);
    return res.redirect("http://localhost:3001");
});
await Provider.deploy({ port: parseInt(cfg.port) || 3002 });
await Provider.registerPlatform({
    url: "http://localhost:3000",
    name: "Canvas",
    clientId: cfg.clientId,
    authenticationEndpoint: "http://localhost:3000/api/lti/authorize_redirect",
    accesstokenEndpoint: "http://localhost:3000/login/oauth2/token",
    authConfig: {
        method: "JWK_SET",
        key: "http://localhost:3000/api/lti/security/jwks",
    },
});
