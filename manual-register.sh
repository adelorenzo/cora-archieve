#!/bin/bash

# Manual registration commands for Gitea Runners
# Copy and run these commands one by one on your server

cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║         MANUAL RUNNER REGISTRATION COMMANDS                   ║
╚══════════════════════════════════════════════════════════════╝

IMPORTANT: Run these commands on your server one at a time.

1. First, get your registration token from:
   https://git.oe74.net/admin/actions/runners

2. Set your token as a variable:
   export TOKEN="your-token-here"

3. Create data directories:
   sudo mkdir -p /opt/gitea-runners/data/runner-{1,2,3}

4. Register Runner 1:
   sudo docker run --rm \
     -v /opt/gitea-runners/data/runner-1:/data \
     gitea/act_runner:0.2.11 \
     register \
     --no-interactive \
     --instance "https://git.oe74.net" \
     --token "$TOKEN" \
     --name "docker-runner-1" \
     --labels "ubuntu-latest:docker://node:20"

5. Register Runner 2:
   sudo docker run --rm \
     -v /opt/gitea-runners/data/runner-2:/data \
     gitea/act_runner:0.2.11 \
     register \
     --no-interactive \
     --instance "https://git.oe74.net" \
     --token "$TOKEN" \
     --name "docker-runner-2" \
     --labels "ubuntu-latest:docker://node:20"

6. Register Runner 3:
   sudo docker run --rm \
     -v /opt/gitea-runners/data/runner-3:/data \
     gitea/act_runner:0.2.11 \
     register \
     --no-interactive \
     --instance "https://git.oe74.net" \
     --token "$TOKEN" \
     --name "docker-runner-3" \
     --labels "ubuntu-latest:docker://node:20"

7. Fix the docker-compose.yml network section:
   sudo nano /opt/gitea-runners/docker-compose.yml

   Make sure the network section at the bottom looks like:

   networks:
     gitea-ad_gitea-ad:
       external: true

8. Start the runners:
   cd /opt/gitea-runners
   sudo docker-compose up -d

9. Check if they're running:
   sudo docker-compose ps
   sudo docker-compose logs -f

╔══════════════════════════════════════════════════════════════╗
║         ALTERNATIVE: INTERACTIVE REGISTRATION                 ║
╚══════════════════════════════════════════════════════════════╝

If the above doesn't work, try interactive mode:

1. For each runner (replace X with 1, 2, or 3):

   sudo docker run --rm -it \
     -v /opt/gitea-runners/data/runner-X:/data \
     gitea/act_runner:0.2.11 \
     register

   When prompted:
   - Instance URL: https://git.oe74.net
   - Token: [paste your token]
   - Runner name: docker-runner-X
   - Runner labels: ubuntu-latest:docker://node:20

╔══════════════════════════════════════════════════════════════╗
║         VERIFICATION COMMANDS                                 ║
╚══════════════════════════════════════════════════════════════╝

Check if registration was successful:
   ls -la /opt/gitea-runners/data/runner-1/.runner
   ls -la /opt/gitea-runners/data/runner-2/.runner
   ls -la /opt/gitea-runners/data/runner-3/.runner

If .runner files exist, registration was successful!

╔══════════════════════════════════════════════════════════════╗
║         TROUBLESHOOTING                                       ║
╚══════════════════════════════════════════════════════════════╝

If you see "instance address is empty" error:
- Make sure you're using quotes around the URL: --instance "https://git.oe74.net"
- Try without quotes: --instance https://git.oe74.net
- Try the interactive mode instead (shown above)

If you see network errors when starting:
- Verify network exists: docker network ls | grep gitea
- The network name should be: gitea-ad_gitea-ad

EOF