Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
localPythonw = baseDir & "\venv\Scripts\pythonw.exe"
launcher = baseDir & "\Track Concursos.pyw"

If fso.FileExists(localPythonw) Then
  shell.Run """" & localPythonw & """ """ & launcher & """", 0, False
Else
  shell.Run "pythonw """ & launcher & """", 0, False
End If
