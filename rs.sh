#!/bin/bash

./rb.sh &
PID_B=$!

./rf.sh &
PID_F=$!

./rw.sh &
PID_W=$!

cleanup() {
    echo "Shutting everything down..."
    kill $PID_B $PID_F $PID_W 2>/dev/null
}

trap cleanup SIGINT

wait