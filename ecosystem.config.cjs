module.exports = {
    apps: [
      {
        name: "volleyball-app",
        script: "server.js",
        env: {
          NODE_ENV: "production",
        },
        watch: false,
        max_memory_restart: "1G",
      }
    ],
  };
  