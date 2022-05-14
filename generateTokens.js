const { exec } = require("node:child_process");
const tokens = require("./tokens.json");

const sets = Object.keys(tokens).filter((key) => key !== "$themes");

sets.forEach(async (set) => {
  await exec(
    `./node_modules/.bin/token-transformer tokens.json tokens/${set}.json ${set} --resolveReferences false`
  );
});
