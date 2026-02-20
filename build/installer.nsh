!include "LogicLib.nsh"

!macro customUnInit
  ; ====================================================================
  ; 卸载前密码验证
  ;   1. 弹出 HTA 密码输入框（中文用 HTML 实体，避免 ANSI/UTF 编码乱码）
  ;   2. JS 用 FSO.GetSpecialFolder(2) 获取 TEMP 路径（避免反斜杠被 JS 转义）
  ;   3. 读取密码后调用应用 CLI 校验
  ; ====================================================================

  ; "应用和功能" 有时以静默参数启动卸载器，强制切回交互模式
  IfSilent 0 +2
    SetSilent normal

  ; 检查主程序是否存在
  IfFileExists "$INSTDIR\Lock It.exe" +3 0
    MessageBox MB_ICONSTOP|MB_OK "未找到主程序文件，无法完成密码验证。请先重新安装后再卸载。"
    Abort

  StrCpy $0 0                                        ; 重试计数
  StrCpy $1 "$TEMP\lockit-uninstall-auth.hta"        ; HTA 文件
  StrCpy $2 "$TEMP\lockit-uninstall-auth.txt"        ; 密码输出文件

un_auth_retry:
  IntOp $0 $0 + 1
  Delete "$2"

  ; ---- 写入 HTA 文件 ----
  FileOpen $3 "$1" w
  IfErrors 0 +3
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "无法创建验证窗口文件，是否重试？" IDRETRY un_auth_retry
    Abort

  FileWrite $3 "<html><head>$\r$\n"
  FileWrite $3 "<meta http-equiv=$\"x-ua-compatible$\" content=$\"ie=9$\" />$\r$\n"
  FileWrite $3 "<title>Lock It</title>$\r$\n"
  FileWrite $3 "<hta:application id=$\"a$\" border=$\"dialog$\" showintaskbar=$\"yes$\" singleinstance=$\"yes$\" sysmenu=$\"yes$\" maximizebutton=$\"no$\" minimizebutton=$\"no$\" scroll=$\"no$\" />$\r$\n"
  FileWrite $3 "<style>body{font-family:Segoe UI,sans-serif;margin:0;padding:20px;background:#f3f3f3;overflow:hidden}"
  FileWrite $3 "h2{font-size:15px;font-weight:600;margin:0 0 8px}"
  FileWrite $3 "p{font-size:12px;color:#555;margin:0 0 14px;line-height:1.6}"
  FileWrite $3 "input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #ccc;font-size:14px;outline:0}"
  FileWrite $3 "input:focus{border-color:#005fb8}"
  FileWrite $3 ".b{margin-top:16px;text-align:right}"
  FileWrite $3 "button{padding:6px 20px;margin-left:8px;font-size:13px;cursor:pointer;border:1px solid #ccc;background:#fff}"
  FileWrite $3 "button:hover{background:#eee}"
  FileWrite $3 ".ok{background:#005fb8;color:#fff;border-color:#005fb8}"
  FileWrite $3 ".ok:hover{background:#004c99}</style>$\r$\n"
  FileWrite $3 "<script>$\r$\n"
  ; JS 用 FSO.GetSpecialFolder(2) 获取 %TEMP% 路径，不嵌入 NSIS 变量（避免反斜杠被当转义符）
  FileWrite $3 "var ok=0,fso=new ActiveXObject('Scripting.FileSystemObject');$\r$\n"
  FileWrite $3 "var outFile=fso.GetSpecialFolder(2)+'\\lockit-uninstall-auth.txt';$\r$\n"
  FileWrite $3 "function wf(t){try{var f=fso.CreateTextFile(outFile,true,false);f.Write(t);f.Close()}catch(e){}}$\r$\n"
  FileWrite $3 "function doOK(){var v=document.getElementById('p').value||'';v=v.replace(/^\s+|\s+$$/g,'');if(!v){doCancel();return}ok=1;wf(v);window.close()}$\r$\n"
  FileWrite $3 "function doCancel(){ok=1;try{wf('')}catch(e){}window.close()}$\r$\n"
  FileWrite $3 "window.onbeforeunload=function(){if(!ok)try{wf('')}catch(e){}};$\r$\n"
  FileWrite $3 "window.onload=function(){window.resizeTo(420,240);window.moveTo((screen.width-420)/2,(screen.height-240)/2);var e=document.getElementById('p');e.focus();e.onkeydown=function(ev){ev=ev||window.event;if(ev.keyCode==13){doOK();return false}if(ev.keyCode==27){doCancel();return false}}};$\r$\n"
  FileWrite $3 "</script></head><body>$\r$\n"
  ; 中文全部用 HTML 数字实体：卸载前请验证密码
  FileWrite $3 "<h2>&#21368;&#36733;&#21069;&#35831;&#39564;&#35777;&#23494;&#30721;</h2>$\r$\n"
  ; 请输入当前解锁密码（固定密码或 TOTP）以继续卸载。
  FileWrite $3 "<p>&#35831;&#36755;&#20837;&#24403;&#21069;&#35299;&#38145;&#23494;&#30721;&#65288;&#22266;&#23450;&#23494;&#30721;&#25110; TOTP&#65289;&#20197;&#32487;&#32493;&#21368;&#36733;&#12290;</p>$\r$\n"
  ; placeholder: 输入固定密码或 TOTP
  FileWrite $3 "<input id=$\"p$\" type=$\"password$\" placeholder=$\"&#36755;&#20837;&#22266;&#23450;&#23494;&#30721;&#25110; TOTP$\" />$\r$\n"
  ; 取消 / 确定
  FileWrite $3 "<div class=$\"b$\"><button onclick=$\"doCancel()$\">&#21462;&#28040;</button> <button class=$\"ok$\" onclick=$\"doOK()$\">&#30830;&#23450;</button></div>$\r$\n"
  FileWrite $3 "</body></html>$\r$\n"
  FileClose $3

  ; ---- 启动 HTA（ExecWait 阻塞直到用户关闭窗口） ----
  ExecWait '"$SYSDIR\mshta.exe" "$1"'

  ; 清理 HTA 文件
  Delete "$1"

  ; ---- 检查输出文件是否存在 ----
  IfFileExists "$2" +3 0
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "未能打开密码输入窗口（可能被系统策略拦截），是否重试？" IDRETRY un_auth_retry
    Abort

  ; ---- 读取密码 ----
  StrCpy $4 ""
  FileOpen $3 "$2" r
  IfErrors 0 +2
    StrCpy $4 ""
  FileRead $3 $4
  FileClose $3
  Delete "$2"

  ; 去掉可能的行尾换行
  StrCpy $5 $4 1 -1
  StrCmp $5 "$\n" 0 +2
    StrCpy $4 $4 -1
  StrCpy $5 $4 1 -1
  StrCmp $5 "$\r" 0 +2
    StrCpy $4 $4 -1

  ; 空密码 = 用户取消
  StrCmp $4 "" un_auth_cancel 0

  ; ---- 调用应用 CLI 校验密码 ----
  nsExec::ExecToStack '"$INSTDIR\Lock It.exe" "--verify-password-for-uninstall=$4"'
  Pop $3   ; exit code
  Pop $4   ; stdout (unused)

  ${If} $3 == "0"
    Goto un_auth_ok
  ${ElseIf} $3 == "timeout"
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "验证超时，是否重试？" IDRETRY un_auth_retry
    Abort
  ${ElseIf} $3 == "error"
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "验证程序启动失败，是否重试？" IDRETRY un_auth_retry
    Abort
  ${Else}
    ${If} $0 < 3
      MessageBox MB_RETRYCANCEL|MB_ICONSTOP "密码错误，是否重试？" IDRETRY un_auth_retry
      Abort
    ${Else}
      MessageBox MB_ICONSTOP|MB_OK "连续验证失败，已取消卸载。"
      Abort
    ${EndIf}
  ${EndIf}

un_auth_cancel:
  MessageBox MB_ICONEXCLAMATION|MB_OK "未输入密码，已取消卸载。"
  Abort

un_auth_ok:
!macroend
