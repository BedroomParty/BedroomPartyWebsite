require(`./core/logger`)();

process.on(`uncaughtException`, (err) => console.error(err))
process.on(`unhandledRejection`, (err) => console.error(err))

const fs = require('fs');

const config = require(`./core/config`);
const session = require(`./core/session`);

const express = require('express');
const next = require('next');

const sessionMiddleware = require('express-session');
const cookiesMiddleware = require('universal-cookie-express');
const authMiddleware = require('passport');

(() => new Promise(async res => {
    console.log(`Running in ${session.dev ? `development` : `production`} mode!`);

    if(!session.dev) {
        console.log(`Building pages...`);

        const proc = require(`child_process`).exec(`npm run build`);

        proc.stdout.on(`data`, data => {
            const str = data.toString().trim();
            console.debug(`[BUILD/OUT] ${str.split(`\n`).join(`\n[BUILD/OUT] `)}`);
        });

        proc.stderr.on(`data`, data => {
            const str = data.toString().trim();
            console.error(`[BUILD/ERR] ${str.split(`\n`).join(`\n[BUILD/ERR] `)}`);
        });

        proc.once(`exit`, code => {
            console.log(`Successfully built pages! (code ${code})`);
            res();
        })
    } else res();
}))().then(async() => {
    const app = next({ dev: session.dev });
    
    const handle = app.getRequestHandler();
    
    const static = require(`./core/static`);
    
    console.debug(`Static variables:`, static);
    
    app.prepare().then(() => {
        console.debug('Starting server...');
    
        const server = express();

        server.set('trust proxy', 1)

        server.use(cookiesMiddleware());
        server.use(sessionMiddleware({
            secret: config.api.sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: !session.dev,
                maxAge: 604800000,
            }
        }));
        server.use(authMiddleware.initialize());
        server.use(authMiddleware.session());
    
        const endpoints = fs.readdirSync(`./src/endpoints`).map(file => {
            const module = require(`./src/endpoints/${file}`);

            const map = (o, s) => {
                return {
                    file: s,
                    name: o.name || s.split(`.`).slice(0, -1).join(`.`),
                    render: fs.existsSync(`./src/pages/${s.split(`.`).slice(0, -1).join(`.`)}.jsx`),
                    middleware: o.middleware || [],
                    method: (o.method && typeof server[o.method.toLowerCase()] == `function`) ? o.method.toLowerCase() : `get`,
                    endpoints: !Array.isArray(o.endpoint) ? [o.endpoint] : o.endpoint,
                    handle: o.handle || (() => {})
                };
            }

            if(Array.isArray(module)) {
                return module.map(o => map(o, file));
            } else {
                return map(module, file);
            }
        }).reduce((a,b) => Array.isArray(b) ? a.concat(...b) : a.concat(b), []);
    
        console.debug(`Found ${endpoints.length} (${endpoints.filter(o => o.render).length} react) endpoints! [ ${endpoints.map(o => o.name).join(`, `)} ]`);
    
        for(const endpoint of endpoints) {
            if(endpoint.render) {
                console.debug(`Setting up react endpoint: ${endpoint.name} [ ${endpoint.endpoints.join(`, `)} ]`);
    
                for(const path of endpoint.endpoints) {
                    server[endpoint.method](path, ...endpoint.middleware, (req, res) => {
                        return app.render(req, res, `/${endpoint.name}`, req.query);
                    });
    
                    console.debug(`| Set up react endpoint: "${path}" -> ${endpoint.name}`);
                }
            } else {
                console.debug(`Setting up regular endpoint: ${endpoint.name} [ ${endpoint.endpoints.join(`, `)} ]`);
    
                for(const path of endpoint.endpoints) {
                    server[endpoint.method](path, ...endpoint.middleware, (req, res) => {
                        return endpoint.handle({ app }, req, res);
                    });
    
                    console.debug(`| Set up regular endpoint: "${path}" -> ${endpoint.name}`);
                }
            }
        };
    
        console.debug(`Setting up next handler...`);
    
        server.get('*', (req, res) => {
            return handle(req, res);
        });
    
        console.debug(`Setting up server listener...`);
    
        server.listen(config.port, (err) => {
            if (err) throw err;
            console.log(`> Ready on port ${config.port}`);
        });
    }).catch(console.error)
})