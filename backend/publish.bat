@echo off
echo Publishing backend for Windows Server...
dotnet publish -c Release -r win-x64 --self-contained false -o ./publish
echo.
echo Done! Files are in ./publish folder
echo Copy the publish folder + database folder to your Windows Server
pause
