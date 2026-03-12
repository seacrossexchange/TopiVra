FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y mysql-client redis-tools \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspaces/TopiVra