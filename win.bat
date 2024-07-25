@echo off
setlocal

REM Navigate to server directory and check if node_modules is missing
cd server
if not exist node_modules (
  echo node_modules not found in server directory. Running npm install...
  npm install
)

REM Check if server's dist directory exists and run npm run build if necessary
if not exist dist (
  echo dist directory not found in server directory. Running npm run build...
  npm run build
)

REM Create uploads and converted directories if they do not exist
if not exist uploads (
  echo Creating uploads directory...
  mkdir uploads
)

if not exist converted (
  echo Creating converted directory...
  mkdir converted
)

REM Start the server in a new background window
echo Starting server...
start "" cmd /c "node dist/index.js"

REM Navigate to client directory and check if dist is missing
cd ../client
echo DIR
cd

if not exist dist (
  echo dist directory not found in client directory. Running npm install and npm run build...
  npm install express path
  npm run build
)

REM Start the client in a new background window
echo Starting client...
start "" cmd /c "node serve.js"

REM Open the browser to http://localhost:8081
start "" "http://localhost:8081"

REM Function to kill background processes on script exit
:cleanup
echo Stopping client and server...
taskkill /F /IM node.exe
exit 0

REM Trap script exit to ensure cleanup (note: this is more symbolic in batch)
REM Call the cleanup function when exiting
trap cleanup EXIT

REM Wait for both background processes to finish (note: wait is more symbolic in batch)
wait %CLIENT_PID%
wait %SERVER_PID%
