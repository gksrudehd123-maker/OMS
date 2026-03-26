@echo off
chcp 65001 >nul
echo [%date% %time%] 키워드 순위 자동 조회 시작

:: 서버가 실행 중인지 확인
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > %TEMP%\oms_check.txt 2>nul
set /p STATUS=<%TEMP%\oms_check.txt

if "%STATUS%"=="000" (
    echo [%date% %time%] 서버가 실행되지 않았습니다. 서버를 먼저 시작합니다...
    cd /d C:\git\OMS
    start "OMS Server" cmd /c "pnpm dev"
    echo [%date% %time%] 서버 시작 대기 중 (15초)...
    timeout /t 15 /nobreak >nul
)

:: API 호출 (POST = 전체 키워드 순위 조회)
echo [%date% %time%] API 호출 중...
curl -s -X POST http://localhost:3000/api/keywords/check-all > %TEMP%\oms_keyword_result.txt 2>&1

:: 결과 출력
echo [%date% %time%] 조회 결과:
type %TEMP%\oms_keyword_result.txt
echo.

:: 로그 파일에 기록
echo [%date% %time%] >> C:\git\OMS\scripts\keyword-check-log.txt
type %TEMP%\oms_keyword_result.txt >> C:\git\OMS\scripts\keyword-check-log.txt
echo. >> C:\git\OMS\scripts\keyword-check-log.txt

echo [%date% %time%] 완료
