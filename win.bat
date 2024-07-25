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

REM Start the server in the background
echo Starting server...
start /B node dist/index.js

REM Wait for server to start (you can adjust the timeout as needed)
timeout /t 5 >nul

REM Navigate back to the root directory
cd ..

REM Navigate to client directory
cd client

REM Check if node_modules directory is missing and install dependencies if necessary
if not exist node_modules (
  echo node_modules not found in client directory. Running npm install...
  npm install
)

REM Check if dist directory is missing, install dependencies and build if necessary
if not exist dist (
  echo dist directory not found in client directory. Running npm install and npm run build...
  npm install express path
  npm run build
)

REM Start the client in the background
echo Starting client...
start /B node serve.js

REM Open the browser to http://localhost:8081
start "" "http://localhost:8081"

REM Wait for user input before closing the terminal
echo.
echo Press any key to exit...
pause >nul

REM Function to kill background processes on script exit
:cleanup
echo Stopping client and server...
taskkill /F /IM node.exe
exit 0

REM Trap script exit to ensure cleanup (note: this is more symbolic in batch)
REM Call the cleanup function when exiting
trap cleanup EXIT