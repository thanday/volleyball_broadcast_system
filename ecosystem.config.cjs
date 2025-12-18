module.exports = {
    apps: [
      {
        name: "volleyball-server",
        script: "./server.js",
        env: {
          NODE_ENV: "production",
        },
        // Restarts if it uses too much memory
        max_memory_restart: "1G",
        // Watch for changes in the server file to restart automatically
        watch: ["./server/server.js"],
      },
      {
        name: "volleyball-client",
        script: "npm",
        args: "run dev",
        cwd: "./volleyball-broadcast", 
        env: {
          NODE_ENV: "development",
        },
      }
    ],
  };