#!/bin/bash

read -p "Enter your public access code: " public_access_token
read -p "Enter your access code: " access_token

PUBLIC_ACCESS_TOKEN=$public_access_token ACCESS_TOKEN=$access_token npm start
