const onesignalAppId = require('../common/onesignalAppId');
const axios = require('axios');

const users = [];
const streams = [];

let nextStreamId = 0;

let nextMessageId = 0;

export default (app) => {
    app.post("/login", (req, res) => {
        const username = req.body.username || req.cookies.username;
        if (username) {
            res.cookie("username", username, { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
            if (users.findIndex(u => u && u.username === username) === -1) {
                let newIndex = users.findIndex(u => u === null);
                if (newIndex === -1) newIndex = users.length;
                users[newIndex] = {
                    username,
                };
            }
            refreshUsers();
            res.json({ success: true, user: users.find(u => u && u.username === username)});
        } else {
            res.json({ success: false });
        }
    });

    app.post("/logout", (req, res) => {
        const { username } = req.cookies;
        const userIndex = users.findIndex(u => u && u.username === username);
        if (userIndex > -1) {
            users[userIndex] = null;
            refreshUsers();
        }
        res.clearCookie("username");
        res.end();
    });

    // only for server-side rendering
    app.get("/users", (req, res) => {
        res.json(users);
    });

    // TASK 2: communication
    // TASK 2C: broadcasting messages
    const sendMessage = data => {
        streams.forEach(stream => {
            stream.res.write(sse(JSON.stringify({
                type: 'message',
                data
            })));
        });
    };

    app.post("/send-message", (req, res) => {
        const { username } = req.cookies;
        if (!username) return res.end();
        const user = users.find(u => u && u.username === username);
        if (!user) return res.end();
        const { message } = req.body;
        nextMessageId++;
        sendMessage({
            user,
            message,
            id: nextMessageId,
            expiresIn: 1000 + message.length * 100,
        });
        if (process.env.NODE_ENV === 'production') {
            axios.post("https://onesignal.com/api/v1/notifications", {
                app_id: onesignalAppId,
                contents: {"en": message},
                included_segments: ["All"]
            }, {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
            });
        }
        res.end();
    });


    // TASK 2A: connect client to server
    app.get("/communication", async(req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Content-Type", "text/event-stream");
        res.status(200);
        const id = nextStreamId;
        streams.push({
            id,
            res
        });
        nextStreamId++;
        res.write(sse(JSON.stringify({
            type: "connected"
        })))
        req.on("close", () => {
            streams.splice(streams.findIndex(stream => stream.id === id), 1);
        });
    });

    // TASK 2B: resfreshing userlist
    const refreshUsers = () => {
        streams.forEach(stream => {
            stream.res.write(sse(JSON.stringify({
                type: 'users',
                data: users
            })));
        });
    };
};

const sse = (message) => {
    return `data: ${ message }\n\n`;
};
