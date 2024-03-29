const superagent = require(`superagent`);
const { api } = require(`../../core/config`);
const login = require(`../../core/login`);
const loginMiddleware = require(`../../core/middleware/login`);
const getRelease = require(`../../core/mod/getRelease`)

module.exports = [
    {
        name: `loginByKey`,
        method: `get`,
        endpoint: `/internal/ui/login`,
        handle: ({ app }, req, res) => {
            const { id, key } = req.universalCookies.get(`auth`) || {};

            login(id, key).then(user => {
                res.send(user);
            }).catch(e => {
                res.status(401).send(e);
            })
        },
    },
    {
        name: `updateUser`,
        method: `post`,
        endpoint: `/internal/updateUser`,
        middleware: [loginMiddleware()],
        handle: ({ app }, req, res) => {
            const { gameID } = req.user

            console.debug(`Updating user ${gameID} with body length of ${req.body && JSON.stringify(req.body).length || `(none, where the fuck is the body)`}`);

            const body = {};
        
            if(typeof req.body.username == `string`) {
                if(req.body.username.length <= 32 && req.body.username.length >= 2) {
                    body.username = req.body.username;
                } else {
                    return res.status(400).send({ error: `Username must be between 2 and 32 characters.` });
                }
            };
    
            if(typeof req.body.description == `string`) {
                if(req.body.description.length <= 512) {
                    body.description = req.body.description;
                } else {
                    return res.status(400).send({ error: `Description must be less than 512 characters.` });
                }
            };
    
            if(req.body.avatar) body.avatar = req.body.avatar;

            if(!Object.keys(req.body).length) {
                console.debug(`No body provided`);
                res.send({ error: `No body provided` });
            } else {
                superagent.post(`${api.bpApiLocation}/user/${gameID}/update`).set(`Authorization`, api.bpApi).send(body).then(r => {
                    console.debug(`User updated:`, r.text);
                    res.send({ success: true });
                }).catch(e => {
                    console.error(`Error updating user:`, e);
                    res.send({ error: `Error updating user: ${e}` });
                });
            }
        }
    },
    {
        name: `downloads`,
        method: `get`,
        endpoint: `/internal/downloads`,
        handle: async ({ app }, req, res) => {
            const promises = {
                pc: getRelease(`BloqParty-PC`, false),
                quest: getRelease(`BloqParty-Quest`, false),
            };

            const releases = await Promise.all(Object.values(promises));

            res.send(Object.fromEntries(Object.entries(promises).map(([k, v], i) => [k, releases[i]?.tag_name]).filter(([k, v]) => Boolean(v))));
        }
    }
]