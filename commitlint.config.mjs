// Enforces Conventional Commits, which release-please reads to compute the next
// version + CHANGELOG. See CONTRIBUTING.md for the type -> SemVer bump mapping.
export default {
  extends: ['@commitlint/config-conventional'],
};
