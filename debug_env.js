const { spawn } = require('child_process');

function check(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, ['--version']);
    p.on('error', (err) => {
      console.log(`${cmd} error:`, err.message);
      resolve(false);
    });
    p.stdout.on('data', (d) => {
      console.log(`${cmd} stdout:`, d.toString().trim().split('\n')[0]);
    });
    p.on('close', (code) => {
      console.log(`${cmd} exited with`, code);
      resolve(code === 0);
    });
  });
}

(async () => {
  console.log('PATH:', process.env.PATH);
  await check('mono');
  await check('wine');
})();
