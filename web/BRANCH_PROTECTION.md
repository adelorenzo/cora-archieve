# Branch Protection Guidelines

## Protected Branches

### main
- **Purpose**: Primary development branch
- **Protection Level**: Moderate
- **Rules**:
  - No force pushes
  - Pull requests recommended for major changes
  - All tests must pass

### stable-v1.1.0
- **Purpose**: Frozen stable release v1.1.0
- **Protection Level**: HIGH
- **Rules**:
  - NO direct pushes
  - NO force pushes
  - NO deletions
  - Read-only branch

### stable-v1.0.0
- **Purpose**: Previous stable release v1.0.0
- **Protection Level**: HIGH
- **Rules**:
  - NO direct pushes
  - NO force pushes
  - NO deletions
  - Read-only branch

### develop
- **Purpose**: Active development and experimental features
- **Protection Level**: Low
- **Rules**:
  - Direct pushes allowed
  - Force pushes discouraged
  - Merge to main via PR

## Gitea Branch Protection Setup

To protect branches in Gitea:

1. Go to Settings → Branches
2. Add protection rules for each branch:

### For stable branches (stable-v1.1.0, stable-v1.0.0):
- Enable protection
- Disable push
- Disable deletion
- Disable force push
- No merge whitelist (completely read-only)

### For main branch:
- Enable protection
- Require pull request reviews: 0 (optional, set to 1 for teams)
- Dismiss stale reviews
- Block force push

## Development Workflow

```
develop → main → stable-vX.X.X
```

1. **Feature Development**: Create feature branches from `develop`
2. **Testing**: Merge features to `develop` for testing
3. **Release Prep**: Merge `develop` to `main` when ready
4. **Stable Release**: Tag and create stable branch from `main`

## Creating New Stable Releases

```bash
# From main branch after testing
git tag -a vX.X.X-stable -m "Version X.X.X - Description"
git push origin vX.X.X-stable

# Create stable branch
git checkout -b stable-vX.X.X
git push -u origin stable-vX.X.X

# Switch back to develop
git checkout develop
```

## Emergency Rollback

If main becomes unstable:

```bash
# Reset main to last stable
git checkout main
git reset --hard v1.1.0-stable
git push --force-with-lease origin main
```

⚠️ **WARNING**: Only use force push in emergencies and coordinate with team