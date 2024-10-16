# kaspad-checker

**kaspad-checker** is a monitoring tool for Kaspa nodes. It retrieves key metrics from the node (such as the number of connected peers, version, mempool size, sync status, block count, header count, blue score, and others) and, if enabled, sends this data to Zabbix for further monitoring.

## Features
Supports multiple nodes with different IP addresses and aliases.

Retrieves important metrics including:
- Number of connected peers
- Node version
- Mempool size
- Sync status
- Block and header counts
- DAA score and difficulty
- Hashrate and blue score
- Integration with Zabbix for monitoring and alerting.

## Configuration

To run the application, you need to set up an .env file in the root directory of your project with the following variables:

```
KASPA_NODES=<comma-separated list of Kaspa node IP addresses>
KASPA_NODE_ALIASES=<comma-separated list of aliases corresponding to the IP addresses>
ZABBIX_SERVER=<Zabbix server address>
ZABBIX_PORT=<Zabbix server port>
ZABBIX_INTEGRATION_ENABLED=true  # Set to 'true' to enable sending data to Zabbix
```

## Running the Application
Install the necessary dependencies:
```
npm install
```
Start the application:
```
node kaspad-checker.js
```

## Adding to Cron Job
To run the kaspad-checker at regular intervals, you can set it up as a cron job. Here’s how to do that:

Open your crontab file:

```
crontab -e
```

Add a line to schedule the job. For example, to run it every 10 minutes:

```
*/10 * * * * /path/to/node /path/to/kaspad-checker.js >> /path/to/logfile.log 2>&1
```
Replace `/path/to/node` with the path to your Node.js binary, and `/path/to/kaspad-checker.js` with the path to your script. Redirecting output to a log file helps in troubleshooting.