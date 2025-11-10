#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Import command handlers
import * as enqueue from './src/commands/enqueue.js';
import * as worker from './src/commands/worker.js';
import * as status from './src/commands/status.js';
import * as list from './src/commands/list.js';
import * as dlq from './src/commands/dlq.js';
import * as config from './src/commands/config.js';
import * as stats from './src/commands/stats.js';
import { startDashboard } from './src/dashboard.js';

yargs(hideBin(process.argv))
  // 'enqueue' command
  .command(
    'enqueue <job>',
    'Add a new job to the queue',
    (yargs) => {
      yargs.positional('job', {
        describe: 'Job details as a JSON string (e.g., \'{"id":"j1","command":"sleep 2"}\')',
        type: 'string',
      });
    },
    enqueue.handler
  )

  // 'worker' command
  .command(
    'worker <action>',
    'Start or stop worker processes',
    (yargs) => {
      yargs
        .positional('action', {
          describe: 'Action to perform',
          choices: ['start', 'stop'],
        })
        .option('count', {
          alias: 'c',
          type: 'number',
          default: 1,
          describe: 'Number of workers to start',
        });
    },
    (argv) => {
      if (argv.action === 'start') {
        worker.startHandler(argv);
      } else if (argv.action === 'stop') {
        worker.stopHandler(argv);
      }
    }
  )

  // 'status' command
  .command('status', 'Show summary of all job states', status.handler)

  // 'list' command
  .command(
    'list',
    'List jobs by state',
    (yargs) => {
      yargs.option('state', {
        alias: 's',
        type: 'string',
        default: 'pending',
        describe: 'State of jobs to list (pending, completed, failed, dead)',
      });
    },
    list.handler
  )

  // 'dlq' command
  .command(
    'dlq <action> [jobId]',
    'Manage the Dead Letter Queue (DLQ)',
    (yargs) => {
      yargs
        .positional('action', {
          describe: 'Action to perform',
          choices: ['list', 'retry'],
        })
        .positional('jobId', {
          describe: 'The ID of the job to retry',
          type: 'string',
        });
    },
    dlq.handler
  )
  
  // 'config' command
  .command(
    'config <action> [key] [value]',
    'Manage configuration',
    (yargs) => {
      yargs
        .positional('action', {
          describe: 'Action to perform',
          choices: ['set', 'get'],
        });
    },
    config.handler
  )

  // 'stats' command
  .command('stats', 'Show job execution metrics', stats.handler)

  // 'dashboard' command
  .command('dashboard', 'Start the web dashboard', startDashboard)

  .demandCommand(1, 'You must provide a valid command.')
  .help()
  .strict()
  .argv;