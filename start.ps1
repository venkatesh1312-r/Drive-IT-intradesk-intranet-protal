# Start backend and frontend in separate terminal windows
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run start:dev" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\chatbot-service'; npm start" -WindowStyle Normal

Write-Host "Started:"
Write-Host "  backend        -> http://localhost:3001 (NestJS)"
Write-Host "  frontend       -> http://localhost:3000 (Next.js)"
Write-Host "  chatbot-service-> http://localhost:4000 (Express + Ollama)"
Write-Host ""
Write-Host "Wait ~10s for NestJS to compile, then open http://localhost:3000"
Write-Host "AI Assistant needs Ollama running:  ollama serve"
Write-Host "  and models pulled:  ollama pull nomic-embed-text  &&  ollama pull llama3.2"
