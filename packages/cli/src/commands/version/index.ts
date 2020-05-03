import chalk from "chalk";
import path from "path";
import { log, warn } from "@changesets/logger";
import { Config, SnapshotConfig } from "@changesets/types";
import applyReleasePlan from "@changesets/apply-release-plan";
import readChangesets from "@changesets/read";
import assembleReleasePlan from "@changesets/assemble-release-plan";
import { getPackages } from "@manypkg/get-packages";

import { removeEmptyFolders } from "../../utils/v1-legacy/removeFolders";
import { readPreState } from "@changesets/pre";

let importantSeparator = chalk.red(
  "===============================IMPORTANT!==============================="
);

let importantEnd = chalk.red(
  "----------------------------------------------------------------------"
);

export default async function version(
  cwd: string,
  config: Config,
  snapshotConfig: SnapshotConfig | undefined
) {
  let [_changesets, _preState] = await Promise.all([
    readChangesets(cwd),
    readPreState(cwd),
    removeEmptyFolders(path.resolve(cwd, ".changeset"))
  ]);

  // temporarily needed because of TS 3.7 regression - https://github.com/microsoft/TypeScript/issues/33752
  const changesets = _changesets as NonNullable<typeof _changesets>;
  const preState = _preState as NonNullable<typeof _preState>;

  if (preState !== undefined && preState.mode === "pre") {
    warn(importantSeparator);
    warn("You are in prerelease mode");
    warn(
      "If you meant to do a normal release you should revert these changes and run `changeset pre exit`"
    );
    warn("You can then run `changeset version` again to do a normal release");
    warn(importantEnd);
  }

  if (
    changesets.length === 0 &&
    (preState === undefined || preState.mode !== "exit")
  ) {
    warn("No unreleased changesets found, exiting.");
    return;
  }

  let packages = await getPackages(cwd);

  let releasePlan = assembleReleasePlan(
    changesets,
    packages,
    config,
    preState,
    snapshotConfig
  );

  await applyReleasePlan(releasePlan, packages, config, snapshotConfig);

  if (snapshotConfig === undefined) return;

  if (config.commit) {
    log("All files have been updated and committed. You're ready to publish!");
  } else {
    log("All files have been updated. Review them and commit at your leisure");
  }
}
