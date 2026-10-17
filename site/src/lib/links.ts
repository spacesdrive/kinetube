export const SITE_URL = 'https://kinetube.ujjwal.fyi';
export const GITHUB_URL = 'https://github.com/spacesdrive/kinetube';
// the installers have no version in their names, so GitHub sends the newest release's file and the links follow every release
const LATEST_DOWNLOAD = `${GITHUB_URL}/releases/latest/download`;
export const DOWNLOAD_URL = `${LATEST_DOWNLOAD}/KineTube-Setup.exe`;
export const MAC_ARM_DOWNLOAD_URL = `${LATEST_DOWNLOAD}/KineTube-arm64.dmg`;
export const MAC_INTEL_DOWNLOAD_URL = `${LATEST_DOWNLOAD}/KineTube-x64.dmg`;
export const LINUX_DOWNLOAD_URL = `${LATEST_DOWNLOAD}/KineTube-x86_64.AppImage`;

// read from the root package.json at build time; the release workflow redeploys the site once the installers are up
export const APP_VERSION = __APP_VERSION__;

// a file download stays in this tab, because the browser saves it without leaving the page
export function opensInNewTab(href: string): boolean {
  return !href.startsWith(LATEST_DOWNLOAD);
}
export const ISSUES_URL = `${GITHUB_URL}/issues/new`;
export const CHANGELOG_URL = `${GITHUB_URL}/blob/main/CHANGELOG.md`;
export const ROADMAP_URL = `${GITHUB_URL}/blob/main/ROADMAP.md`;
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
export const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;
export const DOCS_EDIT_URL = `${GITHUB_URL}/edit/main/site/content/docs`;
