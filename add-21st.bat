@echo off
claude mcp add --scope user --transport http 21st https://21st.dev/api/mcp --header "x-api-key: 21st_sk_67c85f343f16415d48a4d4dd325448760d935d2248af3dc5906f590e5540751e"
claude mcp list
pause
del "%~f0"
