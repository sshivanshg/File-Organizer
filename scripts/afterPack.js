const { execSync } = require("child_process");
const path = require("path");

/**
 * electron-builder afterPack hook.
 * Ad-hoc signs the .app bundle so macOS Gatekeeper no longer
 * reports the app as "damaged or modified" on other machines.
 */
exports.default = async function afterPack(context) {
  if (process.platform !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`  • ad-hoc signing  ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, {
    stdio: "inherit",
  });
};
