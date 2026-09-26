import { app } from "./app.ts";

const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const port = Number.isNaN(parsedPort) ? 3003 : parsedPort;

const server = app.listen(port, () => {
  console.log(`Task API listening on http://127.0.0.1:${port}`);
});

export { server };
