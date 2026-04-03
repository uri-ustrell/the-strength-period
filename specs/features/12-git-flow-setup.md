# Feature 12 — Git Flow + GitHub Push

## Dependencies
None — infrastructure task, can be done at any time.

## Problem
The codebase is not yet in a git repository. Need to:
1. Initialize git with proper ignore rules
2. Set up git flow branching model
3. Push to the user's personal GitHub account (user has 2 GitHub accounts — personal and work — requiring SSH alias configuration)

## Prerequisites
- Git installed (`git --version` ≥ 2.39)
- `gh` CLI installed (`brew install gh`) — optional, for repo creation
- SSH key for the personal GitHub account (generate if missing)

---

## Step 1: Verify `.gitignore`

The project should have a `.gitignore` at the root containing at minimum:

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Vercel
.vercel/

# Debug
npm-debug.log*
```

---

## Step 2: Multi-Account SSH Configuration

Since the user has 2 GitHub accounts (personal and work), SSH must be configured with Host aliases to route to the correct key.

### 2a. Check for existing SSH keys

```bash
ls -la ~/.ssh/
```

Look for existing key pairs (e.g., `id_ed25519`, `id_rsa`). Identify which key is associated with which GitHub account.

### 2b. Generate a new SSH key for the personal account (if needed)

```bash
ssh-keygen -t ed25519 -C "personal-email@example.com" -f ~/.ssh/id_ed25519_personal
```

- Use the email associated with the **personal** GitHub account
- Do not overwrite existing keys — use a distinct filename (`id_ed25519_personal`)
- Set a passphrase (recommended) or leave empty for convenience

### 2c. Add the key to ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_personal
```

On macOS, `--apple-use-keychain` stores the passphrase in Keychain so it persists across restarts.

### 2d. Add the public key to GitHub

```bash
pbcopy < ~/.ssh/id_ed25519_personal.pub
```

Then go to **GitHub → Settings → SSH and GPG keys → New SSH key** and paste it.

Or with `gh` CLI:
```bash
gh ssh-key add ~/.ssh/id_ed25519_personal.pub --title "MacBook - The Strength Period"
```
(Ensure `gh` is authenticated with the personal account: `gh auth login`)

### 2e. Configure `~/.ssh/config` with Host aliases

Edit `~/.ssh/config`:

```ssh-config
# Work GitHub account (existing)
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
  IdentitiesOnly yes

# Personal GitHub account
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes
```

- `IdentitiesOnly yes` prevents ssh-agent from trying other keys
- The `Host` value (e.g., `github.com-personal`) is used in git remote URLs instead of `github.com`
- Adjust `IdentityFile` paths to match actual key filenames

### 2f. Test the connection

```bash
ssh -T git@github.com-personal
```

Expected output:
```
Hi <personal-username>! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## Step 3: Initialize Git

```bash
cd /path/to/the-strength-period
git init
git add .
git commit -m "feat: initial commit — steps 1-9 complete

Zero-backend local-first fitness web app.
React 18 + TypeScript 5 + Vite 5 + Tailwind CSS v3.
AI plans via Vercel Serverless Function (Gemini 2.5 Flash).
IndexedDB persistence, i18n (ca/es/en), 97 enriched exercises."
```

---

## Step 4: Git Flow Initialization

### Option A: git-flow AVH (recommended)

Install:
```bash
brew install git-flow-avh
```

Initialize:
```bash
git flow init -d
```

The `-d` flag accepts all defaults:
- Production branch: `main`
- Development branch: `develop`
- Feature prefix: `feature/`
- Release prefix: `release/`
- Hotfix prefix: `hotfix/`
- Support prefix: `support/`
- Version tag prefix: (empty)

This creates the `develop` branch from `main`.

### Option B: Manual branch structure (no extra tooling)

```bash
git checkout -b develop
git push -u origin develop
```

Convention (enforced manually):
- `main` — production-ready, tagged releases only
- `develop` — integration branch, always deployable to staging
- `feature/*` — new features, branched from `develop`, merged back to `develop`
- `release/*` — release prep, branched from `develop`, merged to `main` + `develop`
- `hotfix/*` — urgent fixes, branched from `main`, merged to `main` + `develop`

### Workflow for new features

```bash
# With git-flow AVH:
git flow feature start local-api-mock
# ... work ...
git flow feature finish local-api-mock

# Without git-flow (manual):
git checkout develop
git checkout -b feature/local-api-mock
# ... work ...
git checkout develop
git merge --no-ff feature/local-api-mock
git branch -d feature/local-api-mock
```

---

## Step 5: Create GitHub Repository

### Option A: Using `gh` CLI

Ensure `gh` is authenticated with the **personal** account:
```bash
gh auth login
```
Select: GitHub.com → SSH → personal key.

Create the repository:
```bash
gh repo create the-strength-period --private --source=. --remote=origin --push
```

**Important:** After creation, if the remote URL uses `github.com`, update it to use the SSH alias:
```bash
git remote set-url origin git@github.com-personal:<personal-username>/the-strength-period.git
```

### Option B: Manual creation

1. Go to https://github.com/new
2. Repository name: `the-strength-period`
3. Visibility: **Private** (recommended — contains project API key references in specs)
4. Do NOT initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

Then add the remote:
```bash
git remote add origin git@github.com-personal:<personal-username>/the-strength-period.git
```

---

## Step 6: Push

```bash
git push -u origin main
git push -u origin develop
```

Verify:
```bash
git remote -v
# origin  git@github.com-personal:<username>/the-strength-period.git (fetch)
# origin  git@github.com-personal:<username>/the-strength-period.git (push)

git branch -a
# * develop
#   main
#   remotes/origin/develop
#   remotes/origin/main
```

---

## Step 7: Git Config for This Repository

Set the personal identity for this repo only (so work repos are unaffected):

```bash
git config user.name "Personal Name"
git config user.email "personal-email@example.com"
```

This sets `user.name` and `user.email` at the **local** (repo) level, overriding the global config.

Verify:
```bash
git config --local user.name
git config --local user.email
```

---

## Step 8: Branch Protection Rules (Recommended)

Via GitHub UI: **Settings → Branches → Add branch protection rule**

### `main` branch:
- [x] Require pull request reviews before merging (1 reviewer — optional for solo dev)
- [x] Require status checks to pass before merging (add `build` check when CI is set up)
- [x] Require branches to be up to date before merging
- [x] Do not allow force pushes
- [x] Do not allow deletions

### `develop` branch:
- [x] Require branches to be up to date before merging
- [x] Do not allow force pushes
- [x] Do not allow deletions

**Note:** Branch protection rules require a GitHub Pro/Team plan for private repositories, or the repo must be public. For a free private repo, enforce these conventions manually.

---

## Files to Create/Modify

```
~/.ssh/config                         ← Add github.com-personal Host alias
~/.ssh/id_ed25519_personal            ← New SSH key (if needed)
~/.ssh/id_ed25519_personal.pub        ← Public key (add to GitHub)
.git/config                           ← Local git config (user.name, user.email, remote)
.gitignore                            ← Verify completeness (likely no changes needed)
```

No project source files are created or modified. All changes are in git/SSH configuration.

## Acceptance Criteria

### Git Init
- [ ] `git init` completed in project root
- [ ] `.gitignore` verified (node_modules, dist, .env*, .vercel, .DS_Store)
- [ ] Initial commit created with all project files
- [ ] Commit message is descriptive and mentions steps 1-9

### Git Flow
- [ ] `main` and `develop` branches exist
- [ ] Git flow initialized (AVH or manual convention documented)
- [ ] Feature branch workflow is documented and tested

### GitHub Push
- [ ] SSH key for personal account exists and is added to GitHub
- [ ] `~/.ssh/config` has `github.com-personal` Host alias with `IdentitiesOnly yes`
- [ ] `ssh -T git@github.com-personal` authenticates as the personal account
- [ ] GitHub repository created (private)
- [ ] Remote URL uses SSH alias: `git@github.com-personal:<username>/the-strength-period.git`
- [ ] `main` and `develop` branches pushed to origin
- [ ] `git config --local user.email` returns the personal email

### Verification
- [ ] `git remote -v` shows the correct SSH alias URL
- [ ] `git log --oneline` shows the initial commit
- [ ] GitHub web UI shows the repository with both branches
- [ ] A test feature branch can be created, pushed, and deleted

## Edge Cases
- **Existing global git config**: The local repo config (`git config user.name/email` without `--global`) overrides global settings. Work repos remain unaffected.
- **SSH key passphrase**: If a passphrase is set, `ssh-add --apple-use-keychain` persists it in macOS Keychain. No repeated prompts.
- **`gh` CLI authenticated with wrong account**: Run `gh auth logout` then `gh auth login` with the personal account credentials.
- **Repo already exists on GitHub**: `gh repo create` will fail. Use `git remote add origin` manually instead.
- **Large initial commit**: The exercises JSON (`public/exercises/exercises.json`) may be large. Consider adding it via Git LFS in the future if it exceeds ~50 MB (currently well under this).

## Security Notes
- Repository should be **private** — specs reference API key patterns and architecture details.
- Never commit `.env.local` or any file containing `GEMINI_API_KEY`.
- SSH keys: use Ed25519 (more secure than RSA). Set a passphrase on the private key.
- The personal SSH key's private part (`id_ed25519_personal`) must never be shared or committed anywhere.
