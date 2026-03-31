import { ZKClient } from './src/main/zkclient';

async function run() {
  console.log('Testing connection to 192.168.100.51...');
  const logs = await ZKClient.fetchLogs({
    ip: '192.168.100.51',
    port: 4370,
    startDate: '2026-03-01',
    endDate: '2026-03-28'
  });
  console.log(`Fetched ${logs.length} logs!`);
  if (logs.length > 0) {
    console.log('First log:', logs[0]);
    console.log('Last log:', logs[logs.length - 1]);
  }
}

run().catch(err => console.error(err));
