import shell from "shelljs";
import chalk from "chalk";
import readline from "readline/promises";

const upgrade_version = "v24.14.3"; // Version to upgrade to
const app_name = "neptune-dxp"; // Cloud Foundry Application Name

shell.echo(
  chalk.hex("ff9e33").bold("\n\nNeptune DXP - Open Edition upgrade!\n\n")
);

if (!shell.which("cf8")) {
  shell.echo(
    chalk.red(
      "Sorry, this script requires the Cloud Foundry Command Line Interface (cf CLI)"
    ),
    chalk.blue("https://docs.cloudfoundry.org/cf-cli/")
  );
  shell.exit(1);
} else {
  shell.echo(chalk.green("Cloud Foundry CLI is installed."));
}

const orgs = shell.exec("cf8 orgs", { silent: true }).stdout;

if (orgs.includes("FAILED")) {
  shell.echo(
    chalk.red("Please login with cf login before executing this script")
  );
  shell.exit(1);
}

const app = shell.exec(`cf8 app ${app_name}`, { silent: true }).stdout;

if (app.includes("FAILED")) {
  shell.echo(chalk.red("Neptune DXP is not installed in this subaccount"));
  shell.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const target = shell.exec("cf8 target", { silent: true }).stdout;

shell.echo("\n" + chalk.blue(target));

const answer = await rl.question(
  `Do you want to upgrade Neptune DXP - Open Edition to version ${upgrade_version} in the above org and space (yN)? `
);

if (!answer.includes("y")) {
  shell.echo("Goodbye!");
  shell.exit(0);
}

shell.echo(`stopping ${app_name}`);
shell.exec(`cf8 stop ${app_name}`);

shell.echo(`Upgrading ${app_name}. Please wait a few minutes...`);

// Push Neptune DXP - Open Edition Docker container
shell.exec(
  `cf8 push -f neptune-manifest-upgrade.yml --var app-name=${app_name} --var upgrade_version=${upgrade_version}`,
  { silent: true }
);

const logs = shell.exec(`cf8 logs ${app_name} --recent`, {
  silent: true,
}).stdout;

if (!logs.includes("Planet9 upgrade complete.")) {
  shell.echo(
    `Upgrade failed. Please check log files with \`cf8 logs ${app_name} --recent\``
  );
  shell.exit(0);
}

shell.exec(`cf8 stop ${app_name}`);

shell.exec(
  `cf8 push -f neptune-manifest-after-upgrade.yml --var app-name=${app_name} --var upgrade_version=${upgrade_version}`,
  { silent: true }
);

shell.echo(chalk.green("Neptune DXP - Open Edition upgrade complete"));

shell.exit(1);
