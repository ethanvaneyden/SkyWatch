COS 216 – Flight Tracking System
GitHub Collaboration Strategy (for teammates)
This document explains how we will use Git and GitHub to work together on the assignment.
Group size: up to 3 members.
Goal: Avoid conflicts, keep history clean, and never lose work.

1. Repository Setup
One member creates a private GitHub repository (e.g. cos216-flight-tracker).

Adds the other members as collaborators (Settings → Collaborators).

Clones the repo locally:

bash
git clone https://github.com/ethanvaneyden/SkyWatch/

2. Branching Strategy (GitHub Flow)
We will use a simplified feature-branch workflow:

master – always production‑ready (working integration). No direct commits.

Feature branches – one per person

ethan

lesego

funeko

3. Daily Workflow
Step 1 – Update your local main:
bash
git checkout master
git pull master
Step 2 – Create a new branch
bash
git checkout <your-branch>
Use lowercase, / separators, short but descriptive.

Step 3 – Work and commit often
Commit logical units with meaningful messages:

text
Add DispatchFlight endpoint with ATC role check

- Implement dispatch logic in PHP API
- Add dispatched_at timestamp
- Return 400 if flight not Scheduled
Bad: fix stuff
Good: Fix boarding confirmation window expiry check

Step 4 – Push branch
bash
git push <yourbranch>

Step 5 – Merge into master

Make sure the code you have is 100% bugfree and production ready
When you want to add your current code to the master do this:

1. Do a last commit on feature branch
2. git checkout master
3. git merge <your-branch>
4. git push (IF 100% SURE!!!)

5. Handling Merge Conflicts
If you get a conflict when merging a PR:

On your local machine, switch to your feature branch.

Update from main:

bash
git checkout <your-branch>
git pull main
Resolve conflicts in your editor.

git add . then git commit -m "merge main and resolve conflicts"

git push origin feature/your-branch

The PR will update automatically – now merge.

Pro tip: Keep branches short‑lived (less than 2 days) to minimise conflicts.

6. Credentials & Security (CRITICAL)
Never commit .env files, config.php with passwords, or any file containing Wheatley credentials.

Use environment variables or a local config.sample.php that we copy to config.php (which is gitignored).

Example .gitignore entries:

text
.env
config/db_credentials.php
node_modules/
*.log
.angular/
dist/
Double‑check before every commit:

bash
git status
git diff --cached
The README submitted to ClickUP must be sanitised (no real passwords). Use placeholders like your_username, your_api_key.

Bonus marks are awarded for secure handling – do not ignore this.

9. Keeping the README (for ClickUP) in sync
We maintain a README.md in the repo root – this is for us.

Before submitting to ClickUP, copy the relevant parts into a README_clickUP.txt without any passwords.

Add a short explanation of your database‑update choice (every tick vs interval) in that file.

9. Final Submission – GitHub to ClickUP
Ensure all code is merged into main.

Run a final git pull origin main to be absolutely sure.

Create an archive excluding .git folder, node_modules, and any credentials:

bash
zip -r submission.zip . -x "*.git*" "*node_modules*" "*.env" "config/*credentials*"
One team member uploads submission.zip to ClickUP before the deadline.

Good luck, and let’s build a great flight tracker! ✈️
