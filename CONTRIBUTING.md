# Contribution Guidelines

## Pull Request Policy

All pull requests must be based on the most current `develop` branch. PRs from outdated or un-rebased branches will be blocked from merging.

### Rebase Requirement

If your feature branch has fallen behind `develop`, you are required to rebase your changes before submitting a PR for review.

```bash
git checkout develop
git pull origin develop
git checkout your-feature-branch
git rebase develop
```

Resolve any conflicts, test locally, and then push your rebased branch.

## PR Triage Process

A triage process is in effect to manage stale and outdated pull requests. See `PR_TRIAGE_REPORT.md` for current status. PRs that are not rebased within 7 days of a request will be closed.
