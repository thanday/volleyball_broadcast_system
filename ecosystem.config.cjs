module.exports = {
    apps: [
      {
        name: "volleyball-server",
        script: "server.js",
        env: {
          NODE_ENV: "production",
        },
        max_memory_restart: "1G",
        watch: ["server.js"],
      },
      {
        name: "volleyball-client",
        script: "npm",
        args: "run dev -- --host",
        env: {
          NODE_ENV: "development",
        },
      }
    ],
  };