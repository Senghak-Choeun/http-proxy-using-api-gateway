#!/bin/bash

(cd api-gateway && node index.js) &
(cd user-service && node index.js) &
(cd admin-service && node index.js) &
(cd login-service && node index.js) &
(cd register-service && node index.js) &

wait