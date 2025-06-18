import shell from "shelljs";
import chalk from "chalk";
import readline from "readline/promises";

const version = "v24.11.0"; // Lateste Neptune planet9 docker

shell.echo(
  chalk.hex("ff9e33").bold("\n\nNeptune DXP - Open Edition deployment!\n\n")
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

const target = shell.exec("cf8 target", { silent: true }).stdout;

if (target.includes("FAILED")) {
  shell.echo(
    chalk.red("Please login with cf8 login before executing this script")
  );
  shell.exit(1);
}

const app = shell.exec("cf8 app neptune-dxp", { silent: true }).stdout;

if (!app.includes("FAILED")) {
  shell.echo(chalk.red("Neptune DXP is already installed in this subaccount"));
  shell.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

shell.echo("\n" + chalk.blue(target));

const answer = await rl.question(
  "Do you want to install Neptune DXP - Open Edition in the above org and space (yes/no)? "
);

if (!answer.includes("y")) {
  shell.echo("Goodbye!");
  shell.exit(0);
}

// Get all services from subaccount
const services = shell.exec("cf8 services", { silent: true }).stdout;

// TODO: If not available create a postgres instance via the CF CLI

if (!services.includes("postgresql-db")) {
  shell.echo("❌ PostgreSQL Instance not found!");
  shell.echo(
    "Please create a Postgres service more information can be found here",
    chalk.blue(
      "https://docs.neptune-software.com/neptune-dxp-open-edition/24/installation-guide/install-neptune-dxp-open-edition-on-btp-with-postgreSQL.html#_postgresql_hyperscaler_option"
    )
  );
  shell.exit(1);
} else {
  shell.echo(chalk.green("Postgresql instance found."));
}

const serviceLines = services.split("\n");
const postgresLine = serviceLines.find(function (line) {
  return line.includes("postgresql-db");
});

const postgresInstanceName = postgresLine.substring(
  0,
  postgresLine.indexOf(" ")
);

shell.echo("Postgres instance name:", chalk.blue(postgresInstanceName));

// Push pg-init nodejs application
shell.exec(
  `cf8 push -f ./pg-init/manifest.yml --var postgres-instance=${postgresInstanceName}`
);

shell.echo(chalk.green("Postgresql planet9 schema created."));
// Delete pg-init application
shell.exec("cf8 delete pg-init -f -r");

// Push Neptune DXP - Open Edition Docker container
shell.exec(
  `cf8 push -f neptune-manifest.yml --no-start --var postgres-instance=${postgresInstanceName} --var version=${version}`
);
// Get environment variables with postgres connection data
const env = shell.exec("cf8 env neptune-dxp", { silent: true }).stdout;

const envLines = env.split("\n");
const uriLine = envLines.find(function (line) {
  return line.includes('"uri"');
});

const start = uriLine.indexOf("postgres");
const end = uriLine.lastIndexOf('"');
const postgresuri = uriLine.substring(start, end);
// Set Postgres URI env variable for Neptune DXP
shell.exec(`cf8 set-env neptune-dxp DB_URI_POSTGRES ${postgresuri}`);
// Restage Neptune DXP. It will start with Postgres configured
shell.exec("cf8 restage neptune-dxp");

shell.echo(chalk.green("Neptune DXP - Open Edition deployed"));

shell.exit(1);
