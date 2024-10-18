# Setup Instructions
Import the template into Zabbix:

1. Go to `Configuration` → `Templates` → `Import` and upload the template file.
2. Modify the `{$API_HOST}` macro to point to the correct Kaspa API endpoint.

Apply the template to the appropriate hosts to start monitoring Kaspad nodes.

# Requirements

Zabbix Version: 6.0 or higher

Kaspad API: A running instance of [Kaspa API](https://github.com/kaspa-ng/kaspa-rest-server) with the health endpoint accessible via HTTP.

Kaspa Node Checker: Ensure the node checker is properly sending data via Zabbix Sender.

## Kaspa API Monitoring Zabbix Template
This Zabbix template is designed to monitor Kaspa nodes through the Kaspa API. It collects health information from Kaspa API servers and checks synchronization and UTXO indexing status.

### Macros
- {$API_HOST}: Defines the base URL for Kaspad API. Default: http://localhost:8000


## Kaspa Node Monitoring Zabbix Template
This Zabbix template is designed to monitor critical metrics and statuses of Kaspa nodes using traps sent from the Kaspa Node Checker tool.