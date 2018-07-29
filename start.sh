#!/bin/bash
#
nvm use 8.9.3
export NODE_ENV=development && forever start server/main.js
sleep 5
forever start build/dev-server.js