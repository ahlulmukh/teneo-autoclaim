const { logMessage } = require("./utils/logger");
const { getRandomProxy, loadProxies } = require("./classes/proxy");
const fs = require("fs");
const chalk = require("chalk");
const claimTeneo = require("./classes/claimTeneo");

async function main() {
  console.log(
    chalk.cyan(`
░▀█▀░█▀▀░█▀█░█▀▀░█▀█
░░█░░█▀▀░█░█░█▀▀░█░█
░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀
    By : El Puqus Airdrop
    github.com/ahlulmukh
  `)
  );
  try {
    const accounts = fs
      .readFileSync("token.txt", "utf8")
      .split("\n")
      .filter(Boolean);
    const count = accounts.length;
    if (count === 0) {
      logMessage(null, null, "No accounts found", "error");
      return;
    }
    logMessage(null, null, `Found ${count} accounts`, "info");

    const proxiesLoaded = loadProxies();
    if (!proxiesLoaded) {
      logMessage(null, null, "No proxies found", "error");
    }

    let successful = 0;
    for (let i = 0; i < count; i++) {
      console.log(chalk.white("-".repeat(85)));
      logMessage(i + 1, count, "Procesing Account", "info");
      const token = accounts[i];
      const currentProxy = await getRandomProxy(i + 1, count);
      const teneo = new claimTeneo(token, currentProxy, i + 1, count);

      try {
        await teneo.singleProses();
        successful++;
      } catch (err) {
        logMessage(i + 1, count, `Error ${err.message}`, "error");
      }
    }
  } catch (error) {
    logMessage(null, null, `Error: ${error.message}`, "error");
  }
}

main();
