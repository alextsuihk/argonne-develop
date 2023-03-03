module.exports = {
  app: [
    {
      // dedicated runner for rabbitMQ consumer
      name: 'jobRunner',
      script: './packages/app-service/dist/server.js',
      instances: 1,
      node_args: '--max_old_space_size=768', // garbage collector size
      max_memory_restart: '1024M', // restart instance if exceeds memory usage
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        JOB_RUNNER: 'dedicated',
      },
      env_staging: {
        NODE_ENV: 'staging',
        JOB_RUNNER: 'dedicated',
      },
    },
    {
      name: 'api',
      script: './packages/app-service/dist/server.js',
      instances: -1,
      exec_mode: 'cluster',
      node_args: '--max_old_space_size=768', // garbage collector size
      max_memory_restart: '1024M', // restart instance if exceeds memory usage
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 5000,
      env: {
        NODE_ENV: 'production',
      },
      env_staging: {
        NODE_ENV: 'staging',
      },
    },
    // {
    //   name: 'worker',
    //   script: '.packages/isolated-worker/dist/main.js',
    //   instances: 4,
    //   node_args: '--max_old_space_size=768', // garbage collector size
    //   max_memory_restart: '512M', // restart instance if exceeds memory usage
    //   kill_timeout: 3000,
    //   wait_ready: true,
    //   listen_timeout: 5000,
    //   env: {
    //     NODE_ENV: 'production',
    //   },
    //   env_staging: {
    //     NODE_ENV: 'staging',
    //   },
    // },
  ],
};
