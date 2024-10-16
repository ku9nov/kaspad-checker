import kaspa from "kaspajs";
import chalk from "chalk";
import BigNumber from "bignumber.js";
import { Command } from 'commander';
import dotenv from 'dotenv';
import ZabbixSender from 'node-zabbix-sender';

dotenv.config();
const zabbixSender = new ZabbixSender({
    host: process.env.ZABBIX_SERVER,
    port: process.env.ZABBIX_PORT,     
});

async function sendToZabbix(alias, key, value) {
    if (process.env.ZABBIX_INTEGRATION_ENABLED === 'true') {
        return new Promise((resolve, reject) => {
            zabbixSender.addItem(alias, key, value);
            zabbixSender.send((err, res) => {
                if (err) {
                    console.error(`Error sending data to Zabbix using ${alias} as alias: ${err}`);
                    reject(err);
                } else {
                    console.log(`Data sent to Zabbix using ${alias} as alias: ${key}=${value}`);
                    resolve(res);
                }
            });
        });
    } else {
        return Promise.resolve();
    }
}

const program = new Command(); 

class CheckStatus {

    static async action() {
        const ipAddresses = process.env.KASPA_NODES.split(',');
        const aliases = process.env.KASPA_NODE_ALIASES.split(',');
        if (ipAddresses.length !== aliases.length) {
            console.error(chalk.red('Error: The number of IP addresses must match the number of aliases.'));
            process.exit(1);
        }

        for (let i = 0; i < ipAddresses.length; i++) {
            const ip = ipAddresses[i].trim();
            const alias = aliases[i].trim();
            console.log(chalk.bold(`Checking ${alias} at ${ip}...`)); 
            await CheckStatus.checkNode(ip, alias);
        }

        console.log(chalk.bold('All IP addresses have been checked. Exiting...'));
        process.exit(0);
    }

    static async checkNode(ip, alias) { 
        return new Promise((resolve) => {
            console.log(chalk.bold(`Attempting to connect to ${ip}...`));
            const rpc = new kaspa.Daemon(ip, async () => {
                const res = await checkConnection(rpc);
                if (res) {
                    const ni = await getNodeInfo(rpc);

                    // Define the metrics to log and send
                    const metrics = [
                        { key: 'kaspa.node.peers', label: 'Peers', value: ni.peers, format: (v) => numberFormatter.format(v) },
                        { key: 'kaspa.node.version', label: 'Version', value: ni.version },
                        { key: 'kaspa.node.mempool_size', label: 'Mempool size', value: ni.mempoolSize },
                        { key: 'kaspa.node.synced', label: 'Synced', value: ni.isSyncedRPC },
                        { key: 'kaspa.node.block_count', label: 'Block count', value: ni.blockCount, format: (v) => numberFormatter.format(v) },
                        { key: 'kaspa.node.header_count', label: 'Header count', value: ni.headerCount, format: (v) => numberFormatter.format(v) },
                        { key: 'kaspa.node.daa_score', label: 'DAA score', value: ni.daaScore, format: (v) => numberFormatter.format(v) },
                        { key: 'kaspa.node.difficulty', label: 'Difficulty', value: ni.difficulty, format: (v) => numberFormatter.format(v) },
                        { key: 'kaspa.node.hash_rate', label: 'Hashrate', value: new BigNumber(ni.hashRate).shiftedBy(-12).toFixed(2), format: (v) => `${v} TH/s` },
                        { key: 'kaspa.node.blue_score', label: 'Blue score', value: ni.blueScore, format: (v) => numberFormatter.format(v) }
                    ];
                    
                    for (const metric of metrics) {
                        await logAndSendToZabbix(alias, metric.key, metric.label, metric.value, metric.format);
                    }
                    
                    console.log(`Node info for ${alias} at ${ip} has been checked.\n---`);
                }
                resolve();
            }).on('error', (err) => {
                console.error(`${chalk.red('Kaspa:')} ${err}`);
                resolve();
            });
        });
    }
}

async function logAndSendToZabbix(alias, key, label, value, format = (v) => v) {
    console.log(`${label}: ${chalk.bold(format(value))}`);
    await sendToZabbix(alias, key, value);
}

async function checkConnection(rpc) {
    try {
        const info = await rpc.request('getInfoRequest', {});
        console.log(`${chalk.green('Kaspa:')} Connected! Node running Kaspad version ${info.serverVersion}`);
        return true;
    } catch (e) {
        console.log(e, 'error');
    }
}

async function safeRequest(rpc, method, defaultValue = {}) {
    try {
        return await rpc.request(method, {});
    } catch (e) {
        console.log(`KasNodeMon encountered an error while fetching ${method}: ${JSON.stringify(e)}`);
        return defaultValue;
    }
}

async function getNodeInfo(rpc) {
    const startTime = performance.now();

    const [
        mainStats, 
        connectedPeers, 
        info, 
        blueScore, 
        hashRate
    ] = await Promise.all([
        safeRequest(rpc, 'getBlockDagInfoRequest', {
            blockCount: "Error",
            headerCount: "Error",
            virtualDaaScore: "Error",
            difficulty: "Error",
        }),
        safeRequest(rpc, 'getConnectedPeerInfoRequest', { infos: [] }),
        safeRequest(rpc, 'getInfoRequest', {
            serverVersion: "Error",
            mempoolSize: "Error",
            isSynced: "Error",
        }),
        safeRequest(rpc, 'getVirtualSelectedParentBlueScoreRequest', { blueScore: "Error" }),
        getNetworkHashrate(rpc).catch((e) => {
            console.log(`KasNodeMon encountered an error while fetching network hashrate: ${JSON.stringify(e)}`);
            return 0;
        })
    ]);

    const endTime = performance.now();
    console.log(`Requests to Kaspa gRPC took ${(endTime - startTime).toFixed(0)} ms`);

    return {
        peers: connectedPeers.infos.length,
        version: info.serverVersion,
        mempoolSize: info.mempoolSize,
        isSyncedRPC: info.isSynced,
        blockCount: mainStats.blockCount,
        headerCount: mainStats.headerCount,
        daaScore: mainStats.virtualDaaScore,
        difficulty: mainStats.difficulty,
        blueScore: blueScore.blueScore,
        hashRate: hashRate,
        status: 200,
    };
}


async function getNetworkHashrate(rpc) {
    const info = await rpc.request('estimateNetworkHashesPerSecondRequest', {windowSize: 2500});
    return info.networkHashesPerSecond;
}

export const numberFormatter = new Intl.NumberFormat('en-US');

program
  .action(CheckStatus.action);

program.parse(process.argv);
