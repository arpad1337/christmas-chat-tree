const users = [];
const streams = [];

let nextStreamId = 0;

export default (app) => {
    app.post("/login", (req, res) => {
        const username = req.body.username || req.cookies.username;
        if (username) {
            res.cookie("username", username, { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
            if (users.findIndex(u => u.username === username) === -1) {
                users.push({
                    username,
                    position: users.length,
                });
            }
            refreshUsers();
            res.json({ success: true, user: users.find(u => u.username === username)});
        } else {
            res.json({ success: false });
        }
    });
    app.get("/users", (req, res) => {
        res.json(users);
    });

    app.get("/communication", async(req, res) => {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        });
        const id = nextStreamId;
        streams.push({ res, id });
        nextStreamId++;
        res.write(sse(JSON.stringify({
            type: "connected"
        })));
        req.on("close", () => {
            streams.splice(streams.findIndex(stream => stream.id === id), 1);
        });
    });

    const refreshUsers = () => {
        streams.forEach(stream => {
            stream.res.write(sse(JSON.stringify({
                type: "users",
                users,
            })));
        });
    };
};

const sse = (message) => {
    return `data: ${ message }\n\n`;
};
